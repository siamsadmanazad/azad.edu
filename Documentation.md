# Azad.Edu — Engineering Approach

This document explains the architectural decisions, design rationale, and engineering principles behind the Azad.Edu backend. It is the "why" document — the code itself shows what was built; this explains the reasoning behind how it was built.

---

## Architectural Approach

The backend follows a strict layered architecture:

```
Request → Router → Service → Model → Database
                ↓
           Schema (validation in / out)
```

| Layer | Role |
|---|---|
| **Router** | Receives HTTP request, delegates to service, returns response |
| **Service** | All business logic, DB operations, and workflows |
| **Model** | SQLAlchemy table definitions — structure only |
| **Schema** | Pydantic input/output validation — no logic |

This separation ensures each layer has one responsibility. Business rules never leak into routers, and DB structure never drives API behavior. The result is a codebase that is easy to test, extend, and reason about.

---

## Why This Stack

### FastAPI
Chosen over Django REST Framework or Flask because it offers async-native routing, automatic OpenAPI documentation (`/docs`, `/redoc`), and tight Pydantic integration — all with minimal boilerplate. It is also the most commonly evaluated stack at backend-focused companies, which matters for a hiring submission.

### PostgreSQL via Neon
Relational integrity is essential here — content belongs to teachers, articles belong to content, highlights belong to articles, and popups belong to highlights. PostgreSQL enforces these relationships at the DB level. Neon provides serverless PostgreSQL with a free tier suitable for deployment without infrastructure overhead.

### SQLAlchemy + Alembic
SQLAlchemy provides a clean ORM layer with full control over queries. Alembic manages schema migrations properly — no manual SQL, no `create_all()` in production. The initial schema migration (`0001_initial_schema.py`) covers all 9 tables, indexes, and enum types.

### JWT Authentication
Stateless token-based auth is the right choice for a REST API at this scale. No session storage required. Tokens are validated on every protected request server-side. Roles are read from the database — never trusted from the request body.

### Cloudflare R2
Media files (images, audio, video) are never routed through the backend. The backend generates a presigned URL, the client uploads directly to R2, and only the metadata (file key, URL, MIME type, size) is stored in the database. This keeps the backend fast and avoids bandwidth costs regardless of file size.

### Render
Simple, Git-connected deployment with environment variable management and free-tier hosting. Chosen for speed of setup and suitability for a live demo deployment.

---

## Database Schema

### Entities and Purpose

| Table | Purpose |
|---|---|
| `roles` | Role definitions: `teacher`, `student` — seeded on startup |
| `users` | All accounts — role assigned at registration |
| `content` | Top-level learning unit — owned by a teacher, has publish state |
| `content_media` | Join table linking content to media with an `order` column |
| `media` | File metadata for uploads and YouTube links |
| `articles` | Rich text bodies attached to a content unit |
| `highlights` | Named anchors within an article body |
| `popups` | Explanations linked one-to-one with a highlight |
| `expandable_sections` | Ordered, togglable supplementary sections within an article |

### Relationships

```
roles ←── users ───────────────────┐
                                   │
           content ◄───────────────┘ (teacher_id)
               │
               ├──── content_media ───► media
               │
               └──── articles
                         │
                         ├──── highlights
                         │         └──── popups ──── media (optional)
                         │
                         └──── expandable_sections
```

### Design Decisions

**UUIDs for all primary keys** — prevents enumeration attacks where an attacker increments integer IDs to discover resources.

**Soft deletes on content, articles, and expandable sections** — `deleted_at` timestamp column, always filtered by `deleted_at IS NULL`. This preserves referential integrity and allows recovery without risking orphaned child records.

**Enum columns via SQLAlchemy `Enum`** — `ContentStatus` (draft/published/archived) and `MediaType` (image/audio/video/youtube) are enforced at the DB level, not just in application code.

**Indexes** — foreign key columns and the `content.status` column are indexed. The student content feed query (`WHERE status = 'published' AND deleted_at IS NULL`) benefits directly from this.

---

## Highlight System Design

