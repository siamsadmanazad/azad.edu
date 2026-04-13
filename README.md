# Azad.Edu — Backend API

Backend for an interactive teaching platform. Teachers create multimedia content with highlighted articles and popup explanations. Students consume published content through a role-enforced API.

- **Live API:** `https://azad-edu.onrender.com`
- **Interactive docs:** `https://azad-edu.onrender.com/docs`
- **GitHub:** `https://github.com/siamsadmanazad/azad.edu`

---

## Tech Stack

| Layer | Technology |
|---|---|
| API framework | FastAPI |
| Database | PostgreSQL (Neon in production) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | JWT via python-jose |
| Password hashing | bcrypt via passlib |
| File storage | Cloudflare R2 (S3-compatible) |
| Validation | Pydantic v2 |
| Rate limiting | slowapi |
| Deployment | Render |

---

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ (or use Docker — see below)

---

## Quickstart (with Docker)

The fastest way to get a local database running:

```bash
# Start PostgreSQL
docker-compose up -d

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env and fill in SECRET_KEY (min 32 chars) — leave DATABASE_URL as-is for Docker

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

API is now running at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing key — minimum 32 characters |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ALGORITHM` | No | JWT algorithm — default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token lifetime — default `1440` (24h) |
| `ALLOWED_ORIGINS` | No | CORS origins as JSON array — default `["*"]` |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | For uploads | R2 access key |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | For uploads | R2 secret key |
| `CLOUDFLARE_R2_BUCKET_NAME` | For uploads | R2 bucket name |
| `CLOUDFLARE_R2_ENDPOINT_URL` | For uploads | R2 endpoint (`https://<account>.r2.cloudflarestorage.com`) |
| `R2_PUBLIC_URL` | For uploads | Public URL base for served files |

R2 variables are only required if you're testing the media upload flow. All other features work without them.

---

## Running Migrations

```bash
# Apply all migrations (creates tables and enums)
alembic upgrade head

# Check current migration state
alembic current

# Create a new migration after model changes
alembic revision --autogenerate -m "describe your change"
```

The database is seeded with `teacher` and `student` roles automatically on first startup.

---

## Testing the API

There is no frontend for this project. Use one of the following to test the full setup:

### Swagger UI (recommended)

Visit `https://azad-edu.onrender.com/docs` (or `http://localhost:8000/docs` locally).

Core flow to verify everything works:
1. `POST /api/v1/auth/register` — create a teacher account (set `role` to `teacher`)
2. `POST /api/v1/auth/login` — get a JWT token
3. Click **Authorize** (top right) and paste the token as `Bearer <token>`
4. `POST /api/v1/content` — create a content unit
5. `POST /api/v1/articles` — add an article to that content
6. `POST /api/v1/content/{id}/publish` — publish it
7. `GET /api/v1/content/{id}/view` — full page render with all nested data

### REST Client

Import the API into **Postman** or **Bruno** using the OpenAPI spec at:
```
https://azad-edu.onrender.com/openapi.json
```

---

## Running Tests

```bash
pytest app/tests/
```

Tests use the same database defined in `DATABASE_URL`. Run against a local or test-specific PostgreSQL instance — not production.

---

## API Overview

All endpoints are under `/api/v1/`. Authentication uses `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register as teacher or student |
| `POST` | `/auth/login` | Login — returns JWT access token |

### Content

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/content` | Teacher | Create content unit |
| `GET` | `/content` | Any | List content (`?status=draft\|published`, `?skip=`, `?limit=`) |
| `GET` | `/content/{id}` | Any | Get content unit |
| `PATCH` | `/content/{id}` | Teacher | Update title/description |
| `DELETE` | `/content/{id}` | Teacher | Soft delete |
| `POST` | `/content/{id}/publish` | Teacher | Publish |
| `POST` | `/content/{id}/unpublish` | Teacher | Unpublish |
| `GET` | `/content/{id}/view` | Any | Full page render — all media, articles, highlights, popups, expandable sections |
| `GET` | `/content/{id}/media` | Any | Ordered media list |

### Media

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/media/presigned-url` | Teacher | Get R2 upload URL |
| `POST` | `/media/confirm` | Teacher | Save file metadata after upload |
| `POST` | `/media/youtube` | Teacher | Add YouTube link |
| `POST` | `/media/{id}/attach/{content_id}` | Teacher | Attach media to own content |
| `DELETE` | `/media/{id}` | Teacher | Delete media |

### Articles

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/articles` | Teacher | Create article |
| `GET` | `/articles/by-content/{id}` | Any | List articles (`?skip=`, `?limit=`) |
| `GET` | `/articles/{id}` | Any | Get article |
| `PATCH` | `/articles/{id}` | Teacher | Update article |
| `DELETE` | `/articles/{id}` | Teacher | Delete article |

### Highlights & Popups

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/highlights` | Teacher | Create highlight (anchor_key must be unique per article) |
| `GET` | `/highlights/by-article/{id}` | Any | List highlights |
| `DELETE` | `/highlights/{id}` | Teacher | Delete highlight |
| `GET` | `/highlights/{id}/popup` | Any | Get popup |
| `POST` | `/highlights/{id}/popup` | Teacher | Create popup |
| `PATCH` | `/highlights/{id}/popup` | Teacher | Update popup |

### Expandable Sections

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/expandable` | Teacher | Create section |
| `GET` | `/expandable/by-article/{id}` | Any | List sections (students see visible-only) |
| `PATCH` | `/expandable/{id}` | Teacher | Update section |
| `DELETE` | `/expandable/{id}` | Teacher | Delete section |
| `POST` | `/expandable/reorder/{article_id}` | Teacher | Reorder sections |
| `POST` | `/expandable/{id}/toggle-visibility` | Teacher | Show/hide section |

---

## Media Upload Flow

Media files are uploaded directly to Cloudflare R2 — they never pass through this backend.

```
1. Request a presigned URL:
   POST /media/presigned-url
   { "filename": "intro.mp4", "mime_type": "video/mp4", "size_bytes": 10000000, "media_type": "video" }
   → { "upload_url": "...", "file_key": "uploads/..." }

2. Upload the file directly to R2:
   PUT {upload_url}
   Body: raw file bytes

3. Confirm the upload:
   POST /media/confirm
   { "file_key": "...", "url": "...", "mime_type": "video/mp4", "size_bytes": 10000000, "media_type": "video" }
   → { "id": "...", "url": "...", ... }

4. Attach to content:
   POST /media/{id}/attach/{content_id}?order=0
```

---

## Deployment (Render)

### 1. Create a Render Postgres database

- Go to Render dashboard → **+ New → PostgreSQL**
- Set region to **Singapore (Southeast Asia)**
- Copy the **Internal Database URL** from the Connections section

### 2. Deploy the web service

- Connect your GitHub repo to Render
- Language: **Python 3**
- Build command: `pip install -r requirements.txt`
- Pre-deploy command: `alembic upgrade head`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

### 3. Set environment variables in Render dashboard

All variables from `.env.example` must be set. Key production values:

```
SECRET_KEY=<strong random string, min 32 chars>
DATABASE_URL=<render postgres internal database URL>
ALLOWED_ORIGINS=["https://your-frontend.com"]
DEBUG=False
```

### 4. Health check

Render pings `GET /health` to confirm the service is up. Returns:

```json
{ "status": "ok", "app": "Azad.Edu", "db": "connected" }
```

---

## Project Structure

See [Structure.md](Structure.md) for a full annotated file tree and layer responsibilities.

## Engineering Decisions

See [Documentation.md](Documentation.md) for architectural rationale, design decisions, and the reasoning behind the highlight system and content full view endpoint.
