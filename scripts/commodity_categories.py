"""Maps each coded `commodity` value to a small set of controlled-vocabulary
categories, replacing the old free-text `commodity_domain` field (which had
fragmented into a dozen near-singleton "Other (...)" variants).

Built by hand from the 91 distinct commodities in the Sep 2026 data drop —
see CATEGORIES below for the grouping and rationale. Any commodity added
later that isn't listed here falls through as unmapped; xlsx_to_json.py
prints a warning listing those so they can be added.
"""

# category label -> exact commodity strings that belong to it.
CATEGORIES = {
    "Alcohol": [
        "Alcohol",
        "Refillable 16-ounce red “Solo” cup",
    ],
    "Tobacco & Nicotine": [
        "Cigarettes",
        "Cigarettes (assigned study cigarettes, VLNC or NNC)",
        "Cigarettes (usual brand)",
        "Cigarillos",
        "Cigars",
        "Dissolvables",
        "E-cigarette cartridges",
        "E-cigarette liquid (mL)",
        "E-cigarettes",
        "E-cigarettes puffs",
        "Menthol Cigarettes",
        "Nicotine",
        "Nicotine Lozenges",
        "Nicotine gum",
        "Non-menthol Cigarettes",
        "Snus",
        "Tobacco",
        "Tobacco cigarette puffs",
        "Tobacco cigarettes",
    ],
    "Cannabis": [
        "Cannabis",
        "Cannabis concentrates",
        "Cannabis flower",
        "Illegal Cannabis",
        "Indica cannabis",
        "Marijuana puffs",
        "Sativa cannabis",
    ],
    "Opioids": [
        "Abuse-deterrent opioid pills",
        "Heroin",
        "Methadone",
        "Opiate pain relievers",
        "Opioids",
        "Standard opioid pills",
    ],
    "Other substances": [
        "Anabolic-androgenic steroids (AAS)",
        "Benzodiazepine pills",
        "Cocaine",
        "D-amphetamine",
        "Methamphetamine",
        "Prescription sedatives/tranquilizers",
        "Prescription stimulant medication",
        "Prescription stimulants",
    ],
    "Food & Nutrition": [
        "Chocolate",
        "Fine-Dining Restaurant Meal",
        "Food",
        "Hamburger or sandwich",
        "High energy-dense (HED) snack food",
        "Low energy-dense (LED) snack food",
        "Potato chips",
        "Snack food",
        "Soda",
        "Water",
    ],
    "Leisure & Entertainment": [
        "Fuel",
        "Internet Access",
        "Internet use",
        "Pay-Per-View Movie, Show, or Event",
        "Social media time",
        "Vacation Package",
        # Hotel-tier accommodation demand -- distinct commodity strings per
        # tier (meaningfully different products/price points, same pattern
        # as keeping cigarette/cannabis sub-types distinct). Separate from
        # the existing plain "Hotel rooms" entry (Dolan2020), which used a
        # hotel room as a substitute-good proxy in an unrelated study.
        "Economy hotel room",
        "Midscale hotel room",
        "Upscale hotel room",
    ],
    "Health & Prevention": [
        "COVID-19 vaccine",
        "Condoms",
        "Disease-modifying therapy (DMT)",
        "Disease-modifying therapy (DMT) for multiple sclerosis",
        "Emergency Contraceptives",
        "Adherence to infant sleep safety steps",
        "Health insurance",
    ],
    "Household & Personal Care": [
        "Hand lotion",
        "Hand sanitizer",
        "Paper towels",
        "Refrigerator",
        "Toilet paper",
    ],
    "Behavioral (non-substance)": [
        "Driving",
        "Exercise",
        "Fake ID",
        "Gambling",
        "Gym Membership",
        "Hotel rooms",
        "Hypothetical romantic partners",
        "Indoor tanning",
        "Minutes of physical inactivity",
        "Pornography",
        "Public transportation",
        "Sex acts",
        "Texting while driving",
        "Ultraviolet indoor tanning",
    ],
    "Other": [
        "Annual regulatory registration fee",
        # Not really a "commodity" in the usual sense -- a treatment method
        # used as the purchase-task item. Flagged for a second look.
        "Contingency management",
        # Not a purchase/consumption commodity at all -- a policy-support
        # attitude measure, with likelihood-of-success substituted for
        # price. Included per the About page's stated exception for
        # non-monetary price substitutes, but it's the furthest stretch of
        # "commodity" in the index so far.
        "Support for U.S. military intervention",
    ],
}

COMMODITY_TO_CATEGORY = {
    commodity: category
    for category, commodities in CATEGORIES.items()
    for commodity in commodities
}
