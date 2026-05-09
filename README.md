# Bolzano LeadGen

A FastAPI-based lead-generation tool that scrapes OpenStreetMap for restaurants, cafes, bars, fast-food outlets, and bakeries in **Bolzano, Italy** — producing a scored, deduplicated lead database ready for outreach.

---

## Installation

1. **Clone / navigate to the project**

   ```bash
   cd bolzano-leadgen
   ```

2. **Create and activate a virtual environment**

   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # macOS / Linux
   source .venv/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Copy the environment file** (optional, defaults are fine to start)

   ```bash
   copy .env.example .env
   ```

---

## Run the FastAPI server

```bash
uvicorn app.main:app --reload
```

The API will be available at **http://127.0.0.1:8000**.

---

## Run the scraper (standalone, without the server)

```bash
python scripts/scrape_bolzano.py
```

This scrapes OpenStreetMap and saves results directly to `data/leads.db`.
Duplicates are updated rather than re-inserted.

---

## API Endpoints

| Method | Path                              | Description                                |
|--------|-----------------------------------|--------------------------------------------|
| GET    | `/health`                         | Health check                               |
| POST   | `/scrape/osm/bolzano`             | Trigger OSM scraper and save leads         |
| GET    | `/leads`                          | List all leads (with optional filters)     |
| GET    | `/leads/{id}`                     | Get a single lead                          |
| GET    | `/leads?has_website=false`        | Filter leads missing a website             |
| GET    | `/leads?lead_status=needs_manual_verification` | Filter by status             |
| PATCH  | `/leads/{id}/status`              | Update lead status                         |
| PATCH  | `/leads/{id}/notes`               | Update lead notes                          |
| GET    | `/leads/export/csv`               | Download all leads as CSV                  |
| GET    | `/stats`                          | Aggregate statistics                       |

---

## Swagger / OpenAPI docs

With the server running, open:

**http://127.0.0.1:8000/docs**

---

## Lead scoring logic

| Criterion                        | Points |
|----------------------------------|--------|
| Website missing in OSM           | +5     |
| Email exists                     | +3     |
| Phone exists                     | +2     |
| Instagram or Facebook exists     | +2     |
| Opening hours exist              | +1     |
| Category is restaurant/cafe/bakery | +1     |

A missing website in OSM **does not** mean the business has no website — it only means one was not recorded. Leads without a website in OSM are flagged `needs_manual_verification`.

---

## Project structure

```
bolzano-leadgen/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI application entry point
│   ├── database.py        # SQLAlchemy engine & session
│   ├── models.py          # Lead ORM model
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── osm_scraper.py     # OpenStreetMap Overpass API scraper
│   ├── email_extractor.py # Placeholder for future email enrichment
│   ├── lead_scoring.py    # Lead scoring algorithm
│   └── routes.py          # FastAPI route definitions
├── scripts/
│   └── scrape_bolzano.py  # Standalone scraper script
├── data/
│   └── leads.db           # SQLite database (auto-created)
├── requirements.txt
├── .env.example
└── README.md
```

---

## Legal / compliance note

- Data is sourced from **OpenStreetMap** ([ODbL license](https://www.openstreetmap.org/copyright)).
- This tool is intended for **legitimate business development** only. Do not use it for spam.
- Always respect `robots.txt` and the [Overpass API usage policy](https://wiki.openstreetmap.org/wiki/Overpass_API#Usage_policy) — do not send aggressive repeated requests.
- When reaching out to leads, comply with applicable privacy and anti-spam regulations (GDPR, CASL, CAN-SPAM, etc.).
