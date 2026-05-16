import time
import logging
from typing import Any
from urllib.parse import urlparse
import requests

from app.business_classifier import classify_business
from app.website_classifier import classify_url

logger = logging.getLogger(__name__)

USER_AGENT = "BolzanoLeadGen/2.0"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
WEBSITE_VERIFY_TIMEOUT = 10

SOUTH_TYROL_BBOX = "46.20,10.40,47.10,12.50"

CITY_BBOXES: dict[str, str] = {
    "bolzano": "46.43,11.28,46.54,11.40",
    "merano": "46.63,11.12,46.69,11.20",
    "brixen": "46.70,11.62,46.73,11.68",
    "bruneck": "46.78,11.92,46.82,11.98",
    "sterzing": "46.88,11.42,46.91,11.47",
    "schlanders": "46.62,10.75,46.63,10.78",
    "glurns": "46.67,10.55,46.68,10.56",
    "mals": "46.69,10.53,46.70,10.55",
    "lana": "46.60,11.14,46.62,11.18",
    "naturns": "46.64,10.99,46.66,11.01",
    "kaltern": "46.41,11.23,46.43,11.27",
    "neumarkt": "46.36,11.26,46.38,11.28",
    "leifers": "46.43,11.31,46.46,11.34",
    "auer": "46.34,11.27,46.36,11.29",
    "salurn": "46.25,11.21,46.27,11.23",
    "tramin": "46.37,11.23,46.38,11.25",
    "algund": "46.67,11.12,46.68,11.14",
    "marling": "46.64,11.13,46.65,11.15",
    "tirol": "46.68,11.14,46.69,11.16",
    "schenna": "46.68,11.16,46.69,11.18",
}

EXPANDED_TAGS: list[tuple[str, str, str, str]] = []

food_tags = [
    ("amenity", "restaurant", "food", "restaurant"),
    ("amenity", "cafe", "food", "cafe"),
    ("amenity", "bar", "food", "bar"),
    ("amenity", "fast_food", "food", "fast_food"),
    ("amenity", "food_court", "food", "food_court"),
    ("amenity", "ice_cream", "food", "ice_cream"),
    ("amenity", "pub", "food", "pub"),
    ("shop", "bakery", "food", "bakery"),
    ("shop", "pastry", "food", "pastry_shop"),
    ("shop", "confectionery", "food", "confectionery"),
    ("shop", "chocolate", "food", "chocolate_shop"),
    ("shop", "deli", "food", "deli"),
    ("shop", "cheese", "food", "cheese_shop"),
    ("shop", "coffee", "food", "coffee_shop"),
    ("shop", "tea", "food", "tea_shop"),
    ("shop", "greengrocer", "food", "greengrocer"),
    ("craft", "caterer", "food", "catering"),
    ("craft", "bakery", "food", "bakery"),
    ("craft", "confectionery", "food", "confectionery"),
]

beauty_tags = [
    ("shop", "beauty", "beauty", "beauty_salon"),
    ("shop", "hairdresser", "beauty", "hair_salon"),
    ("shop", "cosmetics", "beauty", "cosmetics_studio"),
    ("shop", "perfumery", "beauty", "perfumery"),
    ("shop", "tanning", "beauty", "tanning_salon"),
    ("shop", "tattoo", "beauty", "tattoo_studio"),
    ("shop", "nail_salon", "beauty", "nail_salon"),
    ("shop", "beauty_services", "beauty", "beauty_salon"),
    ("shop", "hair_removal", "beauty", "beauty_salon"),
    ("shop", "spa", "beauty", "spa"),
    ("amenity", "beauty_salon", "beauty", "beauty_salon"),
    ("amenity", "spa", "beauty", "spa"),
    ("craft", "beautician", "beauty", "beauty_salon"),
]

