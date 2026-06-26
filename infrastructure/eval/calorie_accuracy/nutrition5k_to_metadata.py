#!/usr/bin/env python3
"""
Convert Nutrition5k dish-metadata CSVs into the simple
`dish_id,total_calories,image` format expected by calorie_accuracy_eval.py.

WHY THIS EXISTS
---------------
Nutrition5k (Google Research) ships ground truth as variable-length rows:

    dish_id, total_calories, total_mass, total_fat, total_carb, total_protein,
    ingr_1_id, ingr_1_name, ingr_1_grams, ingr_1_calories, ingr_1_fat, ...,
    ingr_2_id, ingr_2_name, ...

i.e. a fixed dish-level summary block followed by a repeating per-ingredient
block, so the number of columns differs row to row. csv.DictReader is therefore
the wrong tool. We parse positionally with csv.reader and read the documented
summary field `total_calories`, which is the **first numeric field after the
dish_id** (0-based column index 1).

ALWAYS confirm the column order against the Nutrition5k README before trusting
the numbers, and override with --calories-col if your copy differs.
Reference: github.com/google-research/google-research -> Nutrition5k
Dataset   : gs://nutrition5k_dataset/nutrition5k_dataset/

Overhead RGB image per dish (the natural single-view input for a photo->calorie
model) lives at:
    imagery/realsense_overhead/{dish_id}/rgb.png

USAGE
-----
    python nutrition5k_to_metadata.py \
        --metadata-csv nutrition5k_dataset/metadata/dish_metadata_cafe1.csv \
                       nutrition5k_dataset/metadata/dish_metadata_cafe2.csv \
        --imagery-dir  nutrition5k_dataset/imagery/realsense_overhead \
        --out-csv      metadata.csv \
        --require-image

Then run the harness:
    python calorie_accuracy_eval.py --metadata metadata.csv --images-dir . ...
(the `image` column holds absolute paths, so --images-dir is only a fallback.)
"""

from __future__ import annotations

import argparse
import csv
import os
import shutil
import sys


def log(msg: str) -> None:
    sys.stderr.write(msg.rstrip("\n") + "\n")


def is_number(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def parse_metadata_csv(path, calories_col):
    """
    Yield (dish_id, total_calories_str) from one Nutrition5k metadata CSV.

    Robust to:
      - variable-length rows (per-ingredient columns)
      - an accidental header row (skipped if the calories cell is non-numeric)
      - blank / short / commented rows
    """
    with open(path, "r", encoding="utf-8", newline="") as fh:
        reader = csv.reader(fh)
        for lineno, row in enumerate(reader, start=1):
            if not row:
                continue
            dish_id = (row[0] or "").strip()
            if not dish_id or dish_id.startswith("#"):
                continue
            if len(row) <= calories_col:
                log("  skip line %d (%s): only %d columns, need col %d"
                    % (lineno, dish_id, len(row), calories_col))
                continue
            cal = (row[calories_col] or "").strip()
            if not is_number(cal):
                # Most likely a header row or a malformed line.
                log("  skip line %d (%s): calories cell %r is not numeric"
                    % (lineno, dish_id, cal))
                continue
            yield dish_id, cal


def resolve_overhead_image(imagery_dir, dish_id, image_filename):
    """Return the path to {imagery_dir}/{dish_id}/{image_filename} if it exists."""
    if not imagery_dir:
        return None
    candidate = os.path.join(imagery_dir, dish_id, image_filename)
    return candidate if os.path.isfile(candidate) else None


def main(argv=None):
    p = argparse.ArgumentParser(
        description="Convert Nutrition5k metadata CSV(s) -> dish_id,total_calories,image.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--metadata-csv", nargs="+", required=True,
                   help="One or more Nutrition5k dish_metadata_cafe*.csv files.")
    p.add_argument("--imagery-dir", default=None,
                   help="Base dir holding {dish_id}/rgb.png "
                        "(e.g. .../imagery/realsense_overhead).")
    p.add_argument("--image-filename", default="rgb.png",
                   help="Per-dish image filename under the imagery dir.")
    p.add_argument("--calories-col", type=int, default=1,
                   help="0-based column index of total_calories (confirm via README).")
    p.add_argument("--out-csv", default="metadata.csv",
                   help="Output CSV path (dish_id,total_calories,image).")
    p.add_argument("--copy-images-to", default=None,
                   help="If set, copy each dish image here as {dish_id}.png and "
                        "write that filename (not the source path) in the image column.")
    p.add_argument("--require-image", action="store_true",
                   help="Skip dishes whose image file is missing.")
    p.add_argument("--limit", type=int, default=None,
                   help="Convert at most N dishes (after de-duplication).")
    args = p.parse_args(argv)

    if args.copy_images_to:
        os.makedirs(args.copy_images_to, exist_ok=True)

    seen = set()
    written = 0
    no_image = 0
    out_rows = []

    for csv_path in args.metadata_csv:
        if not os.path.isfile(csv_path):
            log("WARNING: metadata CSV not found, skipping: %s" % csv_path)
            continue
        log("reading %s" % csv_path)
        for dish_id, cal in parse_metadata_csv(csv_path, args.calories_col):
            if dish_id in seen:
                continue
            seen.add(dish_id)

            src_image = resolve_overhead_image(args.imagery_dir, dish_id, args.image_filename)
            image_value = ""

            if src_image is None:
                no_image += 1
                if args.require_image:
                    log("  skip %s: image not found (%s)"
                        % (dish_id, os.path.join(args.imagery_dir or "<none>",
                                                 dish_id, args.image_filename)))
                    continue
            else:
                if args.copy_images_to:
                    dest = os.path.join(args.copy_images_to, dish_id + ".png")
                    try:
                        shutil.copyfile(src_image, dest)
                        image_value = dish_id + ".png"  # filename relative to copy dir
                    except OSError as exc:
                        log("  WARNING: copy failed for %s: %s" % (dish_id, exc))
                        image_value = os.path.abspath(src_image)
                else:
                    image_value = os.path.abspath(src_image)

            out_rows.append((dish_id, cal, image_value))
            if args.limit is not None and len(out_rows) >= args.limit:
                break
        if args.limit is not None and len(out_rows) >= args.limit:
            break

    with open(args.out_csv, "w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["dish_id", "total_calories", "image"])
        for dish_id, cal, image_value in out_rows:
            writer.writerow([dish_id, cal, image_value])
            written += 1

    log("-" * 60)
    log("wrote %d dishes -> %s" % (written, args.out_csv))
    log("dishes without a resolved image: %d%s"
        % (no_image, " (kept; harness will search --images-dir)"
           if not args.require_image else " (skipped via --require-image)"))
    if args.copy_images_to:
        log("images copied to: %s" % args.copy_images_to)
    return 0


if __name__ == "__main__":
    sys.exit(main())
