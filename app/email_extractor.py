import re
import logging
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
BLOCKED_DOMAINS = {"example.com", "example.org", "example.net", "domain.com"}
CONTACT_PATHS = ["/contact", "/about", "/kontakt", "/impressum", "/contact-us", "/contacto", "/contatti", "/info", "/chi-siamo"]


def _is_valid_email(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    if domain in BLOCKED_DOMAINS:
        return False
    if "." not in domain:
        return False
    if len(domain) < 4:
        return False
    return True


def _scrape_url(url: str, timeout: int = 15) -> set[str]:
    emails: set[str] = set()
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
        resp.raise_for_status()
    except requests.RequestException:
        return emails

    html = resp.text
    found = EMAIL_REGEX.findall(html)
    for e in found:
        if _is_valid_email(e):
            emails.add(e.lower())

    soup = BeautifulSoup(html, "html.parser")
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if href.startswith("mailto:"):
            candidate = href[7:].split("?")[0].strip()
            if _is_valid_email(candidate):
                emails.add(candidate.lower())

    return emails


def extract_email_from_website(url: str) -> tuple[str | None, float]:
    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
        parsed = urlparse(url)

    base = f"{parsed.scheme}://{parsed.netloc}"

    all_emails: set[str] = set()

    all_emails.update(_scrape_url(url))

    for path in CONTACT_PATHS:
        if len(all_emails) > 0:
            break
        contact_url = urljoin(base, path)
        if contact_url == url:
            continue
        all_emails.update(_scrape_url(contact_url))

    if not all_emails:
        return None, 0.0

    best = sorted(all_emails)[0]
    confidence = min(0.9, 0.5 + 0.1 * len(all_emails))
    return best, confidence


def enrich_lead_with_email(lead_data: dict) -> dict:
    url = lead_data.get("website")
    if not url or lead_data.get("has_email"):
        return lead_data

    logger.info("Attempting email extraction for %s (%s)", lead_data.get("name"), url)
    email, confidence = extract_email_from_website(url)

    if email:
        lead_data["email"] = email
        lead_data["email_source"] = "website_scrape"
        lead_data["email_confidence"] = round(confidence, 2)
        lead_data["has_email"] = True
        logger.info("Found email %s for %s (confidence: %.2f)", email, lead_data.get("name"), confidence)
    else:
        logger.info("No email found for %s", lead_data.get("name"))

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
