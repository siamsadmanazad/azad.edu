# Azad.Edu — Codebase Structure

A reference map of every file and layer in the project. Use this to find where logic lives and where new code should go.

---

## Folder Tree

```
azad_edu/
│
├── app/
│   ├── main.py                         # FastAPI app factory — registers routers, middleware, lifespan
│   │
│   ├── core/                           # App-wide infrastructure — no business logic
│   │   ├── config.py                   # Reads .env via pydantic-settings; exports Settings singleton
│   │   ├── security.py                 # JWT encode/decode, bcrypt password hashing/verification
│   │   └── dependencies.py             # Shared FastAPI Depends: get_current_user, require_teacher, require_student
│   │
│   ├── db/                             # Database layer — no business logic
│   │   ├── base.py                     # SQLAlchemy DeclarativeBase
│   │   ├── session.py                  # Engine, SessionLocal factory, get_db dependency
│   │   └── init_db.py                  # create_all() + seed_roles() on startup
│   │
│   ├── models/                         # SQLAlchemy ORM models — structure only, no logic
│   │   ├── role.py                     # Role: id, name ("teacher" | "student")
│   │   ├── user.py                     # User: id, email, hashed_password, full_name, role_id, is_active
│   │   ├── content.py                  # Content: id, title, description, status, teacher_id, deleted_at
│   │   │                               # ContentMedia: join table (content_id, media_id, order)
│   │   ├── media.py                    # Media: id, file_key, url, mime_type, size_bytes, media_type, uploader_id
│   │   ├── article.py                  # Article: id, title, body, content_id, order, deleted_at
│   │   ├── highlight.py                # Highlight: id, article_id, anchor_key, display_text
│   │   ├── popup.py                    # Popup: id, highlight_id, text, media_id (one-to-one with Highlight)
│   │   ├── expandable.py               # ExpandableSection: id, article_id, title, body, order, is_visible, deleted_at
│   │   └── __init__.py                 # Imports all models so Alembic/SQLAlchemy can discover them
│   │
│   ├── schemas/                        # Pydantic models — input validation and response shaping only
│   │   ├── auth.py                     # LoginRequest, TokenResponse
│   │   ├── user.py                     # UserCreate, UserRead, UserUpdate
│   │   ├── content.py                  # ContentCreate, ContentUpdate, ContentRead, ContentFullView
│   │   ├── media.py                    # PresignedURLRequest/Response, MediaConfirm, MediaRead, YoutubeMediaCreate
│   │   ├── article.py                  # ArticleCreate, ArticleUpdate, ArticleRead, ArticleFullRead
│   │   ├── highlight.py                # HighlightCreate, HighlightRead, HighlightWithPopupRead
│   │   ├── popup.py                    # PopupCreate, PopupUpdate, PopupRead
│   │   └── expandable.py               # ExpandableCreate, ExpandableUpdate, ExpandableRead, ExpandableReorderItem
│   │
│   ├── services/                       # Business logic — all rules, DB operations, and workflows live here
│   │   ├── auth_service.py             # login(), register(), token creation
│   │   ├── user_service.py             # get_by_email(), update_profile()
│   │   ├── content_service.py          # CRUD, publish/unpublish, get_full_view(), get_media()
│   │   ├── media_service.py            # generate_presigned_url(), confirm_upload(), add_youtube(), delete_media()
│   │   ├── article_service.py          # CRUD, get_by_content() with pagination
│   │   ├── highlight_service.py        # create() with anchor_key uniqueness check, get_popup(), popup CRUD
│   │   └── expandable_service.py       # CRUD, reorder(), toggle_visibility(), visible_only filter for students
│   │
│   ├── api/
│   │   ├── deps.py                     # pagination_params dependency (skip, limit query params)
│   │   └── v1/
│   │       ├── router.py               # Aggregates all endpoint routers into one APIRouter under /api/v1
│   │       └── endpoints/
│   │           ├── auth.py             # POST /auth/login, POST /auth/register
│   │           ├── users.py            # GET /users/me, PATCH /users/me
│   │           ├── content.py          # Full content CRUD + publish workflow + /view + /media
│   │           ├── media.py            # Presigned URL flow, YouTube, attach to content, delete
│   │           ├── articles.py         # Article CRUD + list by content
│   │           ├── highlights.py       # Highlight CRUD + popup GET/POST/PATCH
│   │           └── expandable.py       # Expandable section CRUD + reorder + toggle visibility
│   │
│   ├── constants/
│   │   ├── roles.py                    # RoleEnum: TEACHER = "teacher", STUDENT = "student"
│   │   └── status.py                   # ContentStatus: DRAFT, PUBLISHED, ARCHIVED — MediaType: IMAGE, AUDIO, VIDEO, YOUTUBE
│   │
│   ├── utils/
│   │   ├── file_handler.py             # MIME type validation, filename sanitization
│   │   └── validators.py               # is_valid_anchor_key(), is_valid_youtube_url()
│   │
│   └── tests/
│       ├── test_auth.py                # Register, login, token validation, /users/me
│       └── test_content.py             # Content CRUD, publish/unpublish, student access enforcement
│
├── alembic/
│   ├── env.py                          # Alembic config — reads DATABASE_URL from settings, imports all models
│   ├── script.py.mako                  # Migration file template
│   └── versions/
│       └── 0001_initial_schema.py      # Initial schema: all 9 tables, indexes, FK constraints, enums
│
├── scripts/
│   └── create_superuser.py             # CLI script to seed the first teacher account
│
├── alembic.ini                         # Alembic configuration file
├── docker-compose.yml                  # Local dev: PostgreSQL 15 container
├── requirements.txt                    # All Python dependencies pinned
├── .env.example                        # Template for required environment variables (no real values)
└── .gitignore                          # Blocks .env, __pycache__, *.pyc
```

---

## Layer Responsibilities

### Request Flow

```
HTTP Request
    ↓
endpoints/  (receive, validate via schema, call service, return response)
    ↓
services/   (business logic, DB queries, permission checks, error raising)
    ↓
models/     (ORM — SQLAlchemy talks to PostgreSQL)
    ↓
PostgreSQL
```

### Layer Rules

| Layer | Owns | Does not own |
|---|---|---|
| `endpoints/` | Route handler, schema in/out, auth dependencies | Any if/else logic, direct DB queries |
| `services/` | All business rules, DB operations, HTTP errors | Response formatting, schema imports |
| `models/` | Table columns, relationships, indexes | Any logic or validation |
| `schemas/` | Field types, constraints, response shapes | DB queries, service calls |
| `core/` | Config, JWT, password hashing, auth dependencies | Domain logic |
| `utils/` | Pure stateless helper functions | DB access, service calls |

### Cross-Layer Dependency Rule

```
endpoints → services        OK
services  → models          OK
core      → (nothing app-specific)  OK

endpoints → models directly  NOT OK
services  → schemas          NOT OK
models    → services         NOT OK (circular)
```

---

## Schema Import Order

Pydantic schemas follow a strict bottom-up import order to avoid circular references:

```
popup.py
    ↑
highlight.py  (imports PopupRead)
    ↑
expandable.py
    ↑
article.py    (imports HighlightWithPopupRead, ExpandableRead)
    ↑
content.py    (imports ArticleFullRead, MediaRead)
```
