# Engineering Learnings & Reusable Patterns

## Reusable Backend Patterns

### 1. Overpass API Scraper Pattern
**File:** `app/osm_scraper.py`  
**Reusable for:** Any geographic lead gen or POI extraction project  
**Pattern:**
- Tag tuples `(key, value, group, subgroup)` → built into an Overpass QL query
- Generic `scrape_area(bbox, search_area)` function
- Element-to-dict conversion with classification + verification pipeline
- Sleep-based rate limiting

**Why reusable:** The tag tuple pattern makes it trivial to add new business categories. The `scrape_area()` function works for any bounding box — just define new entries in `CITY_BBOXES` or provide a custom bbox.

### 2. Multi-Stage Classification Pipeline
**File:** `app/business_classifier.py`  
**Pattern:** Exact match → partial match → name-based heuristic → fallback  
**Why reusable:** Any classification problem with hierarchical categories can use this fallback approach. The confidence score (100 → 90 → 70 → 0) enables downstream filtering.

### 3. URL Type Classification
**File:** `app/website_classifier.py`  
**Pattern:** Substring-based domain blocklist → positive match → default official  
**Why reusable:** Simple, effective, no ML needed. Adding a new platform takes one line.

### 4. Lead Scoring with Tiered Point System
**File:** `app/lead_scoring.py`  
**Pattern:** Additive points with configurable `MAX_SCORE` cap  
**Why reusable:** Easy to tune — adjust point values to change priority weighting. The scoring factors (data completeness + category boost + city boost + discovery status) are domain-agnostic.

### 5. Incremental DB Migration
**File:** `app/database.py` → `migrate_database()`  
**Pattern:** Column existence check → `ALTER TABLE ADD COLUMN`  
**Why reusable:** Good for single-developer SQLite projects where Alembic is overkill.  
**Limitation:** Brittle for production — no down-migrations, no column type changes.

## Reusable Frontend Patterns

### 1. URL-as-State for Filters
**File:** `frontend/src/app/leads/page.tsx`  
**Pattern:**
- Read all filter values from `useSearchParams()`
- Update via `router.push()` with new URL params
- `filterUrl()` helper constructs complete URLs from current params + overrides

**Why reusable:** Bookmarkable, shareable filter state. No React state synchronization issues. Back-button works naturally.

### 2. Wrapper + Inner Component for useSearchParams
**File:** `frontend/src/app/leads/page.tsx` → `LeadsPageWrapper` + `LeadsPage`  
**Pattern:**
```tsx
export default function LeadsPageWrapper() {
  return (
    <Suspense fallback={...}>
      <LeadsPage />
    </Suspense>
  );
}
```
**Why reusable:** Required by Next.js App Router — `useSearchParams()` must be inside `<Suspense>`. Always use this wrapper pattern for any page consuming search params.

### 3. API Client with Generic Fetcher
**File:** `frontend/src/lib/api.ts` → `fetcher<T>()`  
**Pattern:**
```typescript
async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```
**Why reusable:** Simple, type-safe, no dependencies. The `ApiError` class with `status: 0` for network errors is a clean pattern.

### 4. Load-Error-Success Triage
**Pattern used in all pages:**
```
state: loading (bool), error (string|null), data (T|null)
effect: fetch → set data / set error → finally set loading false
render: if loading → spinner, if error → error card, else → content
```
**Why reusable:** Universal data-fetching pattern. Works for any API call.

## Extraction Patterns (Not Yet Implemented — Derived from Architecture)

### 1. Backend Service Layer
Currently routes.py contains all business logic mixed with HTTP concerns. Extract into:
```
app/services/
├── scraper_service.py
├── enrichment_service.py
├── classification_service.py
└── export_service.py
```

### 2. Repository Pattern for DB
Currently SQLAlchemy queries are inline in routes. Extract:
```
app/repositories/
├── lead_repository.py
└── stats_repository.py
```

### 3. Background Task Queue
Long-running scrapes need to move off the HTTP thread:
- Celery with Redis/RabbitMQ
- Or simpler: `asyncio.create_task` with progress tracking
- Or: FastAPI `BackgroundTasks`
