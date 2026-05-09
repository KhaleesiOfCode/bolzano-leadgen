import re
from urllib.parse import urlparse

SOCIAL_DOMAINS = [
    "instagram.com",
    "facebook.com",
    "tiktok.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "youtube.com",
    "pinterest.com",
]

BOOKING_PLATFORM_DOMAINS = [
    "tripadvisor",
    "thefork",
    "restaurantguru",
    "yelp",
    "quandoo",
    "deliveroo",
    "justeat",
    "glovo",
    "ubereats",
    "uber-eats",
    "paginegialle",
    "suedtirol.info",
    "sentres.com",
    "booking.com",
    "openTable",
]

BEAUTY_BOOKING_DOMAINS = [
    "treatwell",
    "fresha",
    "booksy",
    "planity",
    "studiobooking",
    "miodottore",
]

DIRECTORY_DOMAINS = [
    "paginegialle",
    "paginebianche",
    "yellowpages",
    "11880",
    "cylex",
    "golocal",
    "kennstdueinen",
    "gelbeseiten",
    "hotfrog",
    "tupalo",
]


def classify_url(url: str | None) -> dict:
    if not url:
        return {"url_type": "unknown", "domain": None, "is_official": False}

    parsed = urlparse(url)
    domain = (parsed.netloc or parsed.path).lower()
    domain = re.sub(r"^www\.", "", domain)

    for d in SOCIAL_DOMAINS:
        if d in domain:
            return {"url_type": "social", "domain": domain, "is_official": False}

    for d in BOOKING_PLATFORM_DOMAINS:
        if d in domain:
            return {"url_type": "booking_platform", "domain": domain, "is_official": False}

    for d in BEAUTY_BOOKING_DOMAINS:
        if d in domain:
            return {"url_type": "booking_platform", "domain": domain, "is_official": False}

    for d in DIRECTORY_DOMAINS:
        if d in domain:
            return {"url_type": "directory", "domain": domain, "is_official": False}

    return {"url_type": "official", "domain": domain, "is_official": True}


def score_candidate(url: str, business_name: str | None = None) -> dict:
    result = classify_url(url)
    score = 0
    if result["is_official"]:
        score = 100
    elif result["url_type"] == "social":
        score = 30
    elif result["url_type"] == "booking_platform":
        score = 20
    elif result["url_type"] == "directory":
        score = 10

    if business_name:
        name_slug = re.sub(r"[^a-z0-9]+", "", business_name.lower())
        domain_slug = re.sub(r"[^a-z0-9]+", "", result.get("domain", "").split(".")[0])
        if name_slug and domain_slug and name_slug in domain_slug:
            score = min(100, score + 20)

    result["score"] = score
    return result
