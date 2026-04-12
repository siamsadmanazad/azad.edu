# Azad.Edu — Backend Architecture & Execution Roadmap

> Goal: Ship a clean, secure, deployed backend that demonstrates strong engineering judgment.

---

## Table of Contents

1. [Folder Structure](#folder-structure)
2. [File Responsibilities](#file-responsibilities)
3. [Architecture Rules](#architecture-rules)
4. [Phase 0 — Strategy Lock](#phase-0--strategy-lock)
5. [Phase 1 — Architecture Foundation](#phase-1--architecture-foundation)
6. [Phase 2 — Database Design](#phase-2--database-design)
7. [Phase 3 — Authentication & Authorization](#phase-3--authentication--authorization)
8. [Phase 4 — API Design](#phase-4--api-design)
9. [Phase 5 — Media System](#phase-5--media-system-cloudflare-r2)
10. [Phase 6 — Highlight System](#phase-6--highlight-system)
11. [Phase 7 — Expandable Content](#phase-7--expandable-content)
12. [Phase 8 — Deployment](#phase-8--deployment)
13. [Phase 9 — Testing & Validation](#phase-9--testing--validation)
14. [Security Audit Order](#security-audit-order)
15. [Final Submission Checklist](#final-submission-checklist)

---

## Folder Structure

```
azad-edu-backend/
│
├── app/
│   ├── main.py                         # App entry point — creates FastAPI instance, registers routers
│   │
│   ├── core/                           # Core configs & security (no business logic here)
│   │   ├── config.py                   # Reads .env via pydantic-settings, exports Settings singleton
│   │   ├── security.py                 # JWT creation/decoding, password hashing/verification
│   │   ├── dependencies.py             # Shared FastAPI dependencies (get_current_user, require_teacher)
│   │
│   ├── db/                             # Database layer — no business logic
│   │   ├── base.py                     # Declarative base + shared columns (id, created_at, updated_at)
│   │   ├── session.py                  # Engine creation, SessionLocal factory, get_db dependency
│   │   ├── init_db.py                  # Creates tables on startup (dev only — use Alembic in prod)
│   │
│   ├── models/                         # SQLAlchemy ORM models — DB structure only, no logic
│   │   ├── user.py                     # User: id, email, hashed_password, role_id, is_active
│   │   ├── role.py                     # Role: id, name (teacher | student)
│   │   ├── content.py                  # Content/Material: title, body, teacher_id, is_published
│   │   ├── media.py                    # Media: file_key, url, mime_type, size, uploader_id
│   │   ├── article.py                  # Article: title, body, content_id (belongs to a content unit)
│   │   ├── highlight.py                # Highlight: article_id, anchor_key, start_word, end_word
│   │   ├── popup.py                    # Popup: highlight_id, text, media_id (optional)
│   │   ├── expandable.py               # ExpandableSection: title, body, order, is_visible, article_id
│   │
│   ├── schemas/                        # Pydantic schemas — input/output validation only, no logic
│   │   ├── user.py                     # UserCreate, UserRead, UserUpdate
│   │   ├── auth.py                     # LoginRequest, TokenResponse, TokenPayload
│   │   ├── content.py                  # ContentCreate, ContentRead, ContentUpdate
│   │   ├── media.py                    # MediaCreate, MediaRead, PresignedURLRequest
│   │   ├── article.py                  # ArticleCreate, ArticleRead, ArticleUpdate
│   │   ├── highlight.py                # HighlightCreate, HighlightRead
│   │   ├── popup.py                    # PopupCreate, PopupRead, PopupUpdate
│   │   ├── expandable.py               # ExpandableCreate, ExpandableRead, ExpandableReorder
│   │
│   ├── services/                       # Business logic layer — ALL logic lives here
│   │   ├── auth_service.py             # login(), create_token(), verify_token(), hash_password()
│   │   ├── user_service.py             # create_user(), get_by_email(), update_profile()
│   │   ├── content_service.py          # create(), publish(), unpublish(), get_published_only()
│   │   ├── media_service.py            # generate_presigned_url(), save_metadata(), delete_file()
│   │   ├── article_service.py          # create(), update(), get_with_highlights()
│   │   ├── highlight_service.py        # create(), resolve_anchor(), attach_popup()
│   │   ├── expandable_service.py       # create(), reorder(), toggle_visibility()
│   │
│   ├── api/                            # API layer — routing only, delegates to services
│   │   ├── deps.py                     # API-level dependencies (pagination params, query filters)
│   │   │
│   │   └── v1/                         # Versioned API — never break clients by using v1/v2
│   │       ├── router.py               # Aggregates all endpoint routers into one APIRouter
│   │       │
│   │       └── endpoints/              # Route handlers — receive, delegate, return. Nothing else.
│   │           ├── auth.py             # POST /auth/login, POST /auth/refresh
│   │           ├── users.py            # GET /users/me, PATCH /users/me
│   │           ├── content.py          # CRUD for content/materials
│   │           ├── media.py            # POST /media/presigned-url, POST /media/confirm
│   │           ├── articles.py         # CRUD for articles
│   │           ├── highlights.py       # CRUD for highlights + popup linking
│   │           └── expandable.py       # CRUD + reorder for expandable sections
│   │
│   ├── utils/                          # Stateless helper functions — no DB, no business logic
│   │   ├── file_handler.py             # File type detection, size validation, name sanitization
│   │   └── validators.py               # Custom field validators reused across schemas
│   │
│   ├── constants/                      # Enums and static values — never hardcode strings elsewhere
│   │   ├── roles.py                    # RoleEnum: TEACHER = "teacher", STUDENT = "student"
│   │   └── status.py                   # StatusEnum: DRAFT, PUBLISHED, ARCHIVED
│   │
│   └── tests/                          # Automated tests
│       ├── test_auth.py                # Login, token validation, permission enforcement
│       └── test_content.py             # Create, publish, student access filtering
│
├── alembic/                            # Database migration history — never edit manually
│   └── versions/                       # Auto-generated migration files
│
├── scripts/                            # One-off admin scripts — not part of the app
│   └── create_superuser.py             # CLI script to seed the first teacher account
│
├── .env                                # Local secrets — NEVER commit this file
├── .env.example                        # Safe template showing required variables (no real values)
├── .gitignore                          # Blocks .env, __pycache__, media/, logs/
├── requirements.txt                    # All Python dependencies pinned for reproducibility
├── README.md                           # Setup guide, env vars, how to run locally
└── docker-compose.yml                  # Local dev: PostgreSQL + app container
```

---

## File Responsibilities

### Request Flow

```
Request → Router (api/v1/endpoints/) → Service (services/) → Model (models/) → DB
                                     ← Schema validation    ← ORM result     ←
```

### Layer Rules

| Layer | Allowed | Not Allowed |
|---|---|---|
| `endpoints/` | Receive request, call service, return response | Any logic, DB calls |
| `services/` | All business logic, DB operations, workflows | HTTP concerns, response formatting |
| `models/` | Table definitions, relationships, column types | Business logic, validation |
| `schemas/` | Input/output field definitions, validators | DB queries, business rules |
| `core/` | App-wide config, security primitives | Feature-specific logic |
| `utils/` | Pure helper functions | DB access, service calls |

---

## Architecture Rules

### Rule 1 — Router Rule
Routers do exactly three things:
1. Receive the request
2. Call a service function
3. Return the response

No `if/else` chains, no DB calls, no business decisions inside a router.

### Rule 2 — Service Rule
All logic lives in services:
- DB queries and writes
- Permission checks beyond "is user logged in"
- Multi-step workflows (e.g., create content, attach media, publish)
- Error raising with meaningful messages

### Rule 3 — Schema Rule
Schemas define shape, not behavior:
- Field types and constraints
- Default values
- `orm_mode = True` on read schemas

Never call DB or services from a schema.

### Rule 4 — Model Rule
Models define structure only:
- Column definitions
- Relationships
- Indexes

No methods that contain business decisions.

### Rule 5 — Never Break the Layer
```
router → service         OK
router → model directly  BAD
service → schema         BAD (schemas belong to API layer)
model → service          BAD (circular)
```

---

## Phase 0 — Strategy Lock

**Objective:** Define what you will and will not build before writing a single line.

### In Scope (MVP)

| Feature | Owner |
|---|---|
| Teacher/Student auth | Both roles |
| Content creation | Teacher only |
| Content consumption | Student (published only) |
| Multimedia attachments | Teacher uploads |
| Highlight + popup system | Core differentiator |
| Expandable sections | Teacher structures |

### Out of Scope (Non-Goals)

- Real-time features (websockets, live updates)
- Complex analytics or dashboards
- Comment or discussion systems
- Notification system
- Mobile-specific APIs
- Admin panel UI

### Success Criteria

- All API endpoints work end-to-end
- Deployed to a live URL
- No permission leaks (students cannot see unpublished content)
- Highlight system stable under text edits
- GitHub repo is clean with no secrets

---

## Phase 1 — Architecture Foundation

**Objective:** Lock the design before building.

### Decisions to Make

**Sync vs Async:**
Use `async def` for all route handlers and service functions.
Use synchronous SQLAlchemy sessions (SQLAlchemy 2.x async adds complexity — defer until needed).

**Dependency Injection Strategy:**
- `get_db` — database session, injected at router level
- `get_current_user` — validates JWT, returns User object
- `require_teacher` — wraps `get_current_user`, raises 403 if not teacher

**Error Handling:**
- Raise `HTTPException` from services for client errors (400, 403, 404)
- Use a global exception handler in `main.py` for unhandled errors
- Always return consistent error shape: `{"detail": "message"}`

### What to Avoid

- Business logic inside routers
- DB imports inside endpoints
- Mixing service responsibilities (one service = one domain)

---

## Phase 2 — Database Design

**Objective:** Build a schema that will not break when features grow.

### Core Entities

| Table | Purpose |
|---|---|
| `users` | All accounts — teachers and students |
| `roles` | Role definitions (teacher, student) |
| `content` | Top-level learning material (teacher-owned) |
| `media` | File metadata — audio, video, image |
| `articles` | Rich text bodies attached to content |
| `highlights` | Text anchors within an article |
| `popups` | Rich annotations linked to a highlight |
| `expandable_sections` | Ordered, togglable sections within an article |

### Key Relationships

```
users (role_id) → roles
content (teacher_id) → users
content ← media (many-to-many via content_media)
content → articles (one-to-many)
articles → highlights (one-to-many)
highlights → popups (one-to-one)
popups (media_id) → media (optional)
articles → expandable_sections (one-to-many)
```

### Highlight Anchoring Strategy

Do NOT store raw character offsets — they break when the article text is edited.

Use **word-index anchoring**:
- Store `start_word_index` and `end_word_index` (position of words in tokenized text)
- Store `anchor_text` (the actual highlighted phrase) for fallback validation
- On render, re-resolve the anchor — if text has changed and phrase is no longer found, mark highlight as `stale`

### Required Columns on Every Table

```
id            UUID primary key (not integer — avoids enumeration attacks)
created_at    timestamp with timezone, default now()
updated_at    timestamp with timezone, auto-updated
```

### Soft Deletes

Add `deleted_at` (nullable timestamp) to: `content`, `articles`, `highlights`, `popups`.
Never hard-delete — always filter by `deleted_at IS NULL` in queries.

### Indexes to Add

- `users.email` — unique index (used for login lookup)
- `content.teacher_id` — foreign key index
- `content.is_published` — partial index for student queries
- `highlights.article_id` — foreign key index
- `expandable_sections.article_id + order` — composite index for ordered fetches

### What to Avoid

- Storing highlights as raw character positions only
- No `is_published` flag (students will see drafts)
- Mixing media blobs into text columns
- Integer primary keys (use UUID)
- Missing indexes on foreign keys

---

## Phase 3 — Authentication & Authorization

**Objective:** Secure the system at the server — never trust the client.

### Auth Flow

```
POST /auth/login
  → validate email/password
  → return access_token (JWT, 30 min) + refresh_token (7 days)

Every protected request:
  → Authorization: Bearer <access_token>
  → server decodes token → extracts user_id + role
  → injects User object into handler via dependency
```

### Role Permission Matrix

| Action | Teacher | Student |
|---|---|---|
| Create content | Yes | No |
| Edit own content | Yes | No |
| Delete own content | Yes | No |
| Publish content | Yes | No |
| View published content | Yes | Yes |
| View draft content | Own only | No |
| Upload media | Yes | No |
| Create highlights | Yes | No |
| View highlights | Yes | Yes |

### Token Design

```
Payload:
  sub: user_id (UUID string)
  role: "teacher" | "student"
  exp: unix timestamp

Secrets:
  JWT_SECRET_KEY — from environment, min 32 chars, rotated periodically
  JWT_ALGORITHM — HS256
```

### What to Avoid

- Trusting `role` from request body — always read from the token
- Skipping expiration checks
- Storing passwords in plaintext (use `passlib` with bcrypt)
- No refresh token flow (forces re-login every 30 minutes, bad UX)
- Wildcard CORS in production

---

## Phase 4 — API Design

**Objective:** Consistent, predictable, professional endpoints.

### URL Conventions

```
/api/v1/{resource}          collection
/api/v1/{resource}/{id}     single item
/api/v1/{resource}/{id}/{sub-resource}   nested resource
```

### Endpoint Reference

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| POST | /auth/login | No | Any | Get access + refresh tokens |
| POST | /auth/refresh | No | Any | Exchange refresh for new access token |
| GET | /users/me | Yes | Any | Get own profile |
| PATCH | /users/me | Yes | Any | Update own profile |
| POST | /content | Yes | Teacher | Create content unit |
| GET | /content | Yes | Any | List (teachers see all own, students see published) |
| GET | /content/{id} | Yes | Any | Get single content |
| PATCH | /content/{id} | Yes | Teacher | Update content |
| DELETE | /content/{id} | Yes | Teacher | Soft delete content |
| POST | /content/{id}/publish | Yes | Teacher | Publish content |
| POST | /media/presigned-url | Yes | Teacher | Get R2 upload URL |
| POST | /media/confirm | Yes | Teacher | Save metadata after upload |
| POST | /articles | Yes | Teacher | Create article |
| GET | /articles/{id} | Yes | Any | Get article with highlights |
| PATCH | /articles/{id} | Yes | Teacher | Update article body |
| POST | /highlights | Yes | Teacher | Create highlight on article |
| GET | /highlights/{id} | Yes | Any | Get highlight with popup |
| DELETE | /highlights/{id} | Yes | Teacher | Delete highlight |
| POST | /highlights/{id}/popup | Yes | Teacher | Attach popup to highlight |
| PATCH | /expandable/{id} | Yes | Teacher | Update section |
| POST | /expandable/{id}/reorder | Yes | Teacher | Change section order |

### Standard Response Shape

Success:
```json
{
  "data": { ... },
  "message": "optional success message"
}
```

Error:
```json
{
  "detail": "human-readable error message"
}
```

### Pagination

All list endpoints accept:
```
?page=1&page_size=20
```
Response includes:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### What to Avoid

- Inconsistent casing (`camelCase` vs `snake_case` — pick `snake_case` and stick to it)
- Returning full DB objects with sensitive fields (always use response schemas)
- No pagination on list endpoints
- Using DELETE for soft-delete (use it, but implement as soft)

---

## Phase 5 — Media System (Cloudflare R2)

**Objective:** Handle file uploads without routing files through the backend server.

### Upload Flow

```
1. Frontend requests presigned URL:
   POST /media/presigned-url
   Body: { filename, mime_type, size_bytes }
   Response: { upload_url, file_key, expires_at }

2. Frontend uploads directly to R2:
   PUT {upload_url}
   Body: raw file bytes

3. Frontend confirms upload:
   POST /media/confirm
   Body: { file_key }
   Response: { media_id, public_url }
```

### What Gets Stored in DB

```
media:
  id            UUID
  file_key      string (R2 object key)
  filename      original filename (sanitized)
  mime_type     e.g. "video/mp4"
  size_bytes    integer
  uploader_id   FK → users
  is_public     boolean
  created_at    timestamp
```

### File Validation Rules

| Type | Allowed MIME Types | Max Size |
|---|---|---|
| Image | image/jpeg, image/png, image/webp | 10 MB |
| Video | video/mp4, video/webm | 500 MB |
| Audio | audio/mpeg, audio/ogg | 50 MB |
| Document | application/pdf | 20 MB |

### What to Avoid

- Uploading files through the FastAPI backend (kills performance)
- Storing files as blobs in PostgreSQL
- Public access to all files by default (use signed URLs for private content)
- No file type validation (never trust the extension — validate MIME type)
- Predictable file keys (use UUID-based keys, not original filenames)

---

## Phase 6 — Highlight System

**Objective:** Build the core differentiating feature with long-term stability.

### Data Model

```
highlights:
  id              UUID
  article_id      FK → articles
  anchor_text     string (the highlighted phrase, stored verbatim)
  start_word_idx  integer (word position in tokenized article body)
  end_word_idx    integer
  color           string (hex code or enum)
  is_stale        boolean (true when anchor_text no longer found in article)
  created_by      FK → users

popups:
  id              UUID
  highlight_id    FK → highlights (one-to-one)
  title           string (optional)
  body            text
  media_id        FK → media (optional)
```

### Anchor Resolution Algorithm

On article render:
1. Tokenize article body into words
2. For each highlight, search for `anchor_text` sequence starting at `start_word_idx`
3. If found at stored index → render normally
4. If not found at stored index → search entire article for the phrase
5. If found elsewhere → update `start_word_idx`, render with warning
6. If not found anywhere → mark `is_stale = true`, render highlight as broken

### Edge Cases to Handle

| Case | Handling |
|---|---|
| Two overlapping highlights | Allow — render with z-index layering |
| Article body edited | Re-resolve anchors on next fetch, mark stale if unresolvable |
| Popup with no media | Allowed — media is optional |
| Popup with video | Render inline player |
| Highlight deleted | Cascade delete popup |

### What to Avoid

- Storing only character offset (breaks on any text edit)
- Not handling the stale state (causes invisible highlights)
- Allowing highlights that span across section boundaries
- No cascade delete from highlight to popup

---

## Phase 7 — Expandable Content

**Objective:** Let teachers structure articles into collapsible learning sections.

### Data Model

```
expandable_sections:
  id              UUID
  article_id      FK → articles
  title           string
  body            text
  order           integer (1-based, unique within article)
  is_visible      boolean (default true)
  created_by      FK → users
```

### Reorder Logic

When a teacher reorders sections:
1. Accept new ordered list of section IDs
2. Validate all IDs belong to the same article
3. Reassign `order` values in a single transaction
4. Never allow gaps in order sequence

### Visibility Control

- `is_visible = false` → section hidden from students, visible to teacher with indicator
- Teachers can toggle any section's visibility independently of others

### What to Avoid

- Hardcoding section order in application logic
- Allowing order gaps (makes rendering unpredictable)
- No visibility control (forces teachers to delete instead of hide)
- Storing order client-side only (reorder must be persisted)

---

## Phase 8 — Deployment

**Objective:** Get a live URL early and keep it deployable at every step.

### Infrastructure Stack

| Service | Purpose |
|---|---|
| Render | FastAPI app hosting (free tier OK for MVP) |
| Neon | PostgreSQL (serverless, free tier) |
| Cloudflare R2 | File storage |
| GitHub | Source control + Render auto-deploy trigger |

### Environment Variables (Required)

```
APP_ENV=production
SECRET_KEY=<strong random string, min 32 chars>
DATABASE_URL=postgresql://...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
ALLOWED_ORIGINS=https://your-frontend.com
```

### Deployment Checklist

- [ ] `DEBUG=False` in production
- [ ] `ALLOWED_ORIGINS` set to exact frontend domain (no wildcard)
- [ ] Database URL points to Neon, not local Postgres
- [ ] All secrets set as environment variables in Render dashboard
- [ ] Alembic migrations run before startup
- [ ] Health check endpoint at `GET /health` returns `{"status": "ok"}`
- [ ] Render deploy hook connected to GitHub `main` branch

### Production Startup Command

```
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### What to Avoid

- Deploying for the first time at the end of the project
- Hardcoding any value that differs between environments
- Running `init_db.py` in production (use Alembic only)
- No health check endpoint (Render needs this)

---

## Phase 9 — Testing & Validation

**Objective:** Catch bugs before they reach the deployed URL.

### Test Priority Order

1. Auth flows (login, bad password, expired token, wrong role)
2. Permission enforcement (student trying teacher actions)
3. Content visibility (student cannot see drafts)
4. Highlight creation and anchor resolution
5. Media upload flow (presigned URL → confirm)
6. Expandable section ordering

### Test Structure

```
tests/
├── test_auth.py          login, refresh, permission checks
├── test_content.py       CRUD, publish/unpublish, visibility rules
├── test_highlights.py    create, anchor resolution, stale detection
├── test_media.py         presigned URL generation, confirm flow
└── test_expandable.py    CRUD, reorder, visibility toggle
```

### Testing Rules

- Use a separate test database (`TEST_DATABASE_URL` in env)
- Reset DB state between test runs (use transactions rolled back after each test)
- Never mock the database — test against a real Postgres instance
- Test both happy path AND failure cases for every endpoint

### What to Avoid

- Only testing happy paths
- Mocking the database (masks real query bugs)
- Skipping permission tests (most critical category)
- Testing only after the feature is "done" (test during development)

---

## Security Audit Order

Run this audit before any public deployment or submission.

### 1. Git History Check

```bash
git log --all --oneline
git grep -n "SECRET\|PASSWORD\|API_KEY" $(git log --all --pretty=format:"%H")
```

If any secrets are found: rotate them immediately, then use `git filter-branch` or BFG Repo Cleaner to scrub history.

### 2. .gitignore Verification

Confirm these are blocked:
- `.env`
- `*.pem`, `*.key`
- `media/`
- `logs/`
- `__pycache__/`
- `alembic/versions/*.pyc`

### 3. Database Access Control

- Each user can only read their own data (enforce in service layer via `WHERE user_id = current_user.id`)
- Students can only see content where `is_published = true` AND `deleted_at IS NULL`
- Teachers can only edit/delete their own content (check `content.teacher_id == current_user.id`)

### 4. Secrets Location Audit

- No API keys in any `.py` file
- No hardcoded database URLs
- No JWT secret in source code
- All secrets loaded from environment via `config.py`

### 5. Rate Limiting

Add `slowapi` to protect:
- `POST /auth/login` — max 5 requests/minute per IP
- `POST /auth/refresh` — max 10 requests/minute per IP
- `POST /media/presigned-url` — max 20 requests/minute per user

### 6. CORS Lockdown

In `main.py`:
```python
# Development
allow_origins=["http://localhost:3000"]

# Production — exact domain only, no wildcard
allow_origins=[settings.ALLOWED_ORIGINS]
```

### 7. Input Validation

- All request bodies validated via Pydantic schemas
- File uploads: validate MIME type server-side (never trust Content-Type header alone)
- UUIDs: validate format before DB query (prevents malformed ID attacks)
- Text fields: enforce `max_length` on all string schemas

---

## Final Submission Checklist

### Code Quality
- [ ] Clean folder structure matching this document
- [ ] No business logic inside routers
- [ ] Service layer present and used
- [ ] All endpoints use response schemas (no raw DB objects returned)
- [ ] No hardcoded strings — enums used for roles and statuses

### Security
- [ ] No secrets in source code or git history
- [ ] JWT validation on all protected routes
- [ ] Role enforcement on teacher-only endpoints
- [ ] Students cannot access unpublished content
- [ ] CORS locked to specific origins

### Features
- [ ] Auth (login, token refresh) works
- [ ] Content CRUD + publish workflow works
- [ ] Highlight creation and rendering works
- [ ] Expandable sections reorder correctly
- [ ] Media upload via presigned URL works

### Deployment
- [ ] API deployed to live URL (Render)
- [ ] Database on Neon (not local)
- [ ] All env vars set in Render dashboard
- [ ] Health check endpoint responds

### Repository
- [ ] README explains how to run locally
- [ ] `.env.example` has all required variables
- [ ] No `.env` committed
- [ ] Commits are clean with meaningful messages
- [ ] Alembic migrations present for all schema changes

---

## Build Order

Always build in this sequence — each phase depends on the previous:

```
1. Folder structure + git setup
2. Config + environment variables
3. Database session + base model
4. User model + auth service (foundation for all permission checks)
5. Content model + service
6. Article model + service
7. Highlight + popup models + service (core feature)
8. Expandable sections + service
9. Media system + R2 integration
10. All endpoint wiring
11. Alembic migrations
12. Deploy
13. Tests
14. Security audit
```

> Do not start step N+1 until step N works end-to-end.
