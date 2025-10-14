# FitnessApp MVP – Database ERD

This document provides the ERD and schema notes for the MVP content and interaction model. It reflects the DDL in `src/main/resources/db/migration/V1__initial_schema.sql` and adds documentation for indexes and relationships needed for search and retrieval.

## How to View / Share
- dbdiagram.io (recommended for collaboration): copy contents of `docs/erd.dbml` into https://dbdiagram.io/new and share the link for team review.
- Mermaid (quick in‑repo view): paste the diagram block below into a Mermaid-enabled Markdown viewer.

## Mermaid ER Diagram
```mermaid
erDiagram
  USERS ||--o{ IMAGE_QUERY : has
  IMAGE_QUERY ||--o{ RETRIEVAL_RESULT : yields
  USERS ||--o{ USER_SAVED_WORKOUT : saves
  WORKOUT_VIDEO ||--o{ USER_SAVED_WORKOUT : saved_by
  USERS ||--o{ USER_SAVED_RECIPE : saves
  RECIPE ||--o{ USER_SAVED_RECIPE : saved_by
  RECIPE ||--o{ RECIPE_INGREDIENT : contains
  INGREDIENT ||--o{ RECIPE_INGREDIENT : used_in
  USERS ||--o{ FEEDBACK : gives

  USERS {
    uuid id PK
    varchar email UNIQUE
    int time_bucket
    varchar level
    varchar diet_tilt
    timestamptz created_at
  }
  WORKOUT_VIDEO {
    uuid id PK
    varchar youtube_id UNIQUE
    varchar title
    int duration_minutes
    varchar level
    text[] equipment
    text[] body_part
    text thumbnail_url
    bigint view_count
    timestamptz last_validated_at
    timestamptz created_at
  }
  RECIPE {
    uuid id PK
    varchar title
    text image_url
    int time_minutes
    varchar difficulty
    jsonb nutrition_summary
    jsonb steps
    jsonb swaps
    timestamptz created_at
  }
  INGREDIENT {
    uuid id PK
    varchar name UNIQUE
  }
  RECIPE_INGREDIENT {
    uuid recipe_id PK
    uuid ingredient_id PK
    numeric quantity
    varchar unit
  }
  IMAGE_QUERY {
    uuid id PK
    uuid user_id FK
    varchar type
    jsonb detected_hints
    timestamptz created_at
  }
  RETRIEVAL_RESULT {
    uuid id PK
    uuid query_id FK
    varchar item_type
    uuid item_id
    int rank
    numeric score
    int latency_ms
    timestamptz created_at
  }
  USER_SAVED_WORKOUT {
    uuid user_id PK
    uuid workout_id PK
    timestamptz saved_at
  }
  USER_SAVED_RECIPE {
    uuid user_id PK
    uuid recipe_id PK
    timestamptz saved_at
  }
  FEEDBACK {
    uuid id PK
    uuid user_id FK
    varchar item_type
    uuid item_id
    int rating
    text notes
    timestamptz created_at
  }
```

## Indexes and Constraints
- users
  - `email` UNIQUE
- workout_video
  - `youtube_id` UNIQUE
  - `GIN(equipment)` on `equipment` (text[])
  - `GIN(body_part)` on `body_part` (text[])
  - `GIN(title gin_trgm_ops)` for trigram search on `title`
- recipe
  - `GIN(steps)` on `steps` (JSONB)
  - `GIN(title gin_trgm_ops)` for trigram search on `title`
- ingredient
  - `name` UNIQUE
- recipe_ingredient
  - PK (`recipe_id`,`ingredient_id`)
  - (Recommended) index on `ingredient_id` for reverse lookups
- image_query
  - FK `user_id` → users.id (ON DELETE SET NULL)
  - Index on `user_id` (`idx_image_query_user`)
- retrieval_result
  - FK `query_id` → image_query.id (ON DELETE CASCADE)
  - UNIQUE (`query_id`,`rank`) to preserve ranking order
  - Index on `query_id` (`idx_retrieval_result_query`)
- user_saved_workout
  - PK (`user_id`,`workout_id`), FKs ON DELETE CASCADE
- user_saved_recipe
  - PK (`user_id`,`recipe_id`), FKs ON DELETE CASCADE
- feedback
  - FK `user_id` → users.id (ON DELETE SET NULL)
  - (Optional) index on (`item_type`,`item_id`) to speed item-level feedback queries

## Notes & Rationale
- Arrays and JSONB are indexed with GIN for fast containment queries.
- Trigram indexes enable fuzzy title search on `workout_video` and `recipe`.
- Composite PKs on join tables avoid duplicate saves and speed joins.
- `retrieval_result` enforces unique rank per query for stable presentation.

### Body Part Taxonomy (Workouts)
- Use specific muscle groups when applicable:
  - chest, shoulders, biceps, triceps, back, abs, obliques, forearms,
    glutes, quads, hamstrings, calves
- Keep `full_body` for evenly distributed sessions and `cardio` for heart-rate–focused workouts.

## Review Checklist
- [ ] Fields/types/constraints match product requirements
- [ ] Indexes align with search & filter use-cases
- [ ] Privacy: minimal PII (email only) in `users`
- [ ] Migrations run on clean DB; extensions enabled (`pg_trgm`, `pgcrypto`)

For any updates, modify `docs/erd.dbml` and `src/main/resources/db/migration` accordingly.
