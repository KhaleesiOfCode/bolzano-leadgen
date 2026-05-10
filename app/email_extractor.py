import re
import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_REGEX = re.compile(
    r"(?:\+?39[-\s]?)?(?:\d[-\s]?){6,15}"
)
BLOCKED_DOMAINS = {"example.com", "example.org", "example.net", "domain.com"}
CONTACT_PATHS = [
    "/contact", "/about", "/kontakt", "/impressum", "/contact-us",
    "/contacto", "/contatti", "/info", "/chi-siamo", "/about-us",
    "/contacts", "/contattaci", "/kontakte", "/support",
    "/uber-uns", "/uberuns", "/team", "/wir-uber-uns",
]


def _is_valid_email(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    if domain in BLOCKED_DOMAINS:
        return False
    if "." not in domain:
        return False
    if len(domain) < 4:
        return False
    return True


def _scrape_url(url: str, timeout: int = 15) -> tuple[set[str], set[str]]:
    emails: set[str] = set()
    phones: set[str] = set()
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
        resp.raise_for_status()
    except requests.RequestException:
        return emails, phones

    html = resp.text
    found = EMAIL_REGEX.findall(html)
    for e in found:
        if _is_valid_email(e):
            emails.add(e.lower())

    found_phones = PHONE_REGEX.findall(html)
    for p in found_phones:
        cleaned = re.sub(r"[^\d+]", "", p)
        if len(cleaned) >= 6:
            phones.add(cleaned)

    soup = BeautifulSoup(html, "html.parser")
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if href.startswith("mailto:"):
            candidate = href[7:].split("?")[0].strip()
            if _is_valid_email(candidate):
                emails.add(candidate.lower())
        elif href.startswith("tel:"):
            candidate = href[4:].split("?")[0].strip()
            cleaned = re.sub(r"[^\d+]", "", candidate)
            if len(cleaned) >= 6:
                phones.add(cleaned)

    return emails, phones


def extract_email_from_website(url: str) -> tuple[str | None, float, set[str]]:
    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
        parsed = urlparse(url)

    base = f"{parsed.scheme}://{parsed.netloc}"

    all_emails: set[str] = set()
    all_phones: set[str] = set()

    e, p = _scrape_url(url)
    all_emails.update(e)
    all_phones.update(p)

    for path in CONTACT_PATHS:
        if len(all_emails) > 0:
            break
        contact_url = urljoin(base, path)
        if contact_url == url:
            continue
        e, p = _scrape_url(contact_url)
        all_emails.update(e)
        all_phones.update(p)

    if not all_emails:
        return None, 0.0, all_phones

    best = sorted(all_emails)[0]
    confidence = min(0.9, 0.5 + 0.1 * len(all_emails))
    return best, confidence, all_phones


def enrich_lead_with_email(lead_data: dict) -> dict:
    url = lead_data.get("website")
    if not url or lead_data.get("has_email"):
        return lead_data

    logger.info("Attempting email extraction for %s (%s)", lead_data.get("name"), url)
    email, confidence, phones = extract_email_from_website(url)

    if email:
        lead_data["email"] = email
        lead_data["email_source"] = "website_scrape"
        lead_data["email_confidence"] = round(confidence, 2)
        lead_data["has_email"] = True
        logger.info("Found email %s for %s (confidence: %.2f)", email, lead_data.get("name"), confidence)
    else:
        logger.info("No email found for %s", lead_data.get("name"))

    if phones and not lead_data.get("phone"):
        lead_data["phone"] = sorted(phones)[0]
        logger.info("Found phone %s for %s", lead_data["phone"], lead_data.get("name"))

    return lead_data


def hunter_email_search(domain: str, api_key: str) -> list[dict]:
    url = "https://api.hunter.io/v2/domain-search"
    try:
        resp = requests.get(url, params={"domain": domain, "api_key": api_key}, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", {}).get("emails", [])
    except requests.RequestException as e:
        logger.warning("Hunter.io API request failed for %s: %s", domain, e)
        return []
