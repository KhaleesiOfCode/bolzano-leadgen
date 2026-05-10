# Bolzano LeadGen — Project Overview

## Business Context

**Domain:** Local business lead generation for South Tyrol (Alto Adige), Italy  
**Target Verticals:** Food & dining, beauty & personal care, healthcare, services, digital marketing agencies  
**Primary Use Case:** Outbound sales prospecting for web development/consulting services  
**Business Model:** B2B lead generation → manual outreach → website development/consulting contracts  

## Technical Overview

**Purpose:** Scrape OpenStreetMap + Google Places to discover businesses lacking quality web presence, enrich with contact data, score by outreach priority, and export for manual sales workflows.

**Maturity:** MVP/Alpha — functional for a single region, no auth, no CI/CD, no tests

### Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Python + FastAPI | Python 3.x, FastAPI |
| ORM | SQLAlchemy (declarative) | - |
| Database | SQLite | Single file at `data/leads.db` |
| Frontend | Next.js + React + TypeScript | 15.3.1 / 19.1.0 / 5.8.3 |
| Styling | Tailwind CSS v4 | 4.1.6 |
| Scraping | Overpass API (OSM), BeautifulSoup, Google Places API | - |
| Email Enrichment | Hunter.io API (optional) | - |

### External Integrations

| Service | Purpose | Required? | Auth |
|---|---|---|---|
| OpenStreetMap Overpass API | Primary data source (free) | Yes | None (rate-limited) |
| Google Places API | Website discovery for leads | Optional | API key in `.env` |
| Hunter.io | Domain-based email lookup | Optional | API key in `.env` |

### Target Users

- **Primary:** Solo business owner/consultant doing outbound sales for web dev services in South Tyrol
- **Secondary:** Sales teams targeting local Italian businesses

### Main Workflows

1. **Scrape** → Pull businesses from OSM by category + city bounding box
2. **Classify** → Group into verticals (food, beauty, healthcare, services, digital_marketing)
3. **Enrich** → Find websites (Google Places) → Extract emails/phones (website scrape + Hunter.io)
4. **Score** → Rank leads by contact completeness + target priority (0-30 scale)
5. **Filter/Export** → CSV export for manual outreach
6. **Track** → Pipeline status (new → contacted → responded → converted → not_interested)

### Business Groups Taxonomy

| Group | Subgroups |
|---|---|
| food | restaurant, cafe, bar, fast_food, food_court, ice_cream, pub, bakery, pastry_shop, confectionery, chocolate_shop, deli, cheese_shop, coffee_shop, tea_shop, greengrocer, catering, home_baker_candidate |
| beauty | beauty_salon, hair_salon, cosmetics_studio, perfumery, tanning_salon, tattoo_studio, nail_salon, spa, fitness_centre |
| healthcare | clinic, dental_clinic, doctor, pharmacy, veterinary, hospital, physiotherapy, optometrist, psychotherapy, alternative_medicine |
| services | optician, massage, pet_shop, laundry, dry_cleaning, shoe_repair, electronics_repair, key_cutter, bicycle_repair, mobile_phone_shop, computer_shop, electronics_shop, repair_shop, photographer, shoemaker, tailor, fitness_centre, childcare, driving_school, real_estate, lawyer, accountant, studio, sports_centre |
| digital_marketing | advertising_agency, marketing_agency, consulting, digital_agency, it_consulting, software_development, web_design, graphic_design, marketing, public_relations |

### Lead Statuses

`new` → `needs_manual_verification` → `contacted` → `responded` → `converted` | `not_interested`

---

## Engineering Overview

### Architecture Pattern

**Monorepo with separate backend/frontend directories.** No shared types between Python backend and TypeScript frontend (types manually duplicated in `api.ts`). No monorepo tooling (Turborepo, Nx, etc.).

### Key Design Decisions

- **SQLite over PostgreSQL**: Zero-infrastructure database choice for single-user use. Will not scale to multi-user or high-concurrency.
- **Client-only Next.js**: All pages use `"use client"` — no React Server Components, no server-side data fetching. The frontend is essentially a SPA hosted by Next.js.
- **No state management library**: URL search params serve as the source of truth for filters. No React Context, Redux, or Zustand.
- **Direct browser-to-FastAPI calls**: No Next.js API route proxy — browser calls FastAPI directly (CORS configured).
- **Fragile migrations**: SQLite migration via `ALTER TABLE ADD COLUMN` in a startup script. No Alembic.

### Current Limitations

- **Single geography hardcoded** (South Tyrol bounding box + 20 city bboxes)
- **No authentication** on API or frontend
- **No background job system** — scrapes and batch enrichments block the request thread
- **No pagination metadata** — `/leads` returns unbounded flat list, frontend guesses next page
- **No testing** — zero test files in the entire repository
- **No Docker/CI/CD** — manual deployment only
- **No rate-limit-aware retry logic** for OSM/Google Places APIs
