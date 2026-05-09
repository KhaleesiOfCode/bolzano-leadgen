import re

FOOD_KEYS = {
    ("amenity", "restaurant"): "restaurant",
    ("amenity", "cafe"): "cafe",
    ("amenity", "bar"): "bar",
    ("amenity", "fast_food"): "fast_food",
    ("amenity", "food_court"): "food_court",
    ("amenity", "ice_cream"): "ice_cream",
    ("amenity", "pub"): "pub",
    ("shop", "bakery"): "bakery",
    ("shop", "pastry"): "pastry_shop",
    ("shop", "confectionery"): "confectionery",
    ("shop", "chocolate"): "chocolate_shop",
    ("shop", "deli"): "deli",
    ("shop", "cheese"): "cheese_shop",
    ("shop", "coffee"): "coffee_shop",
    ("shop", "tea"): "tea_shop",
    ("shop", "greengrocer"): "greengrocer",
    ("craft", "caterer"): "catering",
    ("craft", "bakery"): "bakery",
    ("craft", "confectionery"): "confectionery",
}

BEAUTY_KEYS = {
    ("shop", "beauty"): "beauty_salon",
    ("shop", "hairdresser"): "hair_salon",
    ("shop", "cosmetics"): "cosmetics_studio",
    ("shop", "perfumery"): "perfumery",
    ("shop", "tanning"): "tanning_salon",
    ("shop", "tattoo"): "tattoo_studio",
    ("shop", "nail_salon"): "nail_salon",
    ("shop", "beauty_services"): "beauty_salon",
    ("shop", "hair_removal"): "beauty_salon",
    ("shop", "spa"): "spa",
    ("amenity", "beauty_salon"): "beauty_salon",
    ("amenity", "spa"): "spa",
    ("craft", "beautician"): "beauty_salon",
    ("leisure", "fitness_centre"): "fitness_centre",
}

HEALTHCARE_KEYS = {
    ("amenity", "clinic"): "clinic",
    ("amenity", "dentist"): "dental_clinic",
    ("amenity", "doctors"): "doctor",
    ("amenity", "pharmacy"): "pharmacy",
    ("amenity", "veterinary"): "veterinary",
    ("amenity", "hospital"): "hospital",
    ("amenity", "physiotherapy"): "physiotherapy",
    ("amenity", "optometrist"): "optometrist",
    ("healthcare", "doctor"): "doctor",
    ("healthcare", "dentist"): "dental_clinic",
    ("healthcare", "physiotherapist"): "physiotherapy",
    ("healthcare", "psychotherapist"): "psychotherapy",
    ("healthcare", "alternative"): "alternative_medicine",
}

SERVICES_KEYS = {
    ("shop", "optician"): "optician",
    ("shop", "massage"): "massage",
    ("shop", "pet"): "pet_shop",
    ("shop", "laundry"): "laundry",
    ("shop", "dry_cleaning"): "dry_cleaning",
    ("shop", "shoes_repair"): "shoe_repair",
    ("shop", "electronics_repair"): "electronics_repair",
    ("shop", "key_cutter"): "key_cutter",
    ("shop", "bicycle_repair"): "bicycle_repair",
    ("shop", "mobile_phone"): "mobile_phone_shop",
    ("shop", "computer"): "computer_shop",
    ("shop", "electronics"): "electronics_shop",
    ("shop", "repair"): "repair_shop",
    ("craft", "photographer"): "photographer",
    ("craft", "shoemaker"): "shoemaker",
    ("craft", "tailor"): "tailor",
    ("amenity", "fitness_centre"): "fitness_centre",
    ("amenity", "childcare"): "childcare",
    ("amenity", "driving_school"): "driving_school",
    ("amenity", "real_estate_agent"): "real_estate",
    ("amenity", "lawyer"): "lawyer",
    ("amenity", "accountant"): "accountant",
    ("amenity", "studio"): "studio",
    ("leisure", "fitness_centre"): "fitness_centre",
    ("leisure", "sports_centre"): "sports_centre",
}

ALL_KEYS: list[tuple[tuple[str, str], str, str]] = []
for group_name, mapping in [
    ("food", FOOD_KEYS),
    ("beauty", BEAUTY_KEYS),
    ("healthcare", HEALTHCARE_KEYS),
    ("services", SERVICES_KEYS),
]:
    for (k, v), subgroup in mapping.items():
        ALL_KEYS.append(((k, v), group_name, subgroup))

HOME_BAKER_PATTERNS = re.compile(
    r"cake|cakes|cupcake|torte|torta|dolci|pasticceria|konditorei|"
    r"home.?bak|hausgemacht|teigware|confectionery|backstube|backerei",
    re.IGNORECASE,
)

NAIL_BEAUTY_PATTERNS = re.compile(
    r"nail|nails|unghie|nagel|beauty|bellezza|kosmetik|"
    r"cosmetics|estetica|esthetic|salon",
    re.IGNORECASE,
)


def classify_business(tags: dict, name: str | None = None) -> dict:
    best: tuple[str, str, int] | None = None
    for (key, value), group, subgroup in ALL_KEYS:
        if tags.get(key) == value:
            conf = 100
            if best is None or conf > best[2]:
                best = (group, subgroup, conf)

    amenity = tags.get("amenity")
    shop = tags.get("shop")
    craft = tags.get("craft")
    key_val = amenity or shop or craft

    if best is None and key_val:
        if key_val in ("restaurant", "cafe", "bar", "fast_food", "pub", "ice_cream"):
            best = ("food", key_val, 90)
        elif key_val in ("clinic", "dentist", "pharmacy", "hospital", "doctors"):
            best = ("healthcare", key_val, 90)
        elif key_val in ("hairdresser", "beauty", "nail_salon", "cosmetics"):
            best = ("beauty", f"{key_val}_salon" if key_val != "nail_salon" else key_val, 90)

    name_lower = (name or "").lower()
    if name_lower:
        if best is None and HOME_BAKER_PATTERNS.search(name_lower):
            best = ("food", "home_baker_candidate", 70)
        if best is None and NAIL_BEAUTY_PATTERNS.search(name_lower):
            best = ("beauty", "nail_salon", 60)

    if best is None:
        return {
            "business_group": "unknown",
            "business_subgroup": None,
            "classification_confidence": 0,
        }

    if best[2] < 100 and name_lower:
        if HOME_BAKER_PATTERNS.search(name_lower) and best[0] == "food":
            best = (best[0], "home_baker_candidate", min(100, best[2] + 10))

    return {
        "business_group": best[0],
        "business_subgroup": best[1],
        "classification_confidence": best[2],
    }
