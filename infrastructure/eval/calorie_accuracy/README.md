# Calorie-Accuracy Evaluation Harness (photo -> calorie)

Measures how accurately the Aura Fitness backend turns a **food photo** into a
**total-calorie** estimate, against dishes with **known, physically-measured**
ground-truth calories. It reports the metrics that actually matter for a
camera-first nutrition app:

| Metric | What it tells you |
|---|---|
| **MAPE** | mean absolute % error across dishes |
| **Median abs % error** | typical error, robust to a few wild misses |
| **Hit-rate +/-15%** | **the headline** - share of dishes within 15% of truth |
| **Hit-rate +/-20%** | the looser, "good enough to coach on" bar |
| **RMSE (kcal)** | absolute calorie spread, penalizes big misses |
| **Mean signed error** | bias - does the model systematically over/under-estimate? |
| **n_evaluated / n_skipped** | coverage and how many calls failed/were rate-limited |

> This harness does **not** ship any accuracy numbers. You run it to produce
> them. The included `--dry-run` mode generates clearly-labeled **synthetic**
> output so you can validate the pipeline with no backend and no dataset.

---

## Endpoint contract (verified against the backend source)

Confirmed by reading the controller + DTOs (not assumed):

- `POST {BACKEND_URL}/api/v1/nutrition/analyze`
- `multipart/form-data`, image part name **`image`** (`@RequestParam("image")`
  in `NutritionController.analyzeFoodImage`)
- optional form field **`provider`** (e.g. `gemini`)
- auth header **`X-API-Key: {API_KEY}`** (`ApiKeyAuthFilter`) - **no JWT needed**;
  a valid API key alone authorizes this stateless analysis endpoint
- response JSON: total calories at **`totalNutrition.calories`**
  (`NutritionController.FoodRecognitionResponse.totalNutrition` ->
  `NutritionInfo.calories`, a `BigDecimal` serialized as `calories`)

Rate limiting / failure modes the harness handles:

- `429` - app-level quota exceeded (`QuotaExceptionHandler`)
- `503` - Gemini quota exhausted / AI unavailable
  (`AI_SERVICE_UNAVAILABLE`; this is what a depleted free-tier Gemini key returns)
- `408 / 502 / 504` - transient upstream issues

All of the above are retried with **exponential backoff** (honoring `Retry-After`
when present), capped; if still failing, the dish is **skipped** and recorded as
such - a skip is **never** counted as 0 calories.

Dev default API key (from `application.yml`): `fitness-secret-key-123`.

---

## Why not USDA FoodData Central?

USDA **FoodData Central (FDC)** is the wrong tool for this evaluation:

- It is a **per-100g composition database** (nutrient profiles for foods and
  branded products), **not** a set of plated meals.
- It has **no images** - you cannot feed it to a vision model.
- It has **no per-plate portion truth** - real plates are mixtures of multiple
  ingredients at unknown masses; FDC only tells you kcal/100g for an ingredient
  in isolation, not "this photographed plate = 612 kcal".

FDC is useful as a *lookup table* for building ground truth from weighed
ingredients (see the Chinese-dish section below), but it is **not an
image->calorie benchmark**.

## Why Nutrition5k is the right dataset

**Nutrition5k** (Google Research) is purpose-built for exactly this task:

- ~5,000 **real plated dishes** from Google cafeterias.
- **Physically weighed** total mass + **per-ingredient** mass and calories
  (scale + known ingredient nutrition), i.e. true per-plate calorie labels.
- **Multi-view RGB** capture, including a clean **overhead RGB** frame per dish -
  the natural single-image input for a photo->calorie model.

That combination - real photos **and** measured per-plate calories - is what FDC
lacks and what this harness needs.

### Obtaining Nutrition5k

Code / docs: GitHub `google-research/google-research`, path **`Nutrition5k`**
(read its README for the authoritative metadata column order and licensing).

Dataset: public GCS bucket **`gs://nutrition5k_dataset`**. You need the
`gsutil` CLI (part of the Google Cloud SDK).

```bash
# 1) Ground-truth metadata (small) - the calorie labels live here.
gsutil -m cp -r gs://nutrition5k_dataset/nutrition5k_dataset/metadata .

# 2) Overhead RGB images (large). Grab a subset first, or all of it.
#    Per-dish overhead frame: imagery/realsense_overhead/{dish_id}/rgb.png
gsutil -m cp -r \
  gs://nutrition5k_dataset/nutrition5k_dataset/imagery/realsense_overhead \
  ./nutrition5k_dataset/imagery/
```

Ground-truth total calories are in
`metadata/dish_metadata_cafe1.csv` and `dish_metadata_cafe2.csv`. Each row is:

```
dish_id, total_calories, total_mass, total_fat, total_carb, total_protein,
ingr_1_id, ingr_1_name, ingr_1_grams, ingr_1_calories, ..., ingr_2_id, ...
```

so **`total_calories` is the first numeric field after `dish_id`** (0-based
column index **1**). Rows are variable length (a repeating per-ingredient block
follows the summary fields). **Confirm this column order against the Nutrition5k
README** - if your copy differs, pass `--calories-col` to the converter.

### Convert Nutrition5k -> harness metadata

`nutrition5k_to_metadata.py` reads the variable-length CSVs positionally and
emits the simple `dish_id,total_calories,image` format this harness expects:

```bash
python nutrition5k_to_metadata.py \
  --metadata-csv nutrition5k_dataset/metadata/dish_metadata_cafe1.csv \
                 nutrition5k_dataset/metadata/dish_metadata_cafe2.csv \
  --imagery-dir  nutrition5k_dataset/imagery/realsense_overhead \
  --out-csv      metadata.csv \
  --require-image           # drop dishes whose rgb.png you didn't download
# optional: --calories-col 1   (override if the README says otherwise)
# optional: --copy-images-to ./images   (copies rgb.png -> {dish_id}.png)
# optional: --limit 200        (quick subset)
```

The `image` column is written as an **absolute path** to each dish's `rgb.png`
(or, with `--copy-images-to`, as `{dish_id}.png` inside your images dir).

---

## Running the harness

### Dependencies

Python 3.7+. Standard library only. If `requests` is installed it is used;
otherwise it falls back to `urllib` automatically (no hard dependency).

### 1) Dry-run first (no backend, no dataset)

Validates the metric math + report generation end-to-end using a deterministic
fake analyzer (`truth x SHA256(dish_id)-seeded factor in [0.7, 1.3]`). Output is
clearly labeled **NOT REAL**.

```bash
python calorie_accuracy_eval.py --dry-run \
  --metadata sample_metadata.csv \
  --out ./calorie-eval-out
```

You'll get a printed summary plus `calorie-eval-out/results.json` and
`calorie-eval-out/summary.md`. Because it's seeded by `dish_id`, the synthetic
numbers are identical on every machine and run.

### 2) Real run (needs a reachable backend + a Gemini key with quota)

```bash
export BACKEND_URL="https://your-backend.run.app"   # or http://localhost:8080
export API_KEY="fitness-secret-key-123"             # matches backend app.api-key

python calorie_accuracy_eval.py \
  --metadata metadata.csv \
  --images-dir ./images \
  --limit 100 \
  --concurrency 2 \
  --provider gemini \
  --out ./calorie-eval-out
```

Useful flags: `--concurrency` (default **2** - the Gemini free tier is fragile),
`--max-retries`, `--backoff-base`, `--backoff-cap`, `--timeout`. `--backend-url`
and `--api-key` fall back to the `BACKEND_URL` / `API_KEY` env vars.

### Reading the report

- **stdout** - quick human summary; the `+/-15%` line is flagged `<-- HEADLINE`.
- **`results.json`** - `meta` (run provenance), `summary` (all metrics), and
  `rows` (per-dish: truth, estimate, abs % error, signed error, and a `reason`
  for every skip so failures are auditable).
- **`summary.md`** - a clean table you can paste into a report or PR.

### Interpreting the result (read this before quoting a number)

- Published photo->calorie systems **commonly sit at 20%+ MAPE**. Single-image
  portion estimation is genuinely hard (occlusion, density, hidden oil/sugar).
- **Report the measured number truthfully even if it exceeds 15%.** A 23% MAPE
  honestly measured is more credible - and more useful - than a cherry-picked
  one. The point of this harness is an honest, repeatable number.
- The **`+/-15%` hit-rate is the headline**: "what fraction of meals does the app
  get close enough to coach on?" Track it over time as you tune prompts/models.
- Watch **mean signed error** for systematic bias - a consistent under-estimate
  is a product risk (users think they ate less than they did).
- Keep **n_skipped** low. A high skip count usually means an exhausted Gemini
  quota (429/503); the metrics then reflect only the dishes that got through.

---

## Chinese-dish supplement (CFCT) - and why it matters for ByteDance/Douyin

Nutrition5k is **Western-cafeteria-heavy** (Google US cafeterias). For a product
targeting a Chinese market (Douyin/ByteDance context), that distribution
under-represents the dishes users will actually photograph: stir-fries with
hidden oil, rice/noodle bowls, hot pot, dumplings, etc. A model that scores well
on Nutrition5k can still misjudge 红烧肉 or 蛋炒饭, so a **small self-labeled
Chinese-dish set** is a high-leverage supplement.

`chinese_dishes_template.csv` (columns: `dish_id,total_calories,image,notes`) is
a labeling template. To build ground truth:

1. **Weigh every ingredient raw on a kitchen scale** before cooking (especially
   **cooking oil** - it dominates the calories of most Chinese dishes and is the
   easiest thing to under-count).
2. Look up kcal per 100g in the **China Food Composition Tables
   (CFCT / 中国食物成分表)**, **not** USDA. CFCT has far better coverage and more
   representative values for Chinese ingredients and preparations (e.g. specific
   soy products, regional vegetables, Chinese cuts of meat).
3. Sum to a per-dish `total_calories`, photograph the plated dish (overhead,
   good light), and fill in the row.

Then evaluate it exactly like Nutrition5k:

```bash
python calorie_accuracy_eval.py \
  --metadata chinese_dishes_template.csv \
  --images-dir ./images_cn \
  --out ./calorie-eval-out-cn
```

Comparing the Western (Nutrition5k) and Chinese (CFCT-labeled) hit-rates tells
you whether the photo->calorie path generalizes to the target market - a
concrete, defensible data point rather than a hand-wave.

---

## Files in this directory

| File | Purpose |
|---|---|
| `calorie_accuracy_eval.py` | the harness (dry-run + live, metrics, reports) |
| `nutrition5k_to_metadata.py` | Nutrition5k CSV -> `dish_id,total_calories,image` |
| `sample_metadata.csv` | 4 fake rows for `--dry-run` (no images needed) |
| `chinese_dishes_template.csv` | self-labeling template for the CFCT supplement |
| `.gitignore` | keeps datasets/images/outputs out of git |
| `README.md` | this file |