healthcare_tags = [
    ("amenity", "clinic", "healthcare", "clinic"),
    ("amenity", "dentist", "healthcare", "dental_clinic"),
    ("amenity", "doctors", "healthcare", "doctor"),
    ("amenity", "pharmacy", "healthcare", "pharmacy"),
    ("amenity", "veterinary", "healthcare", "veterinary"),
    ("amenity", "hospital", "healthcare", "hospital"),
    ("amenity", "physiotherapy", "healthcare", "physiotherapy"),
    ("amenity", "optometrist", "healthcare", "optometrist"),
    ("healthcare", "doctor", "healthcare", "doctor"),
    ("healthcare", "dentist", "healthcare", "dental_clinic"),
    ("healthcare", "physiotherapist", "healthcare", "physiotherapy"),
    ("healthcare", "psychotherapist", "healthcare", "psychotherapy"),
    ("healthcare", "alternative", "healthcare", "alternative_medicine"),
]

services_tags = [
    ("shop", "optician", "services", "optician"),
    ("shop", "massage", "services", "massage"),
    ("shop", "pet", "services", "pet_shop"),
    ("shop", "laundry", "services", "laundry"),
    ("shop", "dry_cleaning", "services", "dry_cleaning"),
    ("shop", "shoes_repair", "services", "shoe_repair"),
    ("shop", "electronics_repair", "services", "electronics_repair"),
    ("shop", "key_cutter", "services", "key_cutter"),
    ("shop", "bicycle_repair", "services", "bicycle_repair"),
    ("shop", "mobile_phone", "services", "mobile_phone_shop"),
    ("shop", "computer", "services", "computer_shop"),
    ("shop", "electronics", "services", "electronics_shop"),
    ("shop", "repair", "services", "repair_shop"),
    ("craft", "photographer", "services", "photographer"),
    ("craft", "shoemaker", "services", "shoemaker"),
    ("craft", "tailor", "services", "tailor"),
    ("amenity", "fitness_centre", "services", "fitness_centre"),
    ("amenity", "childcare", "services", "childcare"),
    ("amenity", "driving_school", "services", "driving_school"),
    ("amenity", "real_estate_agent", "services", "real_estate"),
    ("amenity", "lawyer", "services", "lawyer"),
    ("amenity", "accountant", "services", "accountant"),
    ("leisure", "fitness_centre", "services", "fitness_centre"),
    ("leisure", "sports_centre", "services", "sports_centre"),
]

digital_marketing_tags = [
    ("office", "advertising_agency", "digital_marketing", "advertising_agency"),
    ("office", "marketing", "digital_marketing", "marketing_agency"),
    ("office", "consulting", "digital_marketing", "consulting"),
    ("office", "it", "digital_marketing", "digital_agency"),
    ("office", "company", "digital_marketing", "digital_agency"),
    ("craft", "it_consultant", "digital_marketing", "it_consulting"),
    ("craft", "software_developer", "digital_marketing", "software_development"),
    ("craft", "web_design", "digital_marketing", "web_design"),
    ("craft", "graphic_designer", "digital_marketing", "graphic_design"),
    ("craft", "marketing", "digital_marketing", "marketing"),
    ("craft", "public_relations", "digital_marketing", "public_relations"),
]

ALL_TAGS = food_tags + beauty_tags + healthcare_tags + services_tags + digital_marketing_tags


BUSINESS_KEYS_PATTERN = "^(amenity|shop|craft|office|healthcare|leisure)$"

def _build_query(bbox: str) -> str:
    parts = []
    for elem in ("node", "way", "relation"):
        parts.append(f"{elem}[~\"{BUSINESS_KEYS_PATTERN}\"~\".\"]({bbox})")
    joined = "(" + ";".join(parts) + ";);"
    return f"[out:json];{joined}out body center;"


def _tag(element: dict, *keys: str) -> str | None:
    tags = element.get("tags", {})
    for key in keys:
        val = tags.get(key)
        if val:
            return val
    return None


def _extract_address(tags: dict) -> str | None:
    street = tags.get("addr:street")
    housenumber = tags.get("addr:housenumber")
    if street and housenumber:
        return f"{street} {housenumber}"
    return street or None


def _verify_website(url: str | None) -> tuple[bool, str]:
    if not url:
        return False, "no_url"
    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
    try:
        resp = requests.head(url, timeout=WEBSITE_VERIFY_TIMEOUT, headers={"User-Agent": USER_AGENT}, allow_redirects=True)
        if resp.status_code < 500:
            return True, "reachable"
        return False, f"http_{resp.status_code}"
    except requests.RequestException:
        return False, "unreachable"


