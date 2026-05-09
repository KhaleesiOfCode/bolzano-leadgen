from typing import Any

MAX_SCORE = 30


def calculate_score(lead_data: dict[str, Any]) -> int:
    score = 0

    if not lead_data.get("website"):
        score += 5

    if lead_data.get("email"):
        score += 3

    if lead_data.get("phone"):
        score += 2

    if lead_data.get("instagram") or lead_data.get("facebook"):
        score += 2

    if lead_data.get("opening_hours"):
        score += 1

    if lead_data.get("category") in ("restaurant", "cafe", "bakery"):
        score += 1

    group = lead_data.get("business_group")
    subgroup = lead_data.get("business_subgroup")
    city = lead_data.get("city", "")
    disc_status = lead_data.get("website_discovery_status")

    if group == "food":
        score += 2

    if subgroup in ("bakery", "pastry_shop", "home_baker_candidate", "restaurant", "cafe"):
        score += 2

    if group == "beauty":
        score += 2

    if subgroup in ("nail_salon", "beauty_salon", "hair_salon"):
        score += 2

    if city in ("Bolzano", "Bozen", "Merano", "Meran"):
        score += 1

    if disc_status == "social_only":
        score += 2

    if disc_status == "no_website_found":
        score += 3

    return min(score, MAX_SCORE)
