# Content Tagging Guide v1

## Taxonomy Overview

| Category | Allowed Values | Definition | Example |
| --- | --- | --- | --- |
| Equipment | bodyweight, dumbbells, mat, resistance_bands, kettlebell, barbell, pull_up_bar | Primary equipment needed for the session | 20-min total body workout using only bodyweight |
| Level | beginner, intermediate, advanced | Skill/conditioning level suitable for the workout | Low-impact Pilates flow (beginner) |
| Time (minutes) | 15, 20, 30, 45 | Approximate total runtime excluding cool-down ads | 20-minute HIIT circuit |
| Body Part | upper, lower, core, full_body, cardio | Dominant muscle group or focus area | Glute activation class (lower) |
| Diet Tilt | lighter (<400 cal), high_protein (>25g), vegetarian, vegan, quick (<20 min) | Narrative to help users align recipes with goals | Overnight oats with chia (quick, vegetarian) |

## Workout Tagging Rules
- Always assign exactly one `Level` and `Time` value.
- Multiple `Body Part` tags may be used when evenly targeted (e.g., upper + core).
- If the instructor calls out optional equipment, include it in `equipment[]` with a note in descriptions.
- `full_body` is meant for evenly distributed sessions; reserve `cardio` for heart-rate focused routines.

### Workout Examples
| YouTube Title | Equipment | Level | Time | Body Part | Notes |
| --- | --- | --- | --- | --- | --- |
| "15-Minute Low Impact HIIT" | bodyweight | beginner | 15 | full_body, cardio | Great for users with joint sensitivity |
| "Dumbbell Strength Burn" | dumbbells | intermediate | 30 | upper, core | Pair with playlists for progressive overload |
| "Advanced Plyometric Ladder" | bodyweight | advanced | 20 | full_body, cardio | Ensure readiness for high-impact moves |

## Recipe Tagging Rules
- `nutrition_summary` should include calories and key macros where available.
- `steps` should contain 5–8 actionable instructions; use JSON array of objects `{ "step": 1, "instruction": "" }`.
- `swaps` should document viable substitutions relevant to dietary goals.
- Use `diet_tilt` tags to highlight user personas (e.g., `high_protein` for 25g+ protein per serving).

### Recipe Examples
| Recipe Title | Time | Difficulty | Diet Tilt | Notes |
| --- | --- | --- | --- | --- |
| Chickpea Spinach Curry | 20 | easy | vegetarian | Highlight pantry-friendly nature |
| Grilled Salmon Power Bowl | 30 | medium | high_protein | Pair with citrus vinaigrette |
| Avocado Breakfast Toast | 15 | easy | lighter | Encourage optional poached egg for protein |

## Review & Approval Workflow
1. Curator assigns initial tags in shared Google Sheet (see templates in `docs/templates`).
2. Second reviewer spot-checks 10% of entries for accuracy.
3. Approved rows are marked with ✅ and moved to the "Ready for Import" tab for engineering.

Feedback or taxonomy updates can be logged in Jira under FIT-204 subtasks.
