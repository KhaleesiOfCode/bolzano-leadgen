# Rehydration Notes — Context Recovery for Future Development

## Current State (May 2026)

### What's Working
- OSM scraping for 20 South Tyrol cities across 5 business groups (food, beauty, healthcare, services, digital_marketing)
- Google Places website enrichment (legacy API, working with current API key)
- Email extraction from websites (regex + BeautifulSoup, 18 contact paths)
- Hunter.io integration (wired into `/enrich-hunter`, not in batch path)
- Phone extraction (added alongside email extraction)
- Digital marketing agency scraping via Google Places keyword search
- Lead scoring (0-30, includes digital marketing boosts)
- Frontend dashboard with city-specific scrape buttons
- Collapsible filter panel on leads page (6 filter sections)
- CSV export (unfiltered — exports all leads)

### What's Known Broken
1. **`scrape_bolzano()` references undefined `BOLZANO_BBOX`** (`osm_scraper.py:269`)
   - Fix: Changed to `CITY_BBOXES["bolzano"]`
   - Verify: Test `POST /scrape/osm/bolzano` after merge

2. **Pagination has no total count** — frontend guesses "next page" by page length
3. **CSV export ignores current filters**
4. **Lead score not recalculated** on status/website/email changes
5. **No indexes** on commonly filtered columns (city, business_group, lead_status, lead_score)

## Unfinished Areas

### 1. Outreach System (Deferred)
The largest gap. Currently the tool finds leads but provides no mechanism to contact them.
- No email templates
- No campaign tracking
- No follow-up scheduling
- No open/click tracking
- No email delivery (would need SendGrid/Mailgun/SMTP integration)

**Recommended approach:**
```
Build a simple Campaign model:
├── campaign_template (subject, body, business_group filter)
├── campaign_lead (join table with sent_at, opened_at, replied_at)
└── Campaign → Lead many-to-many relationship
```

### 2. Background Job System
Scrapes and batch enrichments block the HTTP request. For the South Tyrol-wide scrape (potentially thousands of leads), this means:
- Browser timeout risk (if fetch doesn't time out)
- Can't scrape + browse leads simultaneously
- No progress indication

**Options:**
- FastAPI `BackgroundTasks` (simplest, no external deps)
- Celery + Redis (for production)
- `asyncio.create_task` with status endpoint

### 3. Pagination Metadata
`GET /leads` needs to return `{ total: number, leads: Lead[] }` for proper pagination.

### 4. Database Indexing
Add indexes on: `city`, `business_group`, `lead_status`, `lead_score`, `has_website`, `has_email`

### 5. Filtered CSV Export
`GET /leads/export/csv?{same_filters_as_leads}`

### 6. More Data Sources
- **PagineGialle** — Italian business directory (free, needs custom scraper)
- **Yelp/Tripadvisor** — review data, more contact info
- **Facebook Pages** — social media presence
- **LinkedIn** — for digital marketing agencies specifically

### 7. Multi-Region Support
Currently hardcoded to South Tyrol. The architecture supports it (`scrape_city()` + `scrape_area(bbox)`), but:
- No UI for adding custom bboxes
- No persistent city/region config
- Province/region/country are hardcoded in `_element_to_lead()`

## Active Architectural Concerns

1. **SQLite concurrency limits** — will fail under any multi-user scenario
2. **No auth** — anyone who can reach the server can read/write all data
3. **No testing** — refactoring is risky without tests
4. **Client-only Next.js** — no SSR, no SEO, no server components
5. **Module-level migration runs** on every startup (unnecessary)

## Immediate Priorities

1. Fix `BOLZANO_BBOX` bug (DONE)
2. Verify Google Places API is working
3. Test scrape for Merano/Brixen to validate city scrapers
4. Add DB indexes for performance
5. Fix CSV export to respect filters
6. Add pagination total count

## Next Engineering Tasks (In Order)

| Priority | Task | Effort | Dependencies |
|---|---|---|---|
| P0 | Fix BOLZANO_BBOX NameError | Small | None |
| P0 | Verify Google Places API key works | Small | API key |
| P1 | Add DB indexes for filtered columns | Small | None |
| P1 | Add total count to /leads response | Medium | None |
| P1 | Add filtered CSV export | Small | None |
| P2 | Implement background task system | Large | None |
| P2 | Add lead score recalculation hooks | Medium | None |
| P3 | Build outreach/campaign system | Large | Enrichment stable |
| P3 | Add PagineGialle as data source | Large | Scraper framework |
| P3 | Switch to PostgreSQL | Large | Infrastructure |
| P3 | Add authentication | Large | Infrastructure |

## Operational Dependencies

- **Google Cloud Console** access (to manage Places API key)
- **Hunter.io** account (optional, for email enrichment)
- **OpenStreetMap** (free, no account needed)
- **Node.js 18+** (for frontend)
- **Python 3.x** (for backend)

## Key File Reference

| File | Purpose | Last Known Issue |
|---|---|---|
| `app/osm_scraper.py` | OSM scraper with city bboxes | No indexes on city columns |
| `app/routes.py` | All API endpoints | No background tasks, no pagination metadata |
| `app/email_extractor.py` | Email + phone extraction | Hunter.io not integrated into batch path |
| `app/google_places.py` | Google Places API | Legacy API (not New Places API) |
| `frontend/src/app/page.tsx` | Dashboard | 10 cities shown (not all 20) |
| `frontend/src/app/leads/page.tsx` | Lead list + filters | No total count, no filtered export |
| `frontend/src/app/leads/[id]/page.tsx` | Lead detail | No Hunter.io button in UI |

## Resuming Development Checklist

```powershell
# 1. Activate environment
.venv\Scripts\activate

# 2. Start backend
uvicorn app.main:app --reload

# 3. Start frontend
cd frontend
npm run dev

# 4. Open in browser
# http://localhost:3000

# 5. Verify scrape works
# Click "Bolzano" or "Merano" button on dashboard

# 6. Check API docs
# http://127.0.0.1:8000/docs
```
