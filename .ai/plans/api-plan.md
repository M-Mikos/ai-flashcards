# REST API Plan

## 1. Resources

- `auth`: Supabase Auth users (external table `auth.users`) - dont implement auth now
- `generations`: table `generations`
- `flashcards`: table `flashcards`

## 2. Endpoints

### Generations

- POST `/api/generations`
  - Desc: Start an AI generation session for pasted text.
  - Body: `{ "text": string (1000-10000 chars), "model": "gpt-4o-mini" }`
  - Response: `{ "id": uuid, "hash": string, "inputLength": number, "generatedCount": number, "createdAt": string }`
  - Success: 201 Created; errors: 400 length/validation, 401 unauthorized, 500 ai_error.
  - Notes: validate length, compute hash of input, store timing + model name, set generated_count based on AI output count.

- GET `/api/generations`
  - Desc: List user generations.
  - Query: `page`, `pageSize` (default 20, max 100); `sort` (default `created_at desc`).
  - Response: `{ "items": [ ... ], "page": number, "pageSize": number, "total": number }`
  - Success: 200; errors: 401.

- GET `/api/generations/:id`
  - Desc: Get single generation with stats.
  - Response: generation object; 404 if not found/owned; 401 unauthorized.

- DELETE `/api/generations/:id`
  - Desc: Delete generation (cascades flashcards).
  - Response: 204; errors: 401, 404.

### Flashcards

- POST `/api/flashcards`
  - Desc: Create one flashcard (manual or accepted AI).
  - Body: `{ "front": string (1-200), "back": string (1-500), "source": "manual" | "ai_generated" | "ai_edited", "generationId": uuid|null }`
  - Response: `{ "id": uuid, "front": string, "back": string, "source": string, "generationId": uuid|null, "createdAt": string }`
  - Success: 201; errors: 400 validation, 401 unauthorized, 404 generation not owned.

- POST `/api/flashcards/bulk`
  - Desc: Save multiple flashcards from a generation in one call.
  - Body: `{ "generationId": uuid|null, "flashcards": [ { "front": string, "back": string, "source": "ai_generated" | "ai_edited" | "manual" } ] }`
  - Response: `{ "created": number, "ids": uuid[] }`
  - Success: 201; errors: 400 validation, 401, 404 generation not owned.
  - Notes: enforce 1-200 / 1-500 per item; cap batch size (e.g., 50).

- GET `/api/flashcards`
  - Desc: List user flashcards.
  - Query: `page`, `pageSize` (default 20, max 100); filters: `source`, `generationId`; sort: `created_at desc` default.
  - Response: `{ "items": [ ... ], "page": number, "pageSize": number, "total": number }`
  - Success: 200; errors: 401.

- GET `/api/flashcards/:id`
  - Desc: Get single flashcard.
  - Response: flashcard object; 404 if not found/owned; 401 unauthorized.

- PATCH `/api/flashcards/:id`
  - Desc: Update front/back/source.
  - Body: partial `{ "front": string?, "back": string?, "source": "manual" | "ai_generated" | "ai_edited" }`
  - Response: updated flashcard; 200; errors: 400 validation, 401, 404.
  - Notes: apply length constraints; track edits by changing source to `ai_edited` when appropriate.

- DELETE `/api/flashcards/:id`
  - Desc: Delete flashcard.
  - Response: 204; errors: 401, 404.

### Learning Session (placeholder integration)

- POST `/api/learning/session`
  - Desc: Prepare study session using external spaced-repetition lib.
  - Body: optional filters (e.g., count).
  - Response: `{ "cards": [ { "id": uuid, "front": string } ] }`
  - Errors: 401.

- POST `/api/learning/feedback`
  - Desc: Send recall quality to spaced-repetition algorithm.
  - Body: `{ "cardId": uuid, "grade": number, "timestamp": string }`
  - Response: 200; errors: 400, 401, 404.

## 3. Validation and Business Logic

- Input text length: 1000–10000 chars (DB check on `generations.input_length`); reject early with 400.
- Generation metrics: store `generation_time_ms > 0`, `generated_count >= 0`, `accepted_count >= 0`, `accepted_edited_count >= 0`; update counts on bulk save or individual accept.
- Flashcard constraints: `front` 1–200 chars; `back` 1–500; `source` in enum `ai_generated|ai_edited|manual`; `generationId` nullable.
- Ownership: all lookups scoped by `user_id`.
- Pagination defaults: page 1, pageSize 20 (max 100); sorting defaults to `created_at desc`.
- Bulk create cap: recommend max 50 items per request to limit payload size.
- Error mapping: 400 for validation, 401 for missing/invalid token, 403 only for admin-locked ops, 404 for missing or not-owned resources, 429 for rate-limit, 500 for unexpected errors/AI provider failures.
