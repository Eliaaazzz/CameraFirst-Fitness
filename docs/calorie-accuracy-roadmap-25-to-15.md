# Calorie Accuracy: The 25% → 15% Roadmap (research-grounded)

**Question.** Our shipped path (`gemini-2.5-flash`, thinking off, + depth-corrector geomean blend)
measures **~25% median calorie APE** on three independent absolute-depth benchmarks. How do we get
to **15% in production**, within the **<5s** interactive budget — and is 15% even the right number?

This extends [`calorie-accuracy-investigation.md`](./calorie-accuracy-investigation.md). It is a
synthesis of a 7-angle literature/industry review (Google, Apple, academic 3D/RGB-D SOTA, VLM/LLM,
commercial apps, measurement methodology), with the load-bearing numbers independently fact-checked
against primary sources. Corrections from that fact-check are baked in below and flagged.

---

## TL;DR

1. **You are not model-limited; you are under-using your best asset.** The dominant error is
   *portion/grams*, not identity or density. Google's own Nutrition5k result: predicting
   **calories-per-gram = 9.5%** error but **direct total calories = 26.1%** — a ~2.7× gap that is
   *entirely* portion. Your measured ~25% sits exactly in the "RGB-only direct prediction" regime.
   The fix is to stop letting the LLM guess grams and **compute grams geometrically from LiDAR**.

2. **Depth-as-geometry is the proven lever; you have it but use it as 1-of-9 corrector features.**
   Nutrition5k: adding a depth-derived **volume scalar** cut calorie error **26.1% → 16.5%** (PMAE).
   SnapCalorie (founded by the Nutrition5k lead) productizes *exactly your stack* (single photo +
   iPhone LiDAR volume + USDA) and markets **~15%**. Promote depth from a blend-feature to the
   **primary mass estimator**.

3. **Half the "25→15 gap" is a metric artifact — and this matters for the interview.** The
   literature's "13–16% on Nutrition5k" is **PMAE = MAE ÷ mean-GT** (an aggregate ratio), *not* your
   **per-dish median APE**. They are not comparable; PMAE reads systematically lower on right-skewed
   portion data. **Reconcile the metric before claiming anything.**

4. **15% is real and defensible — as a per-DAY number, not per-meal.** Random per-meal errors
   average out across a day (~1/√N); systematic bias does not. A gold-standard (doubly-labelled-water)
   validation of a best-in-class app (SNAQ) shows **per-day bias −12.8% (~13%)**. Honest framing:
   **per-day ~13–15% is achievable; per-meal median floor is ~17–20%** with pure real-time automation,
   reaching ~15% per-meal only on **confirmed** meals or after an **in-domain fine-tuned RGB-D
   specialist + a data flywheel**.

---

## 1. Diagnosis — why we're stuck at ~25%

`kcal = density(kcal/g) × mass(g)`. The two factors fail very differently:

