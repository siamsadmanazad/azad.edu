# Azad.Edu — Approach Documentation

## Overview

Azad.Edu is a backend system for an interactive teaching platform. It enables teachers to create structured, multimedia-rich learning content and allows students to consume it through a controlled, role-based experience.

This document explains the architectural decisions, design rationale, and engineering principles applied throughout the project.

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

This separation ensures that each layer has one responsibility. Business rules never leak into routers, and DB structure never drives API behavior. The result is a codebase that is easy to test, extend, and reason about.

---

## Why This Stack

### FastAPI
Chosen over Django REST Framework or Flask because it offers async-native routing, automatic OpenAPI documentation, and tight Pydantic integration — all with minimal boilerplate. It signals modern Python API development to a technical reviewer.

### PostgreSQL via Neon
Relational integrity is essential here — content belongs to teachers, articles belong to content, highlights belong to articles, and popups belong to highlights. PostgreSQL enforces these relationships at the DB level. Neon provides a cloud-hosted, serverless PostgreSQL instance with a free tier suitable for deployment.

### SQLAlchemy + Alembic
SQLAlchemy provides a clean ORM layer with full control over queries. Alembic manages schema migrations properly — no manual SQL, no `create_all()` in production.

### JWT Authentication
Stateless token-based auth is the right choice for a REST API at this scale. No session storage required. Access tokens carry the user's role, which is validated on every protected request server-side.

### Cloudflare R2
Media files (images, audio, video) are never routed through the backend. The backend generates a presigned URL, the client uploads directly to R2, and only the metadata (file key, URL, mime type, size) is stored in the database. This keeps the backend fast and avoids bandwidth costs.

### Render
Simple, Git-connected deployment with environment variable management and free tier hosting. Chosen for speed of setup and suitability for a live demo deployment.

---

## Highlight System Design

The highlight system is the most technically interesting part of this project.

**The problem:** If highlights are stored as raw character offsets (start index, end index), any edit to the article body — even adding a single character before a highlight — silently corrupts all highlights that follow it.

**The approach:** Highlights are stored using a structured `anchor_key` — a stable identifier that references a specific word or phrase within the article. The frontend resolves this anchor at render time. This means article edits do not break existing highlights unless the anchored word itself is removed.

Each highlight links to a popup explanation, which optionally carries a media attachment. This creates a clean, stable chain:

```
Article → Highlight (anchor_key) → Popup → Media (optional)
```

**Anchor key convention:** Keys follow the format `{slugified-word}-{occurrence-index}`. For example, if the word "সন্দেহ" appears twice in an article, the first becomes `sondehe-1` and the second `sondehe-2`. The key is unique per article — enforced at the database query level before insert.

---

## Content Full View — Single Endpoint for Page Render

The platform renders a single unified page per content unit. Rather than requiring the frontend to make 4–5 separate API calls to assemble the page, a dedicated endpoint returns the complete structure in one response:

**`GET /api/v1/content/{id}/view`**

Response shape:

```
ContentFullView
├── content metadata (title, description, status)
├── media[] (ordered multimedia attachments — images, audio, video, YouTube)
└── articles[]
      ├── article fields (title, body, order)
      ├── highlights[]
      │     ├── anchor_key, display_text
      │     └── popup (text + optional media)
      └── expandable_sections[] (visible only, for students)
```

This was a deliberate design decision — the student view is a read-heavy operation that benefits from a single, well-structured response rather than multiple round trips.

---

## Role-Based Content Isolation

Two roles: **Teacher** and **Student**. All enforcement happens server-side — the frontend role is never trusted.

| Action | Teacher | Student |
|---|---|---|
| Create / edit / delete content | Yes | No |
| View draft content | Own content only | Never |
| View published content | Yes | Yes |
| Upload media | Yes | No |
| Add highlights and popups | Yes | No |
| View expandable sections | All (including hidden) | Visible only |

**Expandable section visibility** is enforced at the query level — hidden sections are filtered out before the response is built, not after. Students structurally cannot receive hidden sections even if they guess the section ID via the list endpoint.

**Unpublished content** is filtered at the query level as well. A student calling `GET /content/{id}/view` on a draft returns 404 — not 403 — to avoid leaking the existence of unpublished material.

---

## API Design

All endpoints are versioned under `/api/v1/`. Key endpoint groups:

| Group | Base Path | Purpose |
|---|---|---|
| Auth | `/auth` | Register, login |
| Users | `/users` | Profile read and update |
| Content | `/content` | CRUD, publish workflow, full view, media list |
| Media | `/media` | Presigned upload, YouTube, attach to content |
| Articles | `/articles` | CRUD, list by content |
| Highlights | `/highlights` | CRUD, popup create/read/update |
| Expandable | `/expandable` | CRUD, reorder, toggle visibility |

Notable content endpoints:
- `GET /content/{id}/view` — full page render in one call
- `GET /content/{id}/media` — ordered multimedia list
- `GET /highlights/{id}/popup` — student popup fetch on click

---

## Security Approach

- Passwords hashed with **bcrypt** — never stored in plain text
- JWT tokens validated on every protected request — no trust from the frontend
- Role checks enforced at the dependency level — teachers and students cannot access each other's scoped endpoints
- Unpublished content filtered at query level — students structurally cannot receive draft data
- Expandable section visibility filtered at query level — hidden sections never reach the student
- All secrets loaded from environment variables via `pydantic-settings` — nothing hardcoded
- CORS restricted to known origins in production
- Rate limiting applied to login and signup endpoints

---

## Scalability Considerations

- Service layer is stateless — horizontal scaling is straightforward
- Media handled via presigned URLs — no backend bottleneck for file uploads
- Full content view assembled in a single DB session — no N+1 query issues
- Database queries scoped with proper filtering and indexed foreign keys
- Soft deletes on content, articles, and expandable sections — referential integrity preserved
- Publish state enforced at query level — no post-fetch filtering required
- Versioned API (`/api/v1/`) — future breaking changes can be introduced cleanly

---

## Code Quality Principles Applied

- Single responsibility per file and per function
- No business logic in routers, no HTTP logic in services
- Consistent error responses using FastAPI's `HTTPException`
- Environment-driven configuration with no hardcoded values
- Clean folder structure that mirrors the domain model
- Schemas built bottom-up to avoid circular imports (Popup → Highlight → Article → Content)

---

## Closing

This project was built with the intent of demonstrating engineering judgment — not just feature delivery. The decisions documented here reflect an understanding of why clean architecture matters at scale, how to design a system that is stable under real-world conditions, and how to ship something that a production team could confidently extend.

The highlight interaction system and the single-endpoint full content view are the two core technical contributions — both designed to solve real problems that naive implementations would have missed.