The highlight system is the most technically interesting part of this project.

**The problem:** If highlights are stored as raw character offsets (start index, end index), any edit to the article body — even adding a single character before a highlight — silently corrupts all highlights that follow it.

**The approach:** Highlights are stored using a structured `anchor_key` — a stable identifier that references a specific word or phrase within the article. The frontend resolves this anchor at render time by scanning the article body for the matching word. This means article edits do not break existing highlights unless the anchored word itself is removed.

Each highlight links to a popup explanation, which optionally carries a media attachment. The full chain:

```
Article body
    → Highlight (anchor_key: "sondehe-1")
        → Popup (text, optional media)
```

**Anchor key convention:** Keys follow the format `{slugified-word}-{occurrence-index}`. For example, if the word "সন্দেহ" (transliterated: sondehe) appears twice in an article, the first becomes `sondehe-1` and the second `sondehe-2`. Keys are:
- Validated at input: lowercase letters, numbers, and hyphens only — enforced by `is_valid_anchor_key()` in the schema layer
- Unique per article: enforced at the service layer before insert — duplicate anchor keys in the same article raise a 400

---

## Content Full View — Single Endpoint for Page Render

The platform renders a single unified page per content unit. Rather than requiring the frontend to make 4–5 separate API calls to assemble the page, a dedicated endpoint returns the complete structure in one response:

**`GET /api/v1/content/{id}/view`**

Response shape:

```
ContentFullView
├── content metadata (id, title, description, status, teacher_id)
├── media[]          (ordered multimedia attachments — images, audio, video, YouTube)
└── articles[]
      ├── article fields (title, body, order)
      ├── highlights[]
      │     ├── anchor_key, display_text
      │     └── popup (text + optional media)
      └── expandable_sections[]   (visible-only filter applied for students)
```

This was a deliberate design decision — the student view is a read-heavy operation that benefits from a single, well-structured response rather than multiple round trips. The entire response is assembled in one DB session.

---

## Role-Based Content Isolation

Two roles: **Teacher** and **Student**. All enforcement happens server-side — the frontend role is never trusted.

| Action | Teacher | Student |
|---|---|---|
| Create / edit / delete content | Yes | No |
| View draft content | Own content only | Never (returns 404) |
| View published content | Yes | Yes |
| Upload media | Yes | No |
| Attach media to content | Own content only | No |
| Add highlights and popups | Yes | No |
| View expandable sections | All (including hidden) | Visible only |

**Expandable section visibility** is enforced at the query level — `WHERE is_visible = TRUE` is added when `visible_only=True`. Hidden sections are filtered before the response is built. Students structurally cannot receive hidden sections even via the direct list endpoint.

**Unpublished content** is filtered at the query level. A student calling `GET /content/{id}/view` on a draft returns 404 — not 403 — to avoid leaking the existence of unpublished material.

**Media attachment ownership** is verified at the endpoint level — a teacher cannot attach media to another teacher's content. The endpoint checks `content.teacher_id == current_user.id` before delegating to the service.

---

## API Design

