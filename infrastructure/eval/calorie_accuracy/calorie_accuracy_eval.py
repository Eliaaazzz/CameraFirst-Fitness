#!/usr/bin/env python3
"""
Calorie-accuracy evaluation harness for the Aura Fitness (Metriful) backend.

It feeds food photos with KNOWN ground-truth total calories to the backend's
photo -> calorie endpoint and reports calorie error metrics:

    MAPE, median absolute % error, +/-15% and +/-20% hit-rate, RMSE (kcal),
    mean signed error (bias), n_evaluated, n_skipped.

ENDPOINT CONTRACT (verified against the backend source on 2026-06-26):
    POST {BACKEND_URL}/api/v1/nutrition/analyze
        - multipart/form-data
        - part name `image`  (a JPEG/PNG)            -> @RequestParam("image")
        - optional form field `provider` (e.g. gemini)
        - header `X-API-Key: {API_KEY}`              (no JWT needed; stateless)
    Response JSON: total calories at  totalNutrition.calories
        (NutritionController.FoodRecognitionResponse -> NutritionInfo.calories)

    The endpoint may return:
        200 -> success
        429 -> app-level quota exceeded (QuotaExceptionHandler)
        503 -> Gemini quota exhausted / AI unavailable (AI_SERVICE_UNAVAILABLE)
        408/502/504 -> transient upstream issues
    429/503/502/504/408 are retried with exponential backoff; if still failing
    the item is SKIPPED (never counted as 0 calories).

Dependencies: Python 3.7+, standard library only. `requests` is used if present,
otherwise it falls back to urllib (so the harness has NO hard third-party deps).

Run a dry-run first (no backend, no dataset needed):

    python calorie_accuracy_eval.py --dry-run \
        --metadata sample_metadata.csv --out ./calorie-eval-out

Then a real run (needs a reachable backend + a Gemini key with quota):

    BACKEND_URL=https://...run.app API_KEY=... \
    python calorie_accuracy_eval.py \
        --metadata metadata.csv --images-dir ./images --limit 100 --out ./out
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import statistics
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

# `requests` is optional. If it is missing we transparently fall back to urllib
# so the harness can run on a bare Python install.
try:
    import requests  # type: ignore
    _HAVE_REQUESTS = True
except Exception:  # pragma: no cover - exercised only when requests is absent
    requests = None  # type: ignore
    _HAVE_REQUESTS = False

import urllib.error
import urllib.request

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Field path (dotted) where the backend returns the total calories for the plate.
# Verified against NutritionController.FoodRecognitionResponse.totalNutrition
# and NutritionInfo.calories.
TOTAL_CALORIES_PATH = ("totalNutrition", "calories")

# HTTP statuses worth retrying. 429 = app quota; 503 = Gemini quota exhausted /
# AI unavailable; 408/502/504 = transient upstream issues.
RETRYABLE_STATUS = {408, 429, 502, 503, 504}

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png")
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # backend rejects >10MB; skip client-side.

# Thread-safe stderr logging (skip reasons, progress).
_log_lock = threading.Lock()


def log(msg: str) -> None:
    """One-line, thread-safe progress/skip logging to stderr."""
    with _log_lock:
        sys.stderr.write(msg.rstrip("\n") + "\n")
        sys.stderr.flush()


# ---------------------------------------------------------------------------
# Metadata loading
# ---------------------------------------------------------------------------

def load_metadata(path: str):
    """
    Load the evaluation metadata CSV.

    Required columns: dish_id, total_calories
    Optional column : image  (filename or absolute path of the photo)

    Returns a list of dict rows: {dish_id, total_calories(float), image(str|None)}.
    Rows with a missing/invalid dish_id or non-positive calories are dropped with
    a one-line reason (we can't compute a % error against zero/negative truth).
    """
    rows = []
    with open(path, "r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None:
            raise SystemExit("metadata CSV is empty: %s" % path)
        # Normalise header names (strip whitespace / BOM artefacts).
        field_map = {(name or "").strip().lower(): name for name in reader.fieldnames}
        if "dish_id" not in field_map or "total_calories" not in field_map:
            raise SystemExit(
                "metadata CSV must have columns 'dish_id' and 'total_calories'; got %r"
                % (reader.fieldnames,)
            )
        dish_key = field_map["dish_id"]
        cal_key = field_map["total_calories"]
        img_key = field_map.get("image")

        for lineno, raw in enumerate(reader, start=2):
            dish_id = (raw.get(dish_key) or "").strip()
            cal_raw = (raw.get(cal_key) or "").strip()
            image = (raw.get(img_key) or "").strip() if img_key else ""
            if not dish_id:
                log("skip line %d: missing dish_id" % lineno)
                continue
            try:
                truth = float(cal_raw)
            except (TypeError, ValueError):
                log("skip %s: total_calories not a number (%r)" % (dish_id, cal_raw))
                continue
            if not math.isfinite(truth) or truth <= 0:
                log("skip %s: total_calories must be > 0 (got %s)" % (dish_id, truth))
                continue
            rows.append({"dish_id": dish_id, "total_calories": truth, "image": image or None})
    return rows


def resolve_image_path(row, images_dir):
    """
    Resolve the photo path for a dish.

    Priority:
      1) `image` column holding an existing absolute/relative path
      2) `image` column treated as a filename inside --images-dir
      3) {images_dir}/{dish_id}.{jpg,jpeg,png}

    Returns a path string or None if nothing is found.
    """
    image = row.get("image")
    dish_id = row["dish_id"]

    if image:
        # An explicit path that already exists (e.g. produced by the converter).
        if os.path.isfile(image):
            return image
        if images_dir:
            candidate = os.path.join(images_dir, image)
            if os.path.isfile(candidate):
                return candidate
        # `image` was given but unresolved -> fall through to extension search.

    if images_dir:
        for ext in IMAGE_EXTENSIONS:
            candidate = os.path.join(images_dir, dish_id + ext)
            if os.path.isfile(candidate):
                return candidate
    return None


# ---------------------------------------------------------------------------
# Dry-run fake analyzer (deterministic, NOT real)
# ---------------------------------------------------------------------------

def deterministic_factor(dish_id: str) -> float:
    """
    Map a dish_id -> a stable multiplier in [0.7, 1.3].

    Derived from a SHA-256 hash of the dish_id (NOT from the wall clock or a
    PRNG), so the dry-run produces identical numbers on every machine/run. This
    exists purely to exercise the metric math + report generation end-to-end.
    """
    digest = hashlib.sha256(dish_id.encode("utf-8")).hexdigest()
    n = int(digest[:8], 16)          # first 32 bits
    frac = n / 0xFFFFFFFF            # in [0.0, 1.0]
    return 0.7 + 0.6 * frac          # in [0.7, 1.3]


def fake_estimate(dish_id: str, truth: float) -> float:
    """Synthetic 'estimate' = truth * deterministic perturbation. NOT REAL."""
    return truth * deterministic_factor(dish_id)


# ---------------------------------------------------------------------------
# HTTP: multipart POST with requests-or-urllib backend
# ---------------------------------------------------------------------------

def _encode_multipart(fields, file_name, file_bytes, file_field="image",
                      content_type="image/jpeg"):
    """Hand-encode a multipart/form-data body (used by the urllib fallback)."""
    boundary = uuid.uuid4().hex
    crlf = b"\r\n"
    body = bytearray()
    for name, value in fields.items():
        body += b"--" + boundary.encode() + crlf
        body += ('Content-Disposition: form-data; name="%s"' % name).encode() + crlf + crlf
        body += str(value).encode() + crlf
    body += b"--" + boundary.encode() + crlf
    body += (
        'Content-Disposition: form-data; name="%s"; filename="%s"'
        % (file_field, file_name)
    ).encode() + crlf
    body += ("Content-Type: %s" % content_type).encode() + crlf + crlf
    body += file_bytes + crlf
    body += b"--" + boundary.encode() + b"--" + crlf
    return "multipart/form-data; boundary=" + boundary, bytes(body)


def post_analyze(backend_url, api_key, image_bytes, file_name, provider, timeout):
    """
    POST one image to the analyze endpoint.

    Returns (status_code:int, headers:dict, body_text:str). Network/transport
    failures are surfaced as status_code = 0 with the error text in body.
    """
    url = backend_url.rstrip("/") + "/api/v1/nutrition/analyze"
    fields = {}
    if provider:
        fields["provider"] = provider

    if _HAVE_REQUESTS:
        try:
            files = {"image": (file_name, image_bytes, "image/jpeg")}
            resp = requests.post(
                url, headers={"X-API-Key": api_key}, files=files, data=fields,
                timeout=timeout,
            )
            return resp.status_code, dict(resp.headers), resp.text
        except requests.RequestException as exc:  # type: ignore[attr-defined]
            return 0, {}, "request error: %s" % exc

    # urllib fallback (no third-party dependency).
    content_type, body = _encode_multipart(fields, file_name, image_bytes)
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", content_type)
    req.add_header("X-API-Key", api_key)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.status, dict(resp.headers), resp.read().decode(charset, "replace")
    except urllib.error.HTTPError as exc:
        try:
            text = exc.read().decode("utf-8", "replace")
        except Exception:
            text = str(exc)
        return exc.code, dict(exc.headers or {}), text
    except urllib.error.URLError as exc:
        return 0, {}, "url error: %s" % exc
    except Exception as exc:  # pragma: no cover - defensive
        return 0, {}, "transport error: %s" % exc


def extract_total_calories(payload):
    """
    Pull the total calories out of a parsed analyze response.

    Primary path: totalNutrition.calories (the verified contract).
    Fallback    : sum items[].nutrition.calories (the backend derives the total
                  from items, so this is a faithful reconstruction, not a guess).

    Returns (value:float|None, source:str).
    """
    node = payload
    ok = True
    for key in TOTAL_CALORIES_PATH:
        if isinstance(node, dict) and key in node:
            node = node[key]
        else:
            ok = False
            break
    if ok and node is not None:
        try:
            return float(node), "totalNutrition.calories"
        except (TypeError, ValueError):
            pass

    items = payload.get("items") if isinstance(payload, dict) else None
    if isinstance(items, list) and items:
        total = 0.0
        found = False
        for it in items:
            if isinstance(it, dict):
                nutrition = it.get("nutrition")
                if isinstance(nutrition, dict) and nutrition.get("calories") is not None:
                    try:
                        total += float(nutrition["calories"])
                        found = True
                    except (TypeError, ValueError):
                        pass
        if found:
            return total, "sum(items[].nutrition.calories)"
    return None, "not-found"


# ---------------------------------------------------------------------------
# Per-dish evaluation
# ---------------------------------------------------------------------------

def evaluate_real(row, cfg):
    """Evaluate a single dish against the live backend. Returns a result dict."""
    dish_id = row["dish_id"]
    truth = row["total_calories"]

    image_path = resolve_image_path(row, cfg["images_dir"])
    if not image_path:
        return _skip(dish_id, truth, "image not found (looked for %s.* in %s)"
                     % (dish_id, cfg["images_dir"] or "<no --images-dir>"))
    try:
        size = os.path.getsize(image_path)
        if size == 0:
            return _skip(dish_id, truth, "image is empty: %s" % image_path)
        if size > MAX_IMAGE_BYTES:
            return _skip(dish_id, truth, "image >10MB (backend rejects): %s" % image_path)
        with open(image_path, "rb") as fh:
            image_bytes = fh.read()
    except OSError as exc:
        return _skip(dish_id, truth, "cannot read image %s: %s" % (image_path, exc))

    file_name = os.path.basename(image_path)
    backoff = cfg["backoff_base"]
    last_reason = "unknown"

    for attempt in range(cfg["max_retries"] + 1):
        status, headers, body = post_analyze(
            cfg["backend_url"], cfg["api_key"], image_bytes, file_name,
            cfg["provider"], cfg["timeout"],
        )

        if status == 200:
            try:
                payload = json.loads(body)
            except (ValueError, TypeError) as exc:
                return _skip(dish_id, truth, "malformed JSON response: %s" % exc)
            est, source = extract_total_calories(payload)
            if est is None:
                return _skip(dish_id, truth, "no calories in response (%s)" % source)
            if est <= 0:
                return _skip(dish_id, truth, "non-positive calories in response (%s)" % est)
            return _evaluated(dish_id, truth, est, source)

        if status in RETRYABLE_STATUS and attempt < cfg["max_retries"]:
            # Honour Retry-After if the server sent one, else exponential backoff.
            retry_after = _parse_retry_after(headers)
            sleep_s = retry_after if retry_after is not None else backoff
            sleep_s = min(sleep_s, cfg["backoff_cap"])
            log("retry %s: http %d, sleeping %.1fs (attempt %d/%d)"
                % (dish_id, status, sleep_s, attempt + 1, cfg["max_retries"]))
            time.sleep(sleep_s)
            backoff = min(backoff * 2, cfg["backoff_cap"])  # exponential, capped
            last_reason = "http %d after %d retries" % (status, cfg["max_retries"])
            continue

        # Non-retryable, or out of retries.
        snippet = (body or "").strip().replace("\n", " ")[:160]
        return _skip(dish_id, truth, "http %d: %s" % (status, snippet) if status
                     else "transport failure: %s" % snippet)

    return _skip(dish_id, truth, last_reason)


def evaluate_dry(row):
    """Evaluate a single dish with the deterministic fake analyzer (NOT REAL)."""
    dish_id = row["dish_id"]
    truth = row["total_calories"]
    est = fake_estimate(dish_id, truth)
    return _evaluated(dish_id, truth, est, "dry-run(fake)")


def _parse_retry_after(headers):
    """Parse a Retry-After header (seconds form only); return float or None."""
    if not headers:
        return None
    for key, value in headers.items():
        if key.lower() == "retry-after":
            try:
                return max(0.0, float(value))
            except (TypeError, ValueError):
                return None
    return None


def _evaluated(dish_id, truth, est, source):
    abs_pct_error = abs(est - truth) / truth
    signed_error = est - truth
    return {
        "dish_id": dish_id,
        "status": "evaluated",
        "truth_calories": round(truth, 2),
        "estimated_calories": round(est, 2),
        "abs_pct_error": round(abs_pct_error, 4),
        "signed_error_kcal": round(signed_error, 2),
        "signed_pct_error": round(signed_error / truth, 4),
        "source": source,
        "reason": None,
    }


def _skip(dish_id, truth, reason):
    log("skip %s: %s" % (dish_id, reason))
    return {
        "dish_id": dish_id,
        "status": "skipped",
        "truth_calories": round(truth, 2) if truth else None,
        "estimated_calories": None,
        "abs_pct_error": None,
        "signed_error_kcal": None,
        "signed_pct_error": None,
        "source": None,
        "reason": reason,
    }


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def aggregate(results):
    """Compute summary metrics from per-dish result rows."""
    evaluated = [r for r in results if r["status"] == "evaluated"]
    skipped = [r for r in results if r["status"] == "skipped"]
    n = len(evaluated)

    summary = {
        "n_total": len(results),
        "n_evaluated": n,
        "n_skipped": len(skipped),
        "mape_pct": None,
        "median_ape_pct": None,
        "hit_rate_15_pct": None,
        "hit_rate_20_pct": None,
        "rmse_kcal": None,
        "mean_signed_error_kcal": None,
        "mean_signed_pct_error_pct": None,
        "bias_direction": None,
    }
    if n == 0:
        return summary

    apes = [r["abs_pct_error"] for r in evaluated]
    signed_kcal = [r["signed_error_kcal"] for r in evaluated]
    signed_pct = [r["signed_pct_error"] for r in evaluated]

    mape = sum(apes) / n
    median_ape = statistics.median(apes)
    hit15 = sum(1 for a in apes if a <= 0.15) / n
    hit20 = sum(1 for a in apes if a <= 0.20) / n
    rmse = math.sqrt(sum(e * e for e in signed_kcal) / n)
    mean_signed = sum(signed_kcal) / n
    mean_signed_pct = sum(signed_pct) / n

    summary.update({
        "mape_pct": round(mape * 100, 2),
        "median_ape_pct": round(median_ape * 100, 2),
        "hit_rate_15_pct": round(hit15 * 100, 2),
        "hit_rate_20_pct": round(hit20 * 100, 2),
        "rmse_kcal": round(rmse, 2),
        "mean_signed_error_kcal": round(mean_signed, 2),
        "mean_signed_pct_error_pct": round(mean_signed_pct * 100, 2),
        "bias_direction": (
            "over-estimates" if mean_signed > 0
            else "under-estimates" if mean_signed < 0
            else "unbiased"
        ),
    })
    return summary


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_outputs(out_dir, meta, summary, results):
    os.makedirs(out_dir, exist_ok=True)
    results_path = os.path.join(out_dir, "results.json")
    summary_path = os.path.join(out_dir, "summary.md")

    with open(results_path, "w", encoding="utf-8") as fh:
        json.dump(
            {"meta": meta, "summary": summary, "rows": results},
            fh, indent=2, ensure_ascii=False,
        )
        fh.write("\n")

    with open(summary_path, "w", encoding="utf-8") as fh:
        fh.write(render_summary_md(meta, summary))

    return results_path, summary_path


def _fmt(value, suffix=""):
    return "n/a" if value is None else ("%s%s" % (value, suffix))


def render_summary_md(meta, summary):
    lines = []
    lines.append("# Calorie Accuracy Evaluation - Summary")
    lines.append("")
    if meta.get("mode") == "dry-run":
        lines.append("> **DRY RUN - SYNTHETIC DATA. These numbers are NOT real model accuracy.**")
        lines.append("> Estimates come from a deterministic fake analyzer "
                     "(truth x SHA256-seeded factor in [0.7, 1.3]).")
        lines.append("> Use only to validate the pipeline + metric math.")
        lines.append("")
    lines.append("- Mode: `%s`" % meta.get("mode"))
    lines.append("- Generated: %s" % meta.get("generated_at"))
    if meta.get("mode") != "dry-run":
        lines.append("- Backend: `%s`" % meta.get("backend_url"))
        lines.append("- Provider: `%s`" % meta.get("provider"))
        lines.append("- HTTP client: `%s`" % meta.get("http_client"))
    lines.append("- Dishes evaluated: %d" % summary["n_evaluated"])
    lines.append("- Dishes skipped: %d" % summary["n_skipped"])
    lines.append("")
    lines.append("| Metric | Value |")
    lines.append("|---|---|")
    lines.append("| MAPE (mean abs %% error) | %s |" % _fmt(summary["mape_pct"], "%"))
    lines.append("| Median abs %% error | %s |" % _fmt(summary["median_ape_pct"], "%"))
    lines.append("| Hit-rate within +/-15%% | %s |" % _fmt(summary["hit_rate_15_pct"], "%"))
    lines.append("| Hit-rate within +/-20%% | %s |" % _fmt(summary["hit_rate_20_pct"], "%"))
    lines.append("| RMSE | %s |" % _fmt(summary["rmse_kcal"], " kcal"))
    bias = summary["mean_signed_error_kcal"]
    bias_str = _fmt(bias, " kcal")
    if bias is not None:
        bias_str += " (%s)" % summary["bias_direction"]
    lines.append("| Mean signed error (bias) | %s |" % bias_str)
    lines.append("| Mean signed %% error | %s |" % _fmt(summary["mean_signed_pct_error_pct"], "%"))
    lines.append("| n evaluated | %d |" % summary["n_evaluated"])
    lines.append("| n skipped | %d |" % summary["n_skipped"])
    lines.append("")
    lines.append("**Headline metric:** the +/-15% hit-rate. Published photo->calorie systems "
                 "commonly sit at 20%+ MAPE; report the measured number truthfully.")
    lines.append("")
    return "\n".join(lines)


def print_summary(meta, summary, results_path, summary_path):
    out = sys.stdout
    bar = "=" * 60
    out.write(bar + "\n")
    out.write("CALORIE ACCURACY EVALUATION\n")
    if meta.get("mode") == "dry-run":
        out.write("*** DRY RUN - SYNTHETIC, NOT REAL ACCURACY ***\n")
        out.write("Estimates = truth x deterministic SHA256-seeded factor [0.7,1.3]\n")
    out.write(bar + "\n")
    out.write("mode               : %s\n" % meta.get("mode"))
    if meta.get("mode") != "dry-run":
        out.write("backend            : %s\n" % meta.get("backend_url"))
        out.write("provider           : %s\n" % meta.get("provider"))
    out.write("dishes evaluated   : %d\n" % summary["n_evaluated"])
    out.write("dishes skipped     : %d\n" % summary["n_skipped"])
    if summary["n_evaluated"] > 0:
        out.write("-" * 60 + "\n")
        out.write("MAPE (mean abs %%)  : %s%%\n" % summary["mape_pct"])
        out.write("median abs %% error : %s%%\n" % summary["median_ape_pct"])
        out.write("hit-rate +/-15%%    : %s%%   <-- HEADLINE\n" % summary["hit_rate_15_pct"])
        out.write("hit-rate +/-20%%    : %s%%\n" % summary["hit_rate_20_pct"])
        out.write("RMSE               : %s kcal\n" % summary["rmse_kcal"])
        out.write("mean signed error  : %s kcal (%s)\n"
                  % (summary["mean_signed_error_kcal"], summary["bias_direction"]))
        out.write("mean signed %% error: %s%%\n" % summary["mean_signed_pct_error_pct"])
    else:
        out.write("(no dishes evaluated - check images / backend / metadata)\n")
    out.write(bar + "\n")
    out.write("results.json -> %s\n" % results_path)
    out.write("summary.md   -> %s\n" % summary_path)
    out.flush()


# ---------------------------------------------------------------------------
# CLI / main
# ---------------------------------------------------------------------------

def parse_args(argv=None):
    p = argparse.ArgumentParser(
        description="Calorie-accuracy eval harness for the Aura Fitness analyze endpoint.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--metadata", required=True,
                   help="CSV with columns dish_id,total_calories[,image].")
    p.add_argument("--images-dir", default=None,
                   help="Directory of photos (ignored in --dry-run).")
    p.add_argument("--backend-url", default=os.environ.get("BACKEND_URL"),
                   help="Backend base URL (env BACKEND_URL fallback).")
    p.add_argument("--api-key", default=os.environ.get("API_KEY"),
                   help="X-API-Key value (env API_KEY fallback).")
    p.add_argument("--provider", default="gemini",
                   help="Optional provider form field sent to the backend.")
    p.add_argument("--limit", type=int, default=None,
                   help="Evaluate only the first N dishes.")
    p.add_argument("--concurrency", type=int, default=2,
                   help="Parallel in-flight requests (free tier is fragile).")
    p.add_argument("--timeout", type=float, default=60.0,
                   help="Per-request timeout in seconds.")
    p.add_argument("--max-retries", type=int, default=4,
                   help="Retries on 429/503/502/504/408 before skipping.")
    p.add_argument("--backoff-base", type=float, default=2.0,
                   help="Initial backoff seconds (doubles each retry).")
    p.add_argument("--backoff-cap", type=float, default=30.0,
                   help="Maximum backoff seconds per retry.")
    p.add_argument("--out", default="./calorie-eval-out",
                   help="Output directory for results.json + summary.md.")
    p.add_argument("--dry-run", action="store_true",
                   help="No backend calls; use the deterministic fake analyzer.")
    return p.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    rows = load_metadata(args.metadata)
    if args.limit is not None and args.limit >= 0:
        rows = rows[: args.limit]
    if not rows:
        raise SystemExit("no usable rows in metadata: %s" % args.metadata)

    generated_at = datetime.now(timezone.utc).isoformat()

    if args.dry_run:
        meta = {
            "mode": "dry-run",
            "generated_at": generated_at,
            "metadata_csv": os.path.abspath(args.metadata),
            "n_input_rows": len(rows),
            "warning": "SYNTHETIC fake-analyzer output; NOT real model accuracy.",
        }
        log("DRY RUN: using deterministic fake analyzer for %d dishes (NOT REAL)." % len(rows))
        results = [evaluate_dry(row) for row in rows]
    else:
        if not args.backend_url:
            raise SystemExit("--backend-url (or env BACKEND_URL) is required for a live run.")
        if not args.api_key:
            raise SystemExit("--api-key (or env API_KEY) is required for a live run.")
        if not args.images_dir:
            log("WARNING: no --images-dir; relying on absolute paths in the 'image' column.")

        cfg = {
            "backend_url": args.backend_url,
            "api_key": args.api_key,
            "images_dir": args.images_dir,
            "provider": args.provider,
            "timeout": args.timeout,
            "max_retries": args.max_retries,
            "backoff_base": args.backoff_base,
            "backoff_cap": args.backoff_cap,
        }
        meta = {
            "mode": "live",
            "generated_at": generated_at,
            "backend_url": args.backend_url,
            "provider": args.provider,
            "metadata_csv": os.path.abspath(args.metadata),
            "images_dir": os.path.abspath(args.images_dir) if args.images_dir else None,
            "http_client": "requests" if _HAVE_REQUESTS else "urllib",
            "concurrency": args.concurrency,
            "n_input_rows": len(rows),
        }
        log("LIVE RUN: %d dishes -> %s (concurrency=%d, client=%s)"
            % (len(rows), args.backend_url, args.concurrency, meta["http_client"]))

        results = [None] * len(rows)
        workers = max(1, args.concurrency)
        with ThreadPoolExecutor(max_workers=workers) as pool:
            future_to_idx = {
                pool.submit(evaluate_real, row, cfg): idx
                for idx, row in enumerate(rows)
            }
            done = 0
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    results[idx] = future.result()
                except Exception as exc:  # never let one bad item kill the run
                    results[idx] = _skip(rows[idx]["dish_id"], rows[idx]["total_calories"],
                                         "unhandled error: %s" % exc)
                done += 1
                if done % 10 == 0 or done == len(rows):
                    log("progress: %d/%d done" % (done, len(rows)))

    summary = aggregate(results)
    results_path, summary_path = write_outputs(args.out, meta, summary, results)
    print_summary(meta, summary, results_path, summary_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
