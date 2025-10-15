# Auto‑Tagging Rules & Keyword Patterns (FIT-204)

This document defines deterministic, case‑insensitive rules to auto‑tag YouTube workout titles with equipment, level, body part, and duration. It also provides precedence rules and 20 sample test cases with expected outputs.

## Preprocessing
- Normalize to lowercase; trim whitespace.
- Replace special dashes with `-` and normalize multiple spaces.
- Keep only the video title string (ignore channel names or bracketed metadata if present). Suggested heuristics (optional):
  - Strip trailing bracketed segments: `title = title.replaceAll("\\s*[\\[(].*?[\\])$", "")`.
  - Trim emojis/symbols.

## Equipment Detection
- Mapping (any match → tag present):
  - dumbbells: `\\b(dumbbell|dumbbells)\\b`
  - mat: `\\b(mat|yoga|pilates)\\b`
  - bodyweight: `\\b(no\\s*equipment|bodyweight|equipment[-\\s]*free)\\b`
  - resistance_bands: `\\b(resistance\\s*band|resistance\\s*bands|loop\\s*band(s)?)\\b`
- Precedence: `bodyweight` overrides other equipment if both appear (e.g., “no equipment dumbbell workout” → bodyweight only). Otherwise allow multiple (e.g., “mat + band” → `[mat,resistance_bands]`).
- Examples (✓ expected equipment):
  - “15 Min Dumbbell HIIT” ✓ `[dumbbells]`
  - “Yoga Mat Flow” ✓ `[mat]`
  - “No‑Equipment Cardio Blast” ✓ `[bodyweight]`
  - “Resistance Band Glute Burn” ✓ `[resistance_bands]`

## Level Detection
- Rules (any match → exact level):
  - beginner: `\\b(beginner(s)?|for\\s*beginners?)\\b`
  - advanced: `\\b(advanced|expert|elite)\\b`
  - intermediate: `\\b(intermediate)\\b` (explicit); otherwise default to `intermediate` when neither beginner nor advanced is present.
- Examples (✓ expected level):
  - “Beginner Dumbbell Strength” ✓ `beginner`
  - “Advanced Plyometric Ladder” ✓ `advanced`
  - “20‑Minute HIIT at Home” ✓ `intermediate` (default)

## Body Part Detection (coarse taxonomy)
- Map specific keywords to coarse tags (can emit multiple when clear; `full_body` dominates).
  - full_body: `\\b(full\\s*body|total\\s*body|whole\\s*body)\\b`
  - upper: `\\b(upper\\s*body|arms?|chest|shoulders?|biceps?|triceps?|back)\\b`
  - lower: `\\b(lower\\s*body|legs?|glutes?|quads?|hamstrings?|calves)\\b`
  - core: `\\b(abs?|core|obliques?)\\b`
- Priority: if `full_body` matches, use `[full_body]` only. Else include any of `[upper,lower,core]` that match.
- Examples (✓ expected body_part):
  - “Upper Body Dumbbell Blast” ✓ `[upper]`
  - “Legs & Glutes Sculpt” ✓ `[lower]`
  - “Core Crusher – Abs & Obliques” ✓ `[core]`
  - “Total Body Strength” ✓ `[full_body]`

## Duration Extraction
- Pattern (minutes): `(?i)(\\d{1,3})\\s*[-\\s]?(min|mins|minute|minutes)\\b`
  - Returns the first match as minutes.
  - Hyphenated accepted (e.g., `20-minute` or `20–minute`).
  - If a range like “15-20 min” appears, use the first number (15).
- Examples (✓ expected minutes):
  - “15 min HIIT” ✓ `15`
  - “20‑minute workout” ✓ `20`
  - “30min Strength” ✓ `30`

## Ambiguities & Edge Cases
- Equipment precedence: if “no equipment/bodyweight” appears anywhere, prefer `bodyweight` and drop other equipment tags.
- Multiple body parts without “full body”: allow multiple, e.g., “Arms & Abs” → `[upper,core]`.
- Titles lacking keywords: fallbacks → equipment: `[]` (unknown), level: `intermediate`, body_part: `[]` (unknown), duration: `null`.
- False positives: ensure word boundaries for short words (e.g., “leg” vs part of another word).

