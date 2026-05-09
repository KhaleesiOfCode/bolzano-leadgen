import logging
import os
import time
import requests

from app.website_classifier import classify_url

logger = logging.getLogger(__name__)

PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place"
TEXT_SEARCH_URL = f"{PLACES_API_BASE}/textsearch/json"
PLACE_DETAILS_URL = f"{PLACES_API_BASE}/details/json"
FIND_PLACE_URL = f"{PLACES_API_BASE}/findplacefromtext/json"


def _get_api_key() -> str | None:
    key = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()
    return key if key else None


def _text_search(query: str) -> list[dict]:
    api_key = _get_api_key()
    if not api_key:
        return []

    results = []
    params = {"query": query, "key": api_key, "fields": "place_id,name,formatted_address,website,business_status"}
    try:
        resp = requests.get(TEXT_SEARCH_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "OK":
            results = data.get("results", [])
        elif data.get("status") == "ZERO_RESULTS":
            pass
        else:
            logger.warning("Google Places API error: %s - %s", data.get("status"), data.get("error_message"))
    except requests.RequestException as e:
        logger.warning("Google Places API request failed: %s", e)

    return results


def _get_place_details(place_id: str) -> dict | None:
    api_key = _get_api_key()
    if not api_key:
        return None

    params = {
        "place_id": place_id,
        "key": api_key,
        "fields": "place_id,name,website,formatted_phone_number,formatted_address,rating,url,business_status",
    }
    try:
        resp = requests.get(PLACE_DETAILS_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "OK":
            return data.get("result")
    except requests.RequestException as e:
        logger.warning("Google Place Details request failed: %s", e)

    return None


def search_business_website(name: str, city: str = "Bolzano", category: str | None = None) -> dict:
    api_key = _get_api_key()
    if not api_key:
        return {
            "website": None,
            "source": None,
            "confidence": 0.0,
            "status": "no_api_key",
            "error": "GOOGLE_PLACES_API_KEY not configured",
        }

    queries = [f"{name} {city} Italy"]
    if category:
        queries.append(f"{name} {category} {city} Italy")
    queries.append(f"{name} Bolzano Italy")
    queries.append(f"{name} South Tyrol Italy")

    seen_place_ids = set()
    best = None
    best_score = 0

    for query in queries:
        results = _text_search(query)
        for place in results:
            place_id = place.get("place_id")
            if not place_id or place_id in seen_place_ids:
                continue
            seen_place_ids.add(place_id)

            details = _get_place_details(place_id)
            if not details:
                continue

            website = details.get("website")
            if website:
                classification = classify_url(website)
                score = classification.get("score", 0)
                if classification.get("is_official"):
                    score = 100
                if score > best_score:
                    best = {
                        "website": website,
                        "source": "google_places",
                        "confidence": score / 100.0,
                        "status": "found",
                        "url_type": classification["url_type"],
                    }
                    best_score = score

        if best and best_score >= 100:
            break

    if best:
        return best

    return {
        "website": None,
        "source": None,
        "confidence": 0.0,
        "status": "not_found",
    }
