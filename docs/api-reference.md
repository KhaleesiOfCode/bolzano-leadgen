# API Reference

**Base URL:** `http://127.0.0.1:8000`  
**Docs:** `http://127.0.0.1:8000/docs` (Swagger/OpenAPI auto-generated)  
**Auth:** None (open API)

## Endpoints

### GET /health
**Purpose:** Health check.  
**Response:** `{"status": "ok"}`

### GET /
**Purpose:** Root info with endpoint listing.

### POST /scrape/osm/bolzano
**Purpose:** Scrape Bolzano businesses from OpenStreetMap.  
**Response:**
```json
{"leads_found": 500, "created": 450, "updated": 50}
```
**Notes:** Upserts by `(osm_type, osm_id)`. Blocks while Overpass API responds.

### POST /scrape/osm/south-tyrol
**Purpose:** Scrape entire South Tyrol region.  
**Response:** Same shape as Bolzano.  
**Notes:** Covers ~10x area of Bolzano. Will take longer and return more leads.

### POST /scrape/osm/city/{city_name}
**Purpose:** Scrape a specific South Tyrol city.  
**Path params:** `city_name` — one of 20 supported cities (bolzano, merano, brixen, bruneck, sterzing, schlanders, lana, naturns, kaltern, neumarkt, leifers, auer, salurn, tramin, algund, marling, tirol, schenna, glurns, mals)  
**Errors:** Returns `400` with error message for unknown cities.

### POST /scrape/digital-agencies/{city_name}
**Purpose:** Find digital marketing agencies in a city via Google Places.  
**Path params:** `city_name` — any city name  
**Dedup:** By `(name, source="google_places_digital", city ILIKE)`  
**Response:**
```json
{"leads_found": 12, "created": 12, "updated": 0, "skipped_duplicates": 0}
```

### GET /leads
**Purpose:** List leads with filters and pagination.  
**Query params (all optional):**

| Param | Type | Example | Behavior |
|---|---|---|---|
| `has_website` | `"true"`/`"false"` | `?has_website=false` | Boolean filter |
| `lead_status` | string | `?lead_status=new` | Exact match |
| `business_group` | string (comma-sep) | `?business_group=food,beauty` | `IN` filter |
| `business_subgroup` | string (comma-sep) | `?business_subgroup=restaurant` | `IN` filter |
| `city` | string | `?city=Bolzano` | `ILIKE` match |
| `municipality` | string | — | `ILIKE` match |
| `province` | string | — | `ILIKE` match |
| `search_area` | string | — | `ILIKE` match |
| `website_status` | string | — | Exact match |
| `website_discovery_status` | string | — | Exact match |
| `website_source` | string | — | Exact match |
| `min_score` | int (≥0) | `?min_score=10` | Score ≥ |
| `max_score` | int (≥0) | `?max_score=20` | Score ≤ |
| `skip` | int (≥0) | `?skip=50` | Offset |
| `limit` | int (1-500) | `?limit=100` | Page size (default 100) |

**Default ordering:** `lead_score DESC`  
**Response:** Array of `LeadResponse` objects.  
**Known issue:** No total count in response — frontend guesses "next page" by `leads.length === limit`.

### GET /leads/{lead_id}
**Purpose:** Get single lead by ID.  
**Errors:** 404 if not found.

### PATCH /leads/{lead_id}/status
**Purpose:** Update lead pipeline status.  
**Body:** `{"lead_status": "contacted"}`  
**Valid statuses:** `new`, `needs_manual_verification`, `contacted`, `responded`, `converted`, `not_interested`

### PATCH /leads/{lead_id}/notes
**Purpose:** Update lead notes.  
**Body:** `{"notes": "Called twice, no answer"}`

### PATCH /leads/{lead_id}/website
**Purpose:** Set or update lead website URL.  
**Body:** `{"website": "https://example.com"}`  
**Auto-classifies:** Runs `classify_url()` on the provided URL.

### POST /leads/{lead_id}/accept-candidate
**Purpose:** Accept a candidate website (from Google Places search).  
**Body:** `{"website": "https://example.com"}`  
**Auto-classifies + recalculates score.**

### GET /leads/{lead_id}/search-website
**Purpose:** Search Google Places for this lead's website.  
**Response:**
```json
{"lead_id": 1, "found": true, "website": "https://...", "source": "google_places", "confidence": 1.0, "status": "found"}
```
**Stores result** in `candidate_websites` field on the lead.

### POST /leads/search-website/batch
**Purpose:** Batch Google Places search for leads without websites.  
**Query params:** `limit` (1-200, default 50), `business_group` (optional filter)  
**Rate limit:** 0.2s sleep between requests.

### POST /leads/{lead_id}/enrich
**Purpose:** Scrape website for email + phone.  
**Response:** Updated `LeadResponse` with email fields populated.  
**Mechanism:** Scrapes homepage + 18 contact page paths.

### POST /leads/{lead_id}/enrich-hunter
**Purpose:** Look up email via Hunter.io API.  
**Requires:** `HUNTER_API_KEY` in `.env`  
**Mechanism:** Extracts domain from lead's website, queries Hunter.io domain-search API.

### POST /leads/enrich/batch
**Purpose:** Batch enrich leads with email from website scraping.  
**Query params:** `limit` (1-200, default 50), `business_group` (optional filter)  
**Targets:** Leads with `has_website=true` and `has_email=false`.  
**Response:** `{"processed": 50, "enriched": 12, "errors": 1}`

### GET /leads/export/csv
**Purpose:** Download all leads as CSV.  
**Response:** `Content-Disposition: attachment; filename=leads_export.csv`  
**Columns:** 37 fields (all model columns except `created_at`, `updated_at`).

### GET /stats
**Purpose:** Aggregate statistics for dashboard.  
**Response:** `StatsResponse` object with counts by category, group, subgroup, city, status, and top categories missing websites.

## Pydantic Schemas

### LeadResponse (42 fields)
All fields from the `Lead` ORM model, mapped via `from_attributes = True`.

### StatsResponse (17 fields)
| Field | Type | Description |
|---|---|---|
| `total_leads` | int | Total count |
| `by_category` | dict | Count per OSM category tag |
| `by_business_group` | dict | Count per group |
| `by_business_subgroup` | dict | Count per subgroup |
| `by_city` | dict | Count per city |
| `by_status` | dict | Count per lead_status |
| `avg_lead_score` | float | Average score |
| `with_email` | int | Leads with email |
| `with_website` | int | Leads with website |
| `needs_manual_verification` | int | Status count |
| `official_websites` | int | Website source count |
| `social_only` | int | Website source count |
| `booking_platform_only` | int | Website source count |
| `directory_only` | int | Website source count |
| `no_website_osm` | int | Website status count |
| `top_cities` | list[{city, count}] | Top 10 by lead count |
| `top_categories_missing_website` | list[{category, count}] | Top 10 categories needing websites |

## Error Handling

- **400:** Bad request (invalid city name, missing required body field)
- **404:** Lead not found
- **422:** Pydantic validation error (auto-generated by FastAPI)
- **500:** Overpass API failure, DB errors (logged, no stack trace exposed)
- **Network:** `ApiError` with `status: 0` on frontend (backend unreachable)

## Integration Behavior

### CRM/Webhook
- None — no webhooks, no Zapier/Make integration, no Slack/email notifications

### Export
- CSV only (no JSON export, no API pagination metadata, no filtered export)