def _element_to_lead(element: dict, search_area: str = "Bolzano") -> dict[str, Any]:
    tags = element.get("tags", {})
    elem_type = element.get("type")
    elem_id = element.get("id")

    lat: float | None = element.get("lat")
    lon: float | None = element.get("lon")
    if lat is None and "center" in element:
        lat = element["center"].get("lat")
        lon = element["center"].get("lon")

    website = _tag(element, "website", "contact:website")
    email = _tag(element, "email", "contact:email")
    instagram = _tag(element, "instagram", "contact:instagram")
    facebook = _tag(element, "facebook", "contact:facebook")
    phone = _tag(element, "phone", "contact:phone")
    name = _tag(element, "name")
    cuisine = _tag(element, "cuisine")
    opening_hours = _tag(element, "opening_hours")

    classification = classify_business(tags, name)
    business_group = classification["business_group"]
    business_subgroup = classification["business_subgroup"]
    classification_confidence = classification["classification_confidence"]

    if website:
        website_status = "present_in_osm"
        lead_status = "new"
    else:
        website_status = "missing_in_osm"
        lead_status = "new"

    url_class = classify_url(website)
    website_source = url_class["url_type"] if website else None
    website_confidence = 1.0 if website else 0.0

    city = tags.get("addr:city", "Bolzano")

    return {
        "source": "osm",
        "osm_type": elem_type,
        "osm_id": elem_id,
        "name": name,
        "category": tags.get("amenity") or tags.get("shop") or tags.get("craft"),
        "business_group": business_group,
        "business_subgroup": business_subgroup,
        "classification_confidence": classification_confidence,
        "cuisine": cuisine,
        "address": _extract_address(tags),
        "city": city,
        "postcode": tags.get("addr:postcode"),
        "municipality": tags.get("addr:city"),
        "province": "South Tyrol",
        "region": "Trentino-Alto Adige/Südtirol",
        "country": "Italy",
        "search_area": search_area,
        "lat": lat,
        "lon": lon,
        "phone": phone,
        "email": email,
        "email_source": "osm" if email else None,
        "email_confidence": 0.5 if email else None,
        "website": website,
        "website_status": website_status,
        "website_source": website_source,
        "website_confidence": website_confidence,
        "website_discovery_status": "not_checked",
        "candidate_websites": None,
        "instagram": instagram,
        "facebook": facebook,
        "opening_hours": opening_hours,
        "has_website": website is not None,
        "has_email": email is not None,
        "lead_status": lead_status,
    }


def scrape_bolzano() -> list[dict[str, Any]]:
    return scrape_area(CITY_BBOXES["bolzano"], search_area="Bolzano")


def scrape_south_tyrol() -> list[dict[str, Any]]:
    return scrape_area(SOUTH_TYROL_BBOX, search_area="South Tyrol")


def scrape_city(city_name: str) -> list[dict[str, Any]]:
    key = city_name.strip().lower()
    bbox = CITY_BBOXES.get(key)
    if not bbox:
        valid = ", ".join(sorted(CITY_BBOXES.keys()))
        raise ValueError(f"Unknown city '{city_name}'. Valid cities: {valid}")
    return scrape_area(bbox, search_area=city_name.title())


def scrape_area(bbox: str, search_area: str = "Bolzano") -> list[dict[str, Any]]:
    query = _build_query(bbox)

    logger.info("Querying Overpass API for %s (bbox: %s) ...", search_area, bbox)

    try:
        resp = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers={
                "User-Agent": USER_AGENT,
            },
            timeout=180,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error("Overpass API request failed: %s", e)
        raise

    data = resp.json()
    elements = data.get("elements", [])
    logger.info("Received %d elements from Overpass API", len(elements))

    leads = []
    for element in elements:
        if element.get("tags", {}).get("name"):
            leads.append(_element_to_lead(element, search_area=search_area))

    time.sleep(1)

    logger.info("Extracted %d named leads from OSM data", len(leads))
    return leads
