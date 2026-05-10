# Architecture Documentation

## High-Level Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Next.js 15  │────▶│   FastAPI (8000) │────▶│   SQLite DB    │
│  (Port 3000) │     │   uvicorn        │     │  data/leads.db │
│  SPA (client)│     │   No background  │     │                │
└─────────────┘     │   job system      │     └────────────────┘
      │             └────────┬─────────┘
      │                      │
      │             ┌────────▼─────────┐     ┌────────────────┐
      │             │  Overpass API    │     │  Google Places │
      │             │  (OSM scraping)  │     │  API (enrich)  │
      │             └──────────────────┘     └────────────────┘
      │             ┌──────────────────┐     ┌────────────────┐
      │             │  Website Scrape  │     │  Hunter.io     │
      │             │  (beautifulsoup) │     │  (email)       │
      │             └──────────────────┘     └────────────────┘
```

## Application Structure

```
bolzano-leadgen/
├── app/                          # Python backend
│   ├── __init__.py               # Empty package marker
│   ├── main.py                   # FastAPI app, CORS, startup migration
│   ├── config.py                 # Env loading, paths, constants
│   ├── database.py               # SQLAlchemy engine, session, migration
│   ├── models.py                 # Lead ORM model + NEW_COLUMNS
│   ├── schemas.py                # Pydantic v2 request/response models
│   ├── routes.py                 # All 18 API endpoints
│   ├── osm_scraper.py            # Overpass API query builder + parsers
│   ├── business_classifier.py    # Tag/name → group/subgroup mapping
│   ├── website_classifier.py     # URL domain → type classification
│   ├── lead_scoring.py           # Score calculation (0-30)
│   ├── email_extractor.py        # Website scraping + Hunter.io
│   └── google_places.py          # Places API text search + details
├── frontend/
│   └── src/
│       ├── lib/api.ts            # API client + TypeScript types
│       └── app/
│           ├── layout.tsx        # Server root layout
│           ├── globals.css       # @import "tailwindcss"
│           ├── page.tsx          # Dashboard (stats + scrape controls)
│           ├── leads/
│           │   ├── page.tsx      # Filterable lead list table
│           │   └── [id]/
│           │       └── page.tsx  # Lead detail + actions
├── scripts/
│   └── scrape_bolzano.py        # Standalone OSM scrape script
├── data/
│   └── leads.db                 # SQLite database (auto-created)
├── docs/                         # Engineering documentation
├── .env.example
├── requirements.txt
└── README.md
```

## Module Responsibilities

### Backend Modules

| Module | Responsibility | Key Functions |
|---|---|---|
| `main.py` | App bootstrap, CORS, DB migration on startup | `FastAPI()`, `CORSMiddleware`, `migrate_database()` |
| `config.py` | Env var loading, path resolution | `load_dotenv()`, `BASE_DIR`, `DATABASE_URL` |
| `database.py` | SQLAlchemy engine, session factory | `get_db()` (FastAPI dependency), `migrate_database()` |
| `models.py` | Lead table schema + late-migration columns | `Lead` (42 cols), `NEW_COLUMNS` dict |
| `schemas.py` | Pydantic validation for all endpoints | `LeadCreate`, `LeadUpdate`, `LeadResponse`, `StatsResponse` |
| `routes.py` | All 18 HTTP endpoints | See API Reference for complete endpoint list |
| `osm_scraper.py` | OSM Overpass query builder + element parser | `_build_query()`, `_element_to_lead()`, `scrape_area()`, `scrape_bolzano()`, `scrape_south_tyrol()`, `scrape_city()` |
| `business_classifier.py` | OSM tag → business group/subgroup mapping | `classify_business()` (exact match → partial → name heuristic → fallback) |
| `website_classifier.py` | URL → type classification | `classify_url()`, `score_candidate()` |
| `lead_scoring.py` | Lead priority scoring algorithm | `calculate_score()` (max 30) |
| `email_extractor.py` | Website scraping for emails + phones | `extract_email_from_website()`, `enrich_lead_with_email()`, `hunter_email_search()` |
| `google_places.py` | Google Places Text Search + Place Details | `search_business_website()`, `search_digital_agencies()` |

### Frontend Components

| Component | Route | Key Responsibilities |
|---|---|---|
| `RootLayout` | `/` (shared) | HTML shell, Tailwind import, metadata |
| `Dashboard` | `/` | Stats cards, scrape buttons, quick filters, category breakdown |
| `LeadsPage` | `/leads` | Filter panel (6 sections), paginated table, column sorting |
| `LeadDetail` | `/leads/[id]` | Full lead info, enrich actions, status management, notes |

## Data Flow: Full Scrape + Enrich Cycle

```
1. User clicks "Scrape Bolzano" (frontend)
2. POST /scrape/osm/bolzano (backend)
3. osm_scraper.scrape_bolzano()
   ├── _build_query(BOLZANO_BBOX) → Overpass QL
   ├── POST https://overpass-api.de/api/interpreter
   ├── For each element with "name" tag:
   │   ├── classify_business(tags, name) → group/subgroup/confidence
   │   ├── _verify_website(url) → HEAD check
   │   ├── classify_url(url) → official/social/booking/directory
   │   └── calculate_score(lead_data) → 0-30
   └── Return list[dict]
4. For each lead: upsert by (osm_type, osm_id)
5. DB commit
6. Return {leads_found, created, updated}

--- Later (manual or batch) ---

7. POST /leads/{id}/search-website (Google Places enrichment)
   ├── search_business_website(name, city, category)
   │   ├── Multiple text queries with variations
   │   ├── _get_place_details() for each result
   │   └── Score + classify discovered websites
   └── Store candidate_websites on lead

8. POST /leads/{id}/enrich (email extraction)
   ├── enrich_lead_with_email(lead_data)
   │   ├── extract_email_from_website(url)
   │   │   ├── Scrape homepage + 18 contact paths
   │   │   ├── Regex email extraction + mailto: parsing
   │   │   ├── Regex phone extraction + tel: parsing
   │   │   └── Stop at first email found
   │   └── Update lead with email/phone

9. POST /leads/{id}/enrich-hunter (optional)
   ├── Extract domain from lead website
   ├── hunter_email_search(domain, api_key)
   └── Update lead with Hunter.io email
```

## Dependency Structure

```
main.py
 └── routes.py
      ├── osm_scraper.py
      │    ├── business_classifier.py
      │    └── website_classifier.py
      ├── lead_scoring.py
      ├── email_extractor.py
      │    └── (beautifulsoup, requests)
      ├── google_places.py
      │    └── website_classifier.py
      └── (models.py, schemas.py, database.py)
```

**No circular dependencies.** Clean layered architecture: routes → services → classifiers.

## Architecture Strengths

- **Minimal dependency surface** — only 8 Python packages, 4 frontend deps
- **Clear separation of concerns** — scraping, classification, enrichment, and scoring are isolated modules
- **FastAPI-first design** — auto OpenAPI docs, Pydantic validation, dependency injection

## Architecture Weaknesses

- **No background task system** — long-running scrapes block the HTTP request thread (timeout risk for large areas)
- **SQLite single-writer bottleneck** — concurrent API requests and scrapes will lock
- **Duplicated type definitions** — Python models + Pydantic schemas + TypeScript interfaces all maintained separately
- **No service layer** — business logic lives in routes.py (fat controller pattern)
- **No repository pattern** — direct SQLAlchemy queries in routes
- **No caching** — stats re-queried on every dashboard load
