# Task Kanban

---

## 📋 Backlog (P3 — Future Improvements)

- [ ] Add PagineGialle as a secondary data source for Italian business discovery
  - Priority: P3
  - Complexity: Large
  - Reason: Free directory with good coverage of Italian businesses
- [ ] Add Yelp/Tripadvisor integration for review data and additional contact info
  - Priority: P3
  - Complexity: Large
  - Reason: Could prioritize leads by review count/rating
- [ ] Switch from SQLite to PostgreSQL
  - Priority: P3
  - Complexity: Large
  - Reason: Required for multi-user, multi-worker deployment
- [ ] Add user authentication (API keys or OAuth)
  - Priority: P3
  - Complexity: Large
  - Reason: Required for any multi-user or public-facing deployment
- [ ] Add dark mode support
  - Priority: P3
  - Complexity: Small
  - Reason: Nice-to-have UI improvement
- [ ] Add loading skeletons instead of "Loading..." text
  - Priority: P3
  - Complexity: Small
  - Reason: UX polish
- [ ] Build mobile-responsive leads table
  - Priority: P3
  - Complexity: Medium
  - Reason: Current table forces horizontal scroll on mobile

---

## 🗓️ Planned (P2 — Clearly Identified)

- [ ] Add database indexes on commonly filtered columns
  - Priority: P2
  - Complexity: Small
  - Files:
    - `app/models.py`
  - Reason: `city`, `business_group`, `lead_status`, `lead_score`, `has_website`, `has_email` are filtered regularly with no index support. At 5K+ leads, full table scans will slow down.

- [ ] Implement background task system for long-running operations
  - Priority: P2
  - Complexity: Large
  - Files:
    - `app/main.py`
    - `app/routes.py`
    - `app/tasks.py` (new)
  - Reason: South Tyrol scrape, batch enrichment, and batch Google Places search block the HTTP thread. Need at minimum FastAPI `BackgroundTasks` or a task queue.

- [ ] Add lead score recalculation on status/website/email changes
  - Priority: P2
  - Complexity: Medium
  - Files:
    - `app/routes.py`
    - `app/lead_scoring.py`
  - Reason: Currently score is only calculated on import and accept-candidate. Changing `website_discovery_status` or accepting a candidate doesn't trigger recalc.

- [ ] Add error boundaries for frontend API failures
  - Priority: P2
  - Complexity: Small
  - Files:
    - `frontend/src/app/layout.tsx`
    - `frontend/src/app/error.tsx` (new)
  - Reason: Uncaught API errors can crash page components.

- [ ] Add Hunter.io enrichment button in Lead Detail UI
  - Priority: P2
  - Complexity: Small
  - Files:
    - `frontend/src/app/leads/[id]/page.tsx`
  - Reason: Backend endpoint exists (`/enrich-hunter`) but frontend has no button to trigger it.

---

## 🚧 In Progress

- [ ] (None currently — all recent work is committed)

---

## 🚫 Blocked

- [ ] None currently

---

## 🧪 Testing Needed

- [ ] End-to-end test: Full scrape + enrich cycle for one city
  - Priority: P1
  - Complexity: Medium
  - Reason: Core workflow has never been formally tested end-to-end

- [ ] Verify Google Places batch search completes without quota errors
  - Priority: P1
  - Complexity: Small
  - Reason: 0.2s sleep between calls may not be sufficient for rate limiting

- [ ] Test city scraper for all 20 cities
  - Priority: P1
  - Complexity: Medium
  - Reason: Some bboxes may be too small or misplaced

- [ ] Verify Hunter.io integration works end-to-end
  - Priority: P2
  - Complexity: Small
  - Reason: Endpoint exists but has no frontend button and was never tested with a real key

---

## 🔧 Technical Debt

- [ ] Fix `BOLZANO_BBOX` undefined reference in `osm_scraper.py`
  - Priority: P0 — CRITICAL
  - Complexity: Small
  - File: `app/osm_scraper.py:269`
  - Fix: Use `CITY_BBOXES["bolzano"]`
  - Status: FIXED (verify on next scrape)

- [ ] Add total count to `GET /leads` response
  - Priority: P1
  - Complexity: Medium
  - Files:
    - `app/routes.py`
    - `frontend/src/app/leads/page.tsx`
  - Reason: Frontend pagination is broken without it. Frontend currently guesses "next page" by `leads.length === limit`.

- [ ] Make CSV export respect current filters
  - Priority: P1
  - Complexity: Small
  - Files:
    - `app/routes.py`
  - Reason: `/leads/export/csv` exports ALL leads regardless of applied filters.

- [ ] Extract business logic from routes.py into service layer
  - Priority: P2
  - Complexity: Large
  - Files:
    - `app/services/` (new directory)
  - Reason: Routes.py mixes HTTP handling with business logic. Scrape upsert logic is duplicated in 4 places.

- [ ] Deduplicate route handler logic (4 identical upsert loops)
  - Priority: P2
  - Complexity: Small
  - Files:
    - `app/routes.py`
  - Reason: `/scrape/osm/bolzano`, `/scrape/osm/south-tyrol`, `/scrape/osm/city/{name}`, and `/scrape/digital-agencies/{name}` all have the same upsert pattern.

- [ ] Replace module-level DB migration with startup event
  - Priority: P2
  - Complexity: Small
  - Files:
    - `app/main.py`
  - Reason: `migrate_database()` runs at module import time. Should use FastAPI's `lifespan` event instead.

- [ ] Move `candidate_websites` from single string to JSON array
  - Priority: P2
  - Complexity: Small
  - Reason: Column is TEXT but only stores one URL. Multiple candidates from Google Places searches are overwritten.

- [ ] Configure SQLite WAL mode for better concurrency
  - Priority: P2
  - Complexity: Small
  - File: `app/database.py`
  - Reason: `PRAGMA journal_mode=WAL` improves concurrent read/write performance.

- [ ] Add proper Python testing infrastructure
  - Priority: P2
  - Complexity: Medium
  - Reason: Zero tests. Every refactor is risky.

- [ ] Remove unused `EXPANDED_TAGS` list
  - Priority: P3
  - Complexity: Small
  - File: `app/osm_scraper.py`
  - Reason: Empty list defined but never populated or referenced.

- [ ] Remove unused `pandas` dependency
  - Priority: P3
  - Complexity: Small
  - File: `requirements.txt`
  - Reason: Listed in requirements but never imported anywhere.

- [ ] Enable Next.js standalone output for deployment
  - Priority: P3
  - Complexity: Small
  - File: `frontend/next.config.ts`
  - Reason: `output: "standalone"` reduces deployment size.

---

## ♻️ Reusable Learnings

- **Overpass scraper pattern** with tag tuples + generic `scrape_area()` function — reusable for any geographic lead gen project. See `learnings.md`.
- **URL-as-state filter pattern** using `useSearchParams()` + `filterUrl()` helper — reusable for any data-heavy dashboard. See `learnings.md`.
- **Multi-stage classification pipeline** (exact → partial → heuristic) with confidence scoring — reusable for any hierarchical categorization problem. See `learnings.md`.
- **Generic fetch wrapper** with typed error handling (`ApiError` with status) — reusable for any frontend talking to a REST API. See `learnings.md`.
