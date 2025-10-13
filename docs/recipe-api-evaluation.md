# Recipe API Evaluation (Spoonacular vs Edamam)

| Criterion | Spoonacular | Edamam |
| --- | --- | --- |
| Pricing (Starter tiers) | $150/mo for 5,000 calls (Pro); free dev key 150 calls/day | $50/mo for 5,000 calls; free dev key 10 calls/min, 100 calls/day |
| Data richness | Detailed instructions, equipment parsing, nutrition (macros + micros) | Strong nutrition data, less structured instructions |
| Filtering | Supports time, diet, intolerances, ingredients include/exclude | Supports diet/health labels, calories, nutrients |
| Media assets | Multiple image sizes, occasional video links | Single image per recipe |
| Rate limits | Hard daily quota; bursts allow 10 calls/sec | Soft per-minute throttling (10/min) |
| SDK / Docs | REST + Java SDK, clear examples | REST only, comprehensive docs but dated screenshots |
| TOS for caching | Allows 24h caching with attribution | Requires linking back; 24h cache acceptable |

## Test Calls
Replace placeholders before executing.
```bash
# Spoonacular search
curl "https://api.spoonacular.com/recipes/complexSearch?query=chicken&addRecipeInformation=true&number=5&apiKey=YOUR_SPOONACULAR_KEY"

# Edamam search
curl "https://api.edamam.com/search?q=chicken&app_id=YOUR_APP_ID&app_key=YOUR_APP_KEY&to=5"
```

## Recommendation
Use **Spoonacular** for the MVP:
- Complete cooking instructions with structured steps simplify ingestion into `recipe.steps` JSONB.
- Built-in equipment annotations map cleanly to the taxonomy (`equipment[]`).
- Higher protein & diet filters match Day 2 requirements with fewer post-filters.
- Pricing aligns with anticipated 5k monthly calls; scaling path to 50k tier is predictable.

## Follow-up Actions
1. Request production API key upgrade after prototype (target usage: 3k calls/month).
2. Implement error budget alarms via API dashboard (email alerts at 80% quota).
3. Prepare data ingestion notebook to normalize macros into `nutrition_summary` JSON.