All endpoints are versioned under `/api/v1/`. Rate limiting is applied to auth endpoints via `slowapi`.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | Any | Login — returns JWT access token |
| POST | `/auth/register` | Any | Register as teacher or student |
| GET | `/users/me` | Any | Own profile |
| PATCH | `/users/me` | Any | Update own profile |
| POST | `/content` | Teacher | Create content unit |
| GET | `/content` | Any | List (teachers: own, filterable by status; students: published only) |
| GET | `/content/{id}` | Any | Single content unit |
| PATCH | `/content/{id}` | Teacher | Update title/description |
| DELETE | `/content/{id}` | Teacher | Soft delete |
| POST | `/content/{id}/publish` | Teacher | Set status → published |
| POST | `/content/{id}/unpublish` | Teacher | Set status → draft |
| GET | `/content/{id}/view` | Any | Full page render (media + articles + highlights + popups + expandable) |
| GET | `/content/{id}/media` | Any | Ordered media list for a content unit |
| POST | `/media/presigned-url` | Teacher | Get R2 upload URL |
| POST | `/media/confirm` | Teacher | Save file metadata after upload |
| POST | `/media/youtube` | Teacher | Add YouTube link as media |
| POST | `/media/{id}/attach/{content_id}` | Teacher | Attach media to own content |
| DELETE | `/media/{id}` | Teacher | Delete media (removes from R2 + DB) |
| POST | `/articles` | Teacher | Create article under content |
| GET | `/articles/by-content/{id}` | Any | List articles for a content unit |
| GET | `/articles/{id}` | Any | Single article |
| PATCH | `/articles/{id}` | Teacher | Update article |
| DELETE | `/articles/{id}` | Teacher | Soft delete article |
| POST | `/highlights` | Teacher | Create highlight (validates anchor_key format + uniqueness) |
| GET | `/highlights/by-article/{id}` | Any | All highlights for an article |
| DELETE | `/highlights/{id}` | Teacher | Delete highlight (cascades to popup) |
| GET | `/highlights/{id}/popup` | Any | Get popup for a highlight |
| POST | `/highlights/{id}/popup` | Teacher | Attach popup to highlight |
| PATCH | `/highlights/{id}/popup` | Teacher | Update popup text/media |
| POST | `/expandable` | Teacher | Create expandable section |
| GET | `/expandable/by-article/{id}` | Any | List sections (students see visible-only) |
| PATCH | `/expandable/{id}` | Teacher | Update section |
| DELETE | `/expandable/{id}` | Teacher | Soft delete section |
| POST | `/expandable/reorder/{article_id}` | Teacher | Reorder sections |
| POST | `/expandable/{id}/toggle-visibility` | Teacher | Show/hide section |

**Pagination** — list endpoints accept `?skip=0&limit=20` (limit capped at 100). Teachers can also filter their content list by `?status=draft|published|archived`.

---

## Security Approach

- Passwords hashed with **bcrypt** via `passlib` — never stored in plain text
- JWT tokens validated on every protected request — no trust from the frontend
- Role checks enforced at the dependency level — `require_teacher` and `require_student` are FastAPI `Depends` wrappers that raise 403 before the handler runs
- Unpublished content filtered at query level — students structurally cannot receive draft data
- Expandable section visibility filtered at query level — hidden sections never reach the student
- Media attachment ownership checked at endpoint level — a teacher cannot attach media to another teacher's content
- All secrets loaded from environment variables via `pydantic-settings` — nothing hardcoded
- CORS restricted to known origins via `ALLOWED_ORIGINS` setting
- Rate limiting on login (10/min) and register (5/min) via `slowapi`
- Anchor key format validated at schema level — rejects malformed keys before they reach the DB

---

## Scalability Considerations

- Service layer is stateless — horizontal scaling is straightforward
- Media handled via presigned URLs — no backend bottleneck for file uploads
- Full content view assembled in a single DB session — no N+1 query issues
- Database queries use `offset`/`limit` pagination — no full table scans on list endpoints
- Publish state and visibility enforced at query level — no post-fetch filtering
- Soft deletes preserve referential integrity and avoid cascading issues
- Versioned API (`/api/v1/`) — future breaking changes can be introduced cleanly

---

## Code Quality Principles

- Single responsibility per file and per function
- No business logic in routers, no HTTP logic in services
- Consistent error responses using FastAPI's `HTTPException` — always `{"detail": "message"}`
- Environment-driven configuration — `pydantic-settings` with `.env` file
- Schemas built bottom-up to avoid circular imports: `popup → highlight → article → content`
- Enums used for all status/type values — no raw strings in business logic

---

## Closing

This project was built with the intent of demonstrating engineering judgment — not just feature delivery. The decisions documented here reflect an understanding of why clean architecture matters at scale, how to design a system that is stable under real-world conditions, and how to ship something that a production team could confidently extend.

The highlight interaction system and the single-endpoint full content view are the two core technical contributions — both designed to solve real problems that naive implementations would have missed.
