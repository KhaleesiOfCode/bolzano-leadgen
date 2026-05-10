# Deployment Documentation

## Current State

**No production deployment exists.** The system runs locally only.

## Local Development

### Backend Setup

```powershell
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env file
copy .env.example .env
# Edit .env with your API keys

# Run server
uvicorn app.main:app --reload
# → http://127.0.0.1:8000
# → http://127.0.0.1:8000/docs (Swagger UI)
```

### Frontend Setup

```powershell
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Standalone Scraper (no server needed)

```powershell
python scripts/scrape_bolzano.py
```

## Build System

### Backend
- **Runtime:** `uvicorn app.main:app` (ASGI)
- **No build step** — Python runs directly
- **No Dockerfile**

### Frontend
- **Build:** `npm run build` → outputs to `frontend/.next/`
- **Production start:** `npm start` (Next.js production server on port 3000)
- **Static export:** Not configured (`next.config.ts` is empty — no `output: "export"`)

## Deployment Options (Theoretical)

### Option A: VPS (Vultr/Hetzner/Netcup) — Recommended for MVP

| Component | How |
|---|---|
| Backend | `systemd` service running `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Frontend | `npm run build && npm start` behind nginx reverse proxy |
| Database | SQLite file on disk (backup via cron) |
| Domain | nginx reverse proxy (e.g., `leads.yourdomain.com` → port 3000) |

### Option B: Fly.io / Railway

- Both support FastAPI + Next.js deployments
- Need Dockerfile (not yet created)
- SQLite won't work on ephemeral filesystems — need to use a persistent volume or switch to PostgreSQL

### Option C: Render

- Supports both Python web services and static sites
- Same SQLite persistence issue as Fly.io

## Environment Variables

| Variable | Required? | Description |
|---|---|---|
| `DATABASE_URL` | No | Defaults to `sqlite:///data/leads.db` |
| `GOOGLE_PLACES_API_KEY` | No (recommended) | For website enrichment |
| `HUNTER_API_KEY` | No | For email enrichment |
| `LOG_LEVEL` | No | `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) |

## Operational Caveats

### SQLite in Production
- **Do NOT deploy with SQLite** if multiple workers/processes access the DB simultaneously
- SQLite is single-writer — concurrent API requests will cause `database is locked` errors
- Migration to PostgreSQL is needed before any multi-user deployment

### CORS
- Currently allows `localhost` and `127.0.0.1` only
- Must update CORS regex for any custom domain deployment

### No HTTPS
- Dev mode uses HTTP
- Production must front with nginx/Caddy for TLS termination

### No Secrets Management
- API keys stored in `.env` file in project root
- No encryption at rest for `.env`

## Scaling Assumptions

- Single user / small team (1-5 people)
- Database size < 100 MB (South Tyrol has ~5-10K businesses)
- Scraping frequency: daily at most
- No concurrent scrape + API access expected

## Rollback Concerns

- No database migration versioning — rollback requires manual `ALTER TABLE` or SQLite backup restore
- No git tag/deploy version tracking
- Recommended: copy `data/leads.db` before each major scrape
