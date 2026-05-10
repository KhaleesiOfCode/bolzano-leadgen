# Database Documentation

## Provider & Access

| Property | Value |
|---|---|
| **Engine** | SQLite (3.x) |
| **File path** | `data/leads.db` (auto-created) |
| **ORM** | SQLAlchemy (declarative `Base`) |
| **Connection string** | `sqlite:///data/leads.db` (default) or `DATABASE_URL` env var |
| **Concurrency** | `check_same_thread=False` (required for FastAPI async) |
| **Migration** | Custom `migrate_database()` — raw `ALTER TABLE ADD COLUMN` |

## Single Table: `leads`

### Columns (42 total)

| Column | Type | Constraints | Business Meaning |
|---|---|---|---|
| `id` | `Integer` | PK, auto-increment | Internal row ID |
| `source` | `VARCHAR(50)` | DEFAULT `"osm"` | Data origin (`osm`, `google_places_digital`) |
| `osm_type` | `VARCHAR(20)` | NULLABLE | OSM element type (`node`, `way`, `relation`) |
| `osm_id` | `Integer` | NULLABLE | OSM element ID |
| `name` | `VARCHAR(255)` | NULLABLE | Business name (from OSM `name` tag) |
| `category` | `VARCHAR(100)` | NULLABLE | OSM tag value (`restaurant`, `bakery`, etc.) |
| `business_group` | `VARCHAR(50)` | NULLABLE | High-level vertical (`food`, `beauty`, `healthcare`, `services`, `digital_marketing`) |
| `business_subgroup` | `VARCHAR(50)` | NULLABLE | Specific type (`nail_salon`, `digital_agency`, etc.) |
| `classification_confidence` | `FLOAT` | NULLABLE | How sure the classifier is (0-100) |
| `cuisine` | `VARCHAR(255)` | NULLABLE | Cuisine type (for restaurants) |
| `address` | `VARCHAR(255)` | NULLABLE | Street + housenumber |
| `city` | `VARCHAR(100)` | NULLABLE | City from OSM `addr:city` |
| `postcode` | `VARCHAR(20)` | NULLABLE | Postal code |
| `municipality` | `VARCHAR(100)` | NULLABLE | Same as `addr:city` in practice |
| `province` | `VARCHAR(100)` | NULLABLE | Hardcoded `"South Tyrol"` |
| `region` | `VARCHAR(100)` | NULLABLE | Hardcoded `"Trentino-Alto Adige/Südtirol"` |
| `country` | `VARCHAR(100)` | DEFAULT `"Italy"` | Hardcoded `"Italy"` |
| `search_area` | `VARCHAR(100)` | NULLABLE | Area searched (`"Bolzano"`, `"Merano"`, etc.) |
| `lat` | `FLOAT` | NULLABLE | Latitude (from OSM or `center`) |
| `lon` | `FLOAT` | NULLABLE | Longitude (from OSM or `center`) |
| `phone` | `VARCHAR(100)` | NULLABLE | Phone number |
| `email` | `VARCHAR(255)` | NULLABLE | Email address |
| `email_source` | `VARCHAR(50)` | NULLABLE | How email was found (`osm`, `website_scrape`, `hunter`) |
| `email_confidence` | `FLOAT` | NULLABLE | Email confidence (0.0-1.0) |
| `website` | `VARCHAR(500)` | NULLABLE | Business website URL |
| `website_status` | `VARCHAR(50)` | NULLABLE | `missing_in_osm`, `verified`, `unreachable`, or HTTP code |
| `website_source` | `VARCHAR(50)` | NULLABLE | `official`, `social`, `booking_platform`, `directory`, `google_places`, `osm` |
| `website_confidence` | `FLOAT` | NULLABLE | Website confidence (0.0-1.0) |
| `website_discovery_status` | `VARCHAR(50)` | DEFAULT `"not_checked"` | Enrichment stage: `not_checked`, `official_website_found`, `social_only`, `no_website_found`, `needs_manual_verification` |
| `candidate_websites` | `TEXT` | NULLABLE | JSON string of candidate URLs from Google Places |
| `instagram` | `VARCHAR(500)` | NULLABLE | Instagram URL |
| `facebook` | `VARCHAR(500)` | NULLABLE | Facebook URL |
| `opening_hours` | `VARCHAR(500)` | NULLABLE | OSM opening_hours string |
| `has_website` | `BOOLEAN` | DEFAULT `0` | Quick filter flag |
| `has_email` | `BOOLEAN` | DEFAULT `0` | Quick filter flag |
| `lead_score` | `INTEGER` | DEFAULT `0` | Computed priority score (0-30) |
| `lead_status` | `VARCHAR(50)` | DEFAULT `"new"` | Pipeline stage |
| `notes` | `TEXT` | NULLABLE | Manual notes for sales follow-up |
| `created_at` | `DATETIME` | Auto UTC | Row creation timestamp |
| `updated_at` | `DATETIME` | Auto UTC on update | Row modification timestamp |

## Constraints

| Name | Type | Columns | Purpose |
|---|---|---|---|
| `uq_osm_type_id` | `UNIQUE` | `(osm_type, osm_id)` | Prevent duplicate OSM imports |

## Late-Migration Columns (`NEW_COLUMNS` dict)

These 11 columns were added after initial table creation via `migrate_database()`:

`business_subgroup`, `classification_confidence`, `municipality`, `province`, `region`, `country`, `search_area`, `website_source`, `website_confidence`, `website_discovery_status`, `candidate_websites`

## Migration System

**File:** `app/database.py:migrate_database()`

```python
def migrate_database():
    Base.metadata.create_all(bind=engine)           # Create table if absent
    inspector = inspect(engine)                     # Get existing columns
    with engine.connect() as conn:
        for col_name, col_type in NEW_COLUMNS.items():
            if col_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE leads ADD COLUMN {col_name} {col_type}"))
        conn.commit()
```

**Risks:**
- No down-migration support
- No column type changes or removals
- SQLite's limited ALTER TABLE means adding NOT NULL columns or constraints requires full table rebuild
- Runs on every startup (in `main.py` module scope)

## Data Flow Notes

- **Dedup strategy:** Upsert by `(osm_type, osm_id)` — works for OSM data but not for Google Places leads (which have no `osm_type/id`)
- **Google Places digital agencies:** Deduped by `(name, source="google_places_digital", city ILIKE)` — fragile (name mismatches)
- **Address:**
  - OSM: "street housenumber" — no city/region in this field
  - Google Places: full `formatted_address` string
- **candidate_websites:** Currently stores a single URL string, not a JSON list (despite column being TEXT type)

## Scalability Considerations

- **SQLite limit:** WAL mode not configured. Single-writer bottleneck. At ~10K leads, queries with multiple ILIKE filters will slow down.
- **Indexes:** Only PK and unique constraint. No indexes on `city`, `business_group`, `lead_status`, or `lead_score` — all commonly filtered columns.
- **Boolean handling:** SQLite stores booleans as integers (0/1) — Python treats falsy values correctly but direct SQL queries need `WHERE has_website = 1`.