## Pseudocode: autoTag(title)
```
normalize(title)

// equipment
equip = set()
if /\b(no\s*equipment|bodyweight|equipment[-\s]*free)\b/i matches: equip = {bodyweight}
else:
  if /\b(dumbbell|dumbbells)\b/i: equip += dumbbells
  if /\b(mat|yoga|pilates)\b/i: equip += mat
  if /\b(resistance\s*band(s)?|loop\s*band(s)?)\b/i: equip += resistance_bands

// level
if /\b(beginner(s)?|for\s*beginners?)\b/i: level=beginner
else if /\b(advanced|expert|elite)\b/i: level=advanced
else if /\bintermediate\b/i: level=intermediate
else level=intermediate

// body part
parts = set()
if /\b(full\s*body|total\s*body|whole\s*body)\b/i: parts={full_body}
else:
  if /\b(upper\s*body|arms?|chest|shoulders?|biceps?|triceps?|back)\b/i: parts+=upper
  if /\b(lower\s*body|legs?|glutes?|quads?|hamstrings?|calves)\b/i: parts+=lower
  if /\b(abs?|core|obliques?)\b/i: parts+=core

// duration
m = /(?i)(\d{1,3})\s*[-\s]?(min|mins|minute|minutes)\b/.find(title)
minutes = m.group(1).toInt() if m else null

return {equipment: list(equip), level, body_part: list(parts), duration_minutes: minutes}
```

## Test Cases (20 Titles → Expected Tags)
| # | Title | Equipment[] | Level | Body Part[] | Duration |
| - | ----- | ----------- | ----- | ----------- | -------- |
| 1 | 15 Min Dumbbell HIIT | [dumbbells] | intermediate | [full_body] | 15 |
| 2 | Beginner Full Body Mat Flow | [mat] | beginner | [full_body] | null |
| 3 | Advanced Upper Body Dumbbell Blast (20-minute) | [dumbbells] | advanced | [upper] | 20 |
| 4 | No-Equipment Cardio Core | [bodyweight] | intermediate | [core] | null |
| 5 | Resistance Band Glute Burn – 30 mins | [resistance_bands] | intermediate | [lower] | 30 |
| 6 | 20-minute Arms & Abs | [] | intermediate | [upper,core] | 20 |
| 7 | Beginner Lower Body Dumbbell Sculpt 25min | [dumbbells] | beginner | [lower] | 25 |
| 8 | Total Body Strength with Bands | [resistance_bands] | intermediate | [full_body] | null |
| 9 | Intermediate Mat Pilates Core 30-Min | [mat] | intermediate | [core] | 30 |
| 10 | Expert Chest & Triceps Dumbbell Workout | [dumbbells] | advanced | [upper] | null |
| 11 | Yoga Mat Flow – No Equipment (20 min) | [bodyweight] | intermediate | [full_body] | 20 |
| 12 | Quick Leg Day at Home 15-min | [] | intermediate | [lower] | 15 |
| 13 | Back & Biceps Strength – 40 minutes | [] | intermediate | [upper] | 40 |
| 14 | Core Crusher: Abs + Obliques 18min | [] | intermediate | [core] | 18 |
| 15 | Beginner Total Body Resistance Band Circuit | [resistance_bands] | beginner | [full_body] | null |
| 16 | 30 Min Shoulders & Arms Dumbbell Pump | [dumbbells] | intermediate | [upper] | 30 |
| 17 | Advanced Lower Body Mat Burner | [mat] | advanced | [lower] | null |
| 18 | 15–20 minute Full Body Express | [] | intermediate | [full_body] | 15 |
| 19 | Elite Plyo Total Body (No Equipment) | [bodyweight] | advanced | [full_body] | null |
| 20 | Upper Body Calisthenics – 25 minutes | [] | intermediate | [upper] | 25 |

Notes:
- #1 assumes HIIT without specific body keyword → treat as full_body when equipment only; you may choose to leave empty if you prefer stricter body-part matching.
- #11 shows precedence: “no equipment” → `[bodyweight]` even if “mat” appears.

## Review Checklist
- [ ] Patterns align with product taxonomy.
- [ ] Examples cover 3+ per rule category.
- [ ] Edge cases are defined (precedence, multi‑match, defaulting).
- [ ] Team sign‑off recorded in FIT-204 story comments.

