# Gotchas & Debugging Notes

## Backend Gotchas

### 1. `BOLZANO_BBOX` NameError (CRITICAL)
**Symptom:** `POST /scrape/osm/bolzano` throws `NameError: name 'BOLZANO_BBOX' is not defined`  
**Root cause:** The `BOLZANO_BBOX` constant was removed when `CITY_BBOXES` dict was added, but `scrape_bolzano()` still references it.  
**Fix:** Use `CITY_BBOXES["bolzano"]` instead.  
**File:** `app/osm_scraper.py:269`

### 2. Overpass API Rate Limiting
**Symptom:** Scrapes timeout or return partial results after repeated calls  
**Mechanism:** Overpass API has rate limits (approx 1 query per second per IP). The 1-second `time.sleep(1)` after successful queries helps, but:
- There's no exponential backoff on failure
- `timeout=180` is hardcoded — may not be respected by all Overpass instances
- The full South Tyrol query (~80 tags × 3 element types) is large and may be rejected by the public Overpass instance

**Debugging tip:** Test with a single-city bbox first. Use `https://overpass-api.de/status` to check endpoint health.

### 3. Google Places API Quota
**Symptom:** Website search returns no results or API error status  
**Root cause:** The tool uses the legacy Places API (`/maps/api/place/textsearch/json`). Pricing:
- Text Search: $32/1000 requests (first 100K/mo)
- Place Details: $17/1000 requests (first 100K/mo)
- $200 monthly free credit applies
- Each `search_business_website()` call makes 2-4 text searches + multiple place details

**Per-lead cost:** ~$0.08-0.20 depending on how many query variations are tried  
**Debugging:** Check response `status` field — `OVER_QUERY_LIMIT`, `REQUEST_DENIED`, `INVALID_REQUEST`

### 4. Hunter.io API Not Always Called
**Symptom:** `/enrich` endpoint never finds emails from Hunter.io  
**Root cause:** Hunter.io is only called from `/enrich-hunter`, not from `/enrich` (website scraping) or `/enrich/batch`  
**Design decision:** Hunter.io is a separate endpoint to avoid burning quota on every enrichment

### 5. SQLite `database is locked`
**Symptom:** API requests fail randomly during/after scrapes  
**Root cause:** SQLite is single-writer. Scrapes block the DB for the duration of the request. If a second request arrives, it gets `database is locked`.  
**Mitigation:** Use WAL mode (`PRAGMA journal_mode=WAL`) — not currently configured

### 6. Lead Score Not Recalculated on Status Change
**Symptom:** Changing lead status via `PATCH /status` doesn't update score  
**Root cause:** `calculate_score()` is called during import and on `accept-candidate`, but not on status/website/email updates  
**Impact:** Website discovery status changes (social_only → official_website_found) don't trigger score recalculation

### 7. `candidate_websites` Is a String, Not JSON
**Symptom:** Reading `candidate_websites` returns a plain URL string, not a list  
**Root cause:** The backend stores a single URL string, despite the column being `TEXT` and the name suggesting multiple candidates  
**Fix:** Parse as JSON or keep as-is — frontend treats it as opaque

### 8. CSV Export Includes All Leads (Unfiltered)
**Symptom:** Export always downloads ALL leads regardless of current filters  
**Root cause:** `GET /leads/export/csv` ignores all query parameters — queries `db.query(Lead).all()`  
**Bug:** Even if you have filters applied in the UI, CSV export ignores them

## Frontend Gotchas

### 1. Stale Webpack Cache (Hydration/Bundle Mismatch)
**Symptom:** `__webpack_modules__[moduleId] is not a function` error after build  
**Fix:** Clear `.next/` cache:
```powershell
Remove-Item -Recurse -Force .next
npm run build
```
Then hard refresh browser (Ctrl+Shift+R)

### 2. Hardcoded Backend URL
**Symptom:** Frontend can't connect to backend when running on different port/host  
**Root cause:** `const BASE = "http://127.0.0.1:8000"` in `api.ts` is hardcoded. No env var, no build-time injection.  
**Fix when deploying:** Manually update this string, or add `NEXT_PUBLIC_API_URL` env var to `next.config.ts`

### 3. No Total Count in /leads Response
**Symptom:** Pagination is unreliable — "Next" button appears when page is full but there may be no more results  
**Root cause:** Backend doesn't return total count. Frontend guesses: `leads.length === limit` → show Next  
**Fix needed:** Add `total` field to `/leads` response

### 4. Filter URL Encoding
**Symptom:** Filtering by city "Bolzano / Bozen" produces weird URL  
**Root cause:** Spaces and `/` in city names aren't encoded in `filterUrl()`  
**Current behavior:** `new URLSearchParams()` handles encoding, but city names like "Bolzano / Bozen" are rare (from OSM)

### 5. useSearchParams Requires Suspense Boundary
**Symptom:** Next.js error: "useSearchParams() should be wrapped in a Suspense boundary"  
**Fix:** Always use the Wrapper + Inner component pattern:
```tsx
export default function PageWrapper() {
  return <Suspense><Page /></Suspense>;
}
```

### 6. No Error Boundary for API Failures
**Symptom:** Unhandled API errors crash the page  
**Current behavior:** Errors are caught and displayed inline, but uncaught exceptions in event handlers (e.g., `handleScrape`) could crash the component tree

## Environment Pitfalls

### 1. Python Virtual Environment Activation
**Gotcha:** PowerShell and CMD have different activation scripts:
```powershell
.venv\Scripts\Activate.ps1   # PowerShell
.venv\Scripts\activate.bat    # CMD
```

### 2. .env File Location
**Gotcha:** `.env` must be in the project root (same level as `app/`). The FastAPI server loads it from `BASE_DIR / ".env"` which is computed from `app/config.py` going up 2 levels.

### 3. Google Places API Key Restrictions
**Gotcha:** If the API key is restricted by IP address, your IP must be allowed. If the backend runs locally and you need to deploy, update the IP restriction.  
**Recommendation:** Restrict to "Places API" only, not by IP, for local dev.

### 4. Node.js Version Compatibility
**Current requirement:** Node.js 18+ (Next.js 15 requirement)  
**For Windows:** Use `nvm-windows` to manage Node versions. PowerShell may need `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` for nvm.
