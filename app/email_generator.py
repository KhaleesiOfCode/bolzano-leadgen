import logging
import os
import re
from pathlib import Path

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    frontmatter = {}
    text = text.strip()
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            fm_text = text[3:end].strip()
            for line in fm_text.split("\n"):
                line = line.strip()
                if ":" in line:
                    key, _, val = line.partition(":")
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    frontmatter[key] = val if val else None
            body = text[end + 3 :].strip()
            return frontmatter, body
    return frontmatter, text


def _load_templates() -> list[dict]:
    templates = []
    if not TEMPLATES_DIR.exists():
        logger.warning("Templates directory not found: %s", TEMPLATES_DIR)
        return templates

    for fpath in sorted(TEMPLATES_DIR.glob("*.md")):
        content = fpath.read_text(encoding="utf-8")
        fm, body = _parse_frontmatter(content)
        if not body:
            continue
        templates.append({
            "business_group": fm.get("business_group"),
            "business_subgroup": fm.get("business_subgroup"),
            "subject": fm.get("subject", ""),
            "body": body,
        })
    return templates


def _find_template(lead: dict, templates: list[dict]) -> dict | None:
    group = lead.get("business_group")
    subgroup = lead.get("business_subgroup")

    # Exact subgroup match
    for t in templates:
        if t["business_group"] == group and t["business_subgroup"] == subgroup:
            return t

    # Group match (any subgroup)
    for t in templates:
        if t["business_group"] == group and t["business_subgroup"] is None:
            return t

    # Fallback to general
    for t in templates:
        if t["business_group"] is None:
            return t

    return None


def _fill_template(template: dict, lead: dict) -> dict:
    name = lead.get("name") or "the business"
    business = name
    city = lead.get("city") or "your area"
    subgroup = lead.get("business_subgroup") or lead.get("category") or "local business"

    subject = template["subject"].replace("{{name}}", name)
    subject = subject.replace("{{city}}", city)
    subject = subject.replace("{{business}}", business)
    subject = subject.replace("{{subgroup}}", subgroup)

    body = template["body"].replace("{{name}}", name)
    body = body.replace("{{city}}", city)
    body = body.replace("{{business}}", business)
    body = body.replace("{{subgroup}}", subgroup)

    return {"subject": subject, "body": body, "error": None}


def generate_email(lead_data: dict) -> dict:
    templates = _load_templates()
    if not templates:
        return {"subject": None, "body": None, "error": "No templates found in templates/ directory"}

    template = _find_template(lead_data, templates)
    if not template:
        return {"subject": None, "body": None, "error": f"No template for group={lead_data.get('business_group')}"}

    return _fill_template(template, lead_data)
