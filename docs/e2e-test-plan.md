# End-to-End Test Plan (Week 1 Stub)

## Scope
- Validate workout retrieval for common equipment scenarios.
- Validate recipe retrieval with ingredient detections and fallbacks.
- Ensure latency stays below 300 ms for curated data responses.

## Test Matrix
| ID | Scenario | Input | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| T1 | Dumbbell Photo | equipment=`"dumbbells"`, level=`"beginner"`, duration=`20` | 4 dumbbell workouts, 15–25 min, ≥2 distinct body parts | _pending_ |
| T2 | Mat Photo | equipment=`"mat"`, level=`"intermediate"`, duration=`30` | 4 mat workouts, 25–35 min, yoga/pilates mix | _pending_ |
| T3 | Chicken Ingredients | ingredients=`["chicken"]`, maxTime=`45` | 3 chicken recipes, <45 min, sorted by prep ease | _pending_ |
| T4 | Empty Detection | ingredients=`[]`, maxTime=`30` | 3 quick & easy (<20 min) pantry recipes | _pending_ |
| T5 | Performance | Any valid request | P95 latency <300 ms, no duplicate items | _pending_ |

## Notes
- Use `test-api.sh` as the starting harness; extend with new endpoints for automation.
- Capture response payloads for manual relevance review (20% spot check).
- Log thumbnails/nutrition availability as part of verification evidence.