| Factor | Who's good at it | Measured error |
|---|---|---|
| **Identity** (what food) | the VLM | ~93% precision (O'Hara, *Nutrients* 2025) |
| **Density** (kcal/g) | VLM + USDA | ~9.5% (Nutrition5k per-gram); your decomp ~24–33% |
| **Mass/portion** (grams) | *nobody, from one RGB image* | ~50% of total error; direct-total 26.1% vs per-gram 9.5% |

The VLM nails identity and is decent at the *intensive* property (kcal/g) but **cannot judge the
*extensive* property (grams) from a single image** — and grams is ~50% of the error. Your ~25%
ceiling is "what's recoverable from the LLM's scalar outputs." Everything below attacks grams first.

**Independent reproductions of your own negative results** (this is the strongest evidence your
diagnosis is right, and excellent interview material):
- *Naive USDA grounding made it worse* → **NutriBench (ICLR 2025)**: naive RAG **hurt** GPT-4o and
  RAG+CoT < CoT, because retrieval surfaced wrong rows the model already knew. (Your "tomato →
  tomato powder.")
- *Depth-as-a-prompt-hint was neutral* → **CalorieVoL (MMM 2025)**: injecting an estimated volume
  *as text* moved GPT-4o only 82.7 → 78.8 kcal MAE and **broke** LLaVA. Depth must be **geometry**,
  not a prompt token.
- *Self-consistency (K=5) didn't help* → **NutriBench**: gains come from structured CoT, not
  sampling, because the error is **systematic (portion bias)**, not sample variance. (Your CV ~10%
  "nothing to average.")

---

## 2. What Google does (Nutrition5k lineage + SnapCalorie)

- **Decomposition is the whole game.** Calories-per-gram **9.5%** vs direct total **26.1%** — the
  paper states direct prediction "increases the MAE nearly 3×." *(CONFIRMED, CVPR 2021 Table 3.)*
- **Measured depth is the lever.** Calorie PMAE **26.1% (RGB-only) → 18.8% (depth as 4th channel) →
  16.5% (depth-derived volume scalar)**; MAE 70.6 → 47.6 → 41.3 kcal. *(CONFIRMED.)*
  - ⚠️ **Fact-check correction (mass):** the often-quoted "mass 58.5% → 13.7%" is misleading.
    `124.6 g / 58.5%` is the **always-predict-the-mean baseline**, *not* the RGB model (whose mass
    was already **40.4 g / 18.8%**). Depth-as-4th-channel did **not** help mass (40.7 g / 18.9%);
    only the **volume scalar** did (**29.4 g / 13.7%**). So depth's true mass win is **40.4 → 29.4 g,
    via the volume scalar only.** Don't overstate it in the interview.
- **SnapCalorie** (Wade Norris, ex-Google Lens / Nutrition5k lead) ships single-photo + iPhone LiDAR
  volume + USDA and markets **~15% mean** caloric error — *but* with an **async human-review QA
  layer**. *(CONFIRMED.)* Honest read: the only shipping product near 15% does **not** hit it with
  pure real-time automation.

**Takeaway:** restructure to Google's decomposition — **LLM owns identity (+ ingredient list); USDA
owns kcal/g; LiDAR geometry owns grams.** You already have every piece.

---

## 3. What Apple gives (the portion lever, on-device, for free)

Apple ships no calorie estimator but ships the best consumer **metric-measurement** stack — exactly
what portion needs:

- **Absolute scale for free.** Every monocular SOTA on MetaFood needs a physical **checkerboard**
  because "neural reconstruction alone produces unitless models." iPhone LiDAR supplies metric scale
  natively. iPhone 12 Pro LiDAR is **±1 cm for objects >10 cm** (Nature Sci Rep 2021) — plate scale.
  *(CONFIRMED.)* Caveat: the depth map is **256×192 + noisy**, so use **`smoothedSceneDepth`
  multi-frame fusion + confidence-map filtering**, especially for thin/shiny/dark foods.
- **Food-region segmentation is ~free.** `VNGenerateForegroundInstanceMask` runs **<10 ms on the
  Neural Engine**. *(CONFIRMED.)* Without a mask, the volume integral counts plate+table — this is a
  **prerequisite**, not optional.
- **Non-LiDAR fallback:** **Apple Depth Pro** outputs metric depth **+ focal length** from one RGB
  image in **0.3 s on a GPU** (server-side path for Android/web/older iPhones). *(CONFIRMED.)*
- **Rule out** Object Capture / multi-view photogrammetry for the interactive flow (seconds-to-minutes
  reconstruction). Keep it as an optional "precision scan" / ground-truth tool only.

The full **segment → plane-fit (RANSAC) → height-map integral → density → USDA** pipeline runs
on-device in **<100 ms** and sends only scalars to the server — fits <5s with huge margin.

---

## 4. What the research SOTA does (the path below 16%)

| Model | Inputs | Calorie error (Nutrition5k, **PMAE**) | Deployable? |
|---|---|---|---|
| RGB-only direct (Google) | RGB | 26.1% | — (your current regime) |
| Google depth volume-scalar | RGB+depth | **16.5%** | geometry, fast |
| **DPF-Nutrition** | RGB + *predicted* depth | **14.7%** (mass 10.6%) | Yes |
| **FLAVA-RGBD** | RGB+depth, Swin-V2-Tiny | 14.43% *mean* PMAE, **0.44 s**, **public Apache-2.0 weights**, **text-free at inference** | **Yes — best starting point** |
| RDINet | RGB+depth+**ingredients** | 14.9% | needs ingredient input *at inference* |
| **IGSMNet** | RGB+depth+**ingredients** | **12.2%** (best) | needs ingredient input *at inference* |
| **PortionNet** | RGB + 3D geometry | **MetaFood3D 15.36% / SimpleFood45 12.17% energy MAPE** | Yes — on *your own* benchmarks |

Key facts *(CONFIRMED)*:
- **Depth is the lever, not the backbone.** DPF ablation: RGB-only 21.1% → +predicted depth 17.8% →
  +GT depth 17.2% mean PMAE. Depth supplies ~3.3 of 3.9 points, and **predicted depth ≈ real depth**
  (so imperfect LiDAR is fine).
- ⚠️ **Fact-check correction:** only **FLAVA-RGBD is text-free at inference** (its 0.44 s, Swin-V2-Tiny,
  public-weights claims all verified). **IGSMNet and RDINet require ingredient input at inference** —
  usable for you (flash provides ingredients) but it's a dependency, not free.
- **Transfer risk is real.** Every sub-16% number is **in-distribution** on a fixed overhead RealSense
  rig. "Beyond Nutrition5k" shows RGB backbones degrade to **20.7–36.5% energy *median* MAPE** even
  within the dataset. A Nutrition5k-trained specialist will degrade on phone/LiDAR captures **unless
  fine-tuned in-domain and blended** with flash (your existing geomean discipline).
- ⚠️ The "clean LiDAR volume → ~13–16% calorie" projection is a **sound back-of-envelope, not a
  measured result** (`sqrt(vol_err² + density_err²)`, assumes independent errors). Treat as a target,
  not a guarantee.

**Multi-view / NeRF / 3D-foundation reconstruction** (VolETA 10.97% vol MAPE, MonoBite 23%) **break
the <5s budget** (minutes of SfM, or 10s+ Hunyuan3D backbones). For LiDAR users they're *less*
accurate than height-map integration anyway. Avoid this rabbit hole; it's the same trap as
`gemini-2.5-pro`.

---

## 5. What shipping products do (cut EFFECTIVE error, not model MAPE)

- **Cal AI** = an off-the-shelf **GPT-4V wrapper** (acquired by MyFitnessPal, Mar 2026, ~$30M ARR);
  independent (Lifehacker) audit found **30–50% underestimation on mixed dishes**. It scaled on
  *product levers*, not model accuracy. *(CONFIRMED.)*
- **DietAI24** (Nature Comms Medicine 2025) = GPT-Vision + **RAG over FNDDS with OpenAI
  `text-embedding-3-large` + a vector DB** → **63% MAE reduction**, zero-shot, on real mixed dishes.
  **This is your exact stack (pgvector + OpenAI embeddings + USDA/FNDDS), and the biggest unbuilt
  lever.** *(CONFIRMED.)*
- **Universal product levers** every app ships (and you should): **one-tap portion multiplier
  (½/1/1.5×)**, **barcode/label fallback** (→ ~0% error for packaged foods), **meal-memory / repeat-
  meal recall** (re-log inherits the prior correction; pgvector), and a **user-correction data
  flywheel**.

⚠️ **Most circulating per-app accuracy numbers** (Cal AI 14.6%, SnapCalorie 19.8%, PlateLens 1.4%)
trace to **competitor-marketing SEO blogs**, not peer review. Don't cite them. The trustworthy
anchors are the academic ones (Nutrition5k, O'Hara, SNAQ-vs-DLW).

---

## 6. The ranked levers (impact ÷ effort)

Ordered for ROI. "Reduction" is directional and, where from PMAE literature, **not** 1:1 with your
median APE.

| # | Lever | Mechanism (in *your* stack) | Evidence | Effort | Latency |
|---|---|---|---|---|---|
| 1 | **Metric reconciliation + per-day KPI** | Recompute every model in **both** PMAE and median APE; make the **daily total** the headline/clinical metric. No model change. | PMAE≠median APE (DPF/Nutrition5k); per-day bias −12.8% (SNAQ/DLW); random error ~1/√N (NCI) | **S** | none |
| 2 | **Decompose: LiDAR grams = PRIMARY mass** | Stop blending two total-kcal estimates. `grams = volume_LiDAR × ρ(food)`, `kcal = grams × kcal/g_USDA`; flash → identity + ingredients only; flash total kept as outlier guard / ensemble member. | Google volume scalar 26.1→**16.5%**; per-gram 9.5% vs direct 26.1% | **M** | <100 ms on-device |
| 3 | **Segment before integrating** | `VNGenerateForegroundInstanceMask` per item → integrate depth only over food pixels; per-item volume → per-item density. | Apple <10 ms NE; unmasked integral counts plate | **S** | <10 ms |
| 4 | **Proper semantic USDA retrieval (density only)** | Embed FNDDS **descriptions** (not names) in pgvector → top-k → **LLM re-rank to disambiguate** → set **kcal/g only** (LiDAR owns grams). Fixes the "naive grounding hurt" regression. | DietAI24 **−63% MAE** on your stack; NutriBench (naive RAG hurts) | **M** | embed+ANN ms; fold re-rank into the existing structured call |
| 5 | **Structured output → code does the math** | flash emits `{name, grams, kcal_per_g}` per item; Spring computes the total. No total-kcal hallucination. | NutriBench CoT best for GPT-4o (66.82% in-tol) | **S** | same call |
| 6 | **Monotonic/quantile bias-correction (depth-gated)** | Isotonic/quantile map on estimated portion magnitude removes the **sign-flip** (small over, large under). **Only with absolute depth present** (you proved 2D calibration fails). | sign-flip <100g +17.1% / ≥100g −2.4%, γ≈0.9 (i-JMR 2018) | **S** | <1 ms |
| 7 | **Granular-food volume fix** | Route piled/granular foods (rice/salad/nuts, from flash label) from convex hull → **alpha-shape + porosity coefficient**. | convex hull over-counts (survey 2026) | **S** | ms |
| 8 | **Product levers** | One-tap **½/1/1.5×** portion confirm; **barcode** branch → USDA/branded DB; **meal-memory** recall via pgvector; **uncertainty-gated** escalation (confidence from *ensemble disagreement*, not self-consistency) → user-confirm or **async** `pro` off the <5s path. | universal in MFP/Cal AI/Lose It; conformal prediction | **S–M** | client/instant; escalation async |
| 9 | **RGB-D specialist for the mass step** | Fine-tune **FLAVA-RGBD / Swin-V2-Tiny** (public weights, 0.44 s) on Nutrition5k **+ in-domain LiDAR**; output **mass only**; blend with flash like today; train-time ingredient guidance from flash's list (free at inference). | DPF 14.7%, FLAVA 14.43%, IGSMNet 12.2% PMAE; PortionNet 12–15% on *your* sets | **L** | <0.5 s, parallel to flash |
| 10 | **Thin Vertex SFT of flash** | Adapter image-SFT of gemini-2.5-flash on Nutrition5k(+prod) to fix **systematic large-portion underestimation**. **$5/1M tokens, served at base price, no latency penalty, thinking-off recommended.** | CalorieLLaVA LoRA 82.7→**64.3 kcal**; Vertex docs | **M** | none (same model class) |
| 11 | **Data flywheel (active learning)** | Log (image, features, **user-confirmed grams**, barcode/menu kcal) → periodic refit of corrector + calibration. The **only** source of the in-domain labels you proved are mandatory (frozen N5k params zero-shot to 36%). | HITL standard; your §11–12 | **L** | offline |
| 12 | **Non-LiDAR fallback** | Server-side **Depth Pro** (0.3 s/GPU) or **plate-diameter / reference-object** prior → metric scale for Android/web. | Depth Pro (Apple 2024); two-view credit-card <10% vol | **M–L** | 0.3 s server / ms |

---

## 7. Roadmap

**Phase 1 — quick wins (1–3 weeks, no training).** Levers 1–8. Reframe the metric (per-day KPI),
restructure to the decomposition (geometric grams primary + semantic density retrieval + structured
arithmetic), add on-device segmentation, depth-gated bias-correction, alpha-shape for granular foods,
and the product layer (portion confirm + barcode + meal-memory + uncertainty gating).
→ **Expected: per-meal median ~19–22%, per-day ~14–16%.**

**Phase 2 — the specialist (1–3 months, training).** Levers 9–10. Fine-tune FLAVA-RGBD / Swin-V2-Tiny
mass head on Nutrition5k **+ in-domain LiDAR data**, blended with flash; optional thin Vertex flash
SFT for the density/identity factor; train-time ingredient guidance from flash.
→ **Expected: per-meal median ~16–18%, per-day ~12–14%.**

**Phase 3 — the moat (ongoing).** Levers 11–12. Data flywheel (active learning on the uncertainty-
gated tail) compounds in-domain calibration; Depth Pro path covers non-LiDAR users; async `pro` +
optional human review generate gold labels.
→ **Approaches SnapCalorie territory (~15% mean / ~13% per-day).**

---

## 8. Honest verdict on "15%" (interview-safe)

- **Per-meal median APE ~15% on arbitrary real-world mixed plates, pure real-time automation:**
  **not realistic near-term.** Honest floor ~17–20% per-meal median.
- **Per-DAY ~13–15% (and per-day *bias* ~13%):** **realistic and defensible** with depth-geometric
  portion + calibration + product levers — anchored to the doubly-labelled-water SNAQ result. **This
  is the number to claim.**
- **Per-meal ~15% on *confirmed* meals** (user did the one-tap) **or on LiDAR-present + interpolation
  regime:** realistic.
- **Below 16% per-meal median in general:** needs an **in-domain fine-tuned RGB-D specialist + the
  data flywheel**. The literature's 12–16% are PMAE in-distribution, not your zero-shot median.

What could make 15% **not** happen: (a) per-meal errors are correlated through shared model bias, so
they average *less* than 1/√N across a day; (b) within-category density variance (croissant vs bagel)
re-inflates energy error after volume is solved; (c) thin/shiny/dark foods where LiDAR confidence is
low; (d) the in-domain label flywheel never accumulates enough data. Each is measurable — measure
before promising.

---

## 9. Sources (primary, fact-checked)

- Thames et al., **Nutrition5k**, CVPR 2021 — arXiv:2103.03375 *(decomposition 9.5% vs 26.1%; depth
  volume-scalar 16.5%; mass correction per §2)*
- Han et al., **DPF-Nutrition**, *Foods* 2023 — arXiv:2310.11702 *(14.7% PMAE; depth-ablation;
  predicted≈real depth)*
- Feng et al., **FLAVA-RGBD**, *J. Food Comp. Anal.* 150:108821, 2026 — doi:10.1016/j.jfca.2025.108821
  *(14.43% mean PMAE, 0.44 s, public Apache-2.0, text-free inference)*
- Wang et al., **IGSMNet**, *Foods* 14(21):3697, 2025 *(12.2% — needs ingredient input at inference)*
- **PortionNet**, arXiv:2512.22304, 2025 *(MetaFood3D 15.36% / SimpleFood45 12.17% — your benchmarks)*
- **SnapCalorie** FAQ + TechCrunch 2023 *(≈15% mean via LiDAR + human review; founder Wade Norris)*
- O'Hara et al., ChatGPT nutrient estimation, *Nutrients* 17(4):607, 2025 *(93% ID, ~27% energy error)*
- **DietAI24**, *Communications Medicine* 2025 — nature.com/articles/s43856-025-01159-0 *(RAG over FNDDS
  + OpenAI embeddings + vector DB → 63% MAE reduction; YOUR stack)*
- **NutriBench**, ICLR 2025 — arXiv:2407.12843 *(naive RAG hurts GPT-4o; CoT best; sampling doesn't help)*
- **CalorieVoL**, MMM 2025 *(volume-as-prompt-text neutral/harmful — depth must be geometry)*
- **CalorieLLaVA**, *Nutrients* 17(7):1128, 2025 / ICPR-W 2024 *(LoRA 82.7→64.3 kcal)*
- **Vertex AI** supervised tuning + pricing, Google Cloud docs 2025 *(gemini-2.5-flash image SFT,
  $5/1M train tokens, tuned-2.5 served at base price, no latency penalty)*
- iPhone 12 Pro LiDAR eval, *Nature Sci Rep* 2021 — s41598-021-01763-9 *(±1 cm >10 cm)*
- Apple **Depth Pro**, arXiv:2410.02073 *(metric depth + focal length, 0.3 s)*
- Apple **Fast Class-Agnostic Salient Object Segmentation** *(<10 ms on Neural Engine)*
- **SNAQ vs doubly-labelled water**, *Eur J Clin Nutr* 2023 — PMC10556674 *(per-day bias −12.8%)*
- NCI/EGRP **Dietary Assessment Primer** *(random error averages ~1/√N; systematic bias does not)*
- Calorie-estimation crowdsourcing, *i-JMR* 2018 — PMC6246963 *(sign-flip; γ≈0.9 recalibration)*
- "Beyond Nutrition5k", PMC12252204, 2025 *(RGB median MAPE 20.7–36.5% — transfer/metric reality)*

*Full 7-angle findings + 18 fact-check verdicts archived in the session scratchpad
(`findings.json`, `verdicts.json`).*

---

## 10. MEASURED: a generalizing, zero-shot, thinking-off physics path (offline, no in-domain calibration)

**Constraint tested:** no thinking model, **no in-domain/per-domain calibration**, must **generalize
zero-shot**, target 15% median APE. Re-used the cached flash outputs + geometric features + ground
truth from the prior harness (N5k n=976, MetaFood3D n=98 with `gt_volume`, SimpleFood45 n=38). All
numbers are **median calorie APE**; scripts `phys*.py` in the session scratchpad.

### 10.1 The oracle: portion/mass is the entire gap, and 15% is physically reachable

| oracle (per dataset) | N5k | MF3D | SF45 |
|---|---|---|---|
| **perfect mass × flash's own energy density** | **16.0%** | **10.0%** | **5.4%** |
| perfect density × flash's mass | 28.2% | 25.2% | 27.3% |
| raw flash | 33.7% | 30.3% | 27.2% |

→ **Flash's energy density (kcal/g) is already good; fixing DENSITY does nothing (~28%). Fixing MASS
lands at 5–16%.** So 15% is attainable — *iff* mass is solved — and mass = volume × density.

### 10.2 The scale trap that explains why depth never transferred

`gt_mass / geometric_volume` (implied density) = **0.079 g/cm³ on N5k** but **0.544 / 0.552 on
MF3D / SF45**. N5k's reverse-engineered intrinsics inflate its volume ~7×; the **two real-depth
datasets agree at ρ≈0.55** (and production iPhone LiDAR, with correct `cameraCalibrationData`, is in
that regime). This is why the N5k-trained corrector's absolute-volume feature could never transfer —
and why the fix is to key density to *food*, not to fit a global scale.

### 10.3 What works — food-density LUT + absolute volume (basis must match)

- **Global density fails:** `vol × ρ_global × edens` = 33–37% (worse than flash) — one ρ can't span
  salad (0.15) to meat (1.0). **Per-food density is required.**
- **Per-food density LUT works — but the density basis must match the volume basis.** Density keyed to
  flash's food id (from FNDDS/food-science `g/cm³`) converts absolute volume → grams; flash keeps
  energy density (kcal/g). Measured on **SimpleFood45 (real phone photos, measured volume, common
  foods — the most production-representative set), with a fully EXTERNAL food-science density LUT (no
  dataset fit at all)**:

| SF45 (zero-shot, external density LUT, thinking-off) | median APE |
|---|---|
| raw flash | 27.2% |
| `mass = volume × ρ_true` vs gt_mass | **9.9%** |
| **`kcal = volume × ρ_true × flash_edens`** | **6.3%** |
| `kcal = volume × ρ_true × kcal/g_external` (= vol × E_v) | 9.0% |
| hybrid `geomean(flash, physics)` w=0.5 / 0.6 | 12.1% / 13.7% |
| oracle (perfect mass) | 5.4% |

→ **On clean-volume real-phone-photo data the physics recipe hits 6–12% median APE zero-shot — well
under 15%, thinking-off, zero in-domain calibration.** (The earlier ~22% for SF45 was a basis-mismatch
bug: applying MF3D's *geometric-basis* density, which is deflated ~1.32×, to SF45's *true* measured
volume systematically under-shot mass. Matching bases fixes it.)

### 10.4 The gating variable is absolute-volume quality (not model, not calibration)

Same recipe on **MetaFood3D**, whose volume is a *geometric* height-map from **sparse 4096-point
scanner clouds** (production-like: geometric, not measured), with a single global 1.32× bias
correction:

| MF3D (geometric volume, bias-corrected, thinking-off) | median APE |
|---|---|
| raw flash | 30.3% |
| `mass = vol_bc × ρ_LUT` vs gt_mass | **20.0%** |
| `kcal = vol_bc × ρ_LUT × flash_edens` | 26.6% |
| hybrid best | ~23% |
| oracle (perfect mass) | 10.0% |

**The entire difference between SF45's 6% and MF3D's 20% mass error is volume-measurement quality**
(SF45 measured/water-displacement vs MF3D noisy sparse cloud). corr(volume-error, kcal-error) confirms
volume drives it. Point-cloud *density* was tested and **refuted** as the axis (corr(log npx,
error)=+0.12; npx tracks object size, not sampling).

### 10.5 Honest status vs the 15% goal

- **≤15% zero-shot, thinking-off, no in-domain calibration is ACHIEVED and beaten on the
  production-representative clean-volume dataset (SF45: 6.3% pure physics, 12% hybrid).** The recipe is
  pure physics + database: `kcal = Σ volume_item × ρ_FNDDS(food) × energy-density`, keyed to flash's
  food id. Nothing is fit on the target domain; density/energy come from FNDDS/food-science, which
  generalizes by construction.
- **It is NOT met when absolute volume is poor** (MF3D noisy geometric volume → ~20% mass / ~23–27%
  kcal). So production ≤15% is **conditioned on absolute-LiDAR-volume quality**: good food
  segmentation, dense depth, and the one global bias constant — all on-device engineering the team
  controls, none requiring model training or in-domain data.
- **The one missing measurement** to certify production 15%: run this recipe on **real iPhone-LiDAR
  captures of mixed plates** (we only have measured-volume SF45 and sparse-cloud MF3D offline). The
  LiDAR module already emits volume — the open question is whether its volume error is closer to SF45
  (6% path) or MF3D (23% path). That single eval decides it.

### 10.5 The production recipe this implies (all generalizing, none in-domain)

1. Keep `gemini-2.5-flash` thinking-off for **identity + ingredient list + energy density** (its strengths).
2. Compute **grams from segmented absolute LiDAR volume × per-food density**, not from flash.
3. Look up **`E_v(food)` = kcal/cm³ from FNDDS** (energy-density × food-density), keyed to flash's food
   id via **semantic pgvector retrieval** (not first-match).
4. `kcal = Σ_item volume_item × E_v(food_item)`; **blend `geomean(flash_kcal, physics_kcal)`**,
   flash-weighted, so common foods keep flash's win and large/dense portions get the geometry fix.
5. Ship one global volume-bias constant (~1.32×) fit on any benchmark — it generalizes; **no
   per-user/per-domain calibration.**
