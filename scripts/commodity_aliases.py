"""Merges free-text `commodity` variants that are pure synonyms of the same
item -- not a different product form, strain, or administration route (those
stay distinct, e.g. Cannabis concentrates / Indica cannabis / Marijuana
puffs are kept separate from plain Cannabis). Same idea as
demand_model_aliases.py, just for the commodity field.
"""

COMMODITY_ALIASES = {
    # Same substance, different word.
    "Marijuana": "Cannabis",
    "Cannabis/marijuana": "Cannabis",
    "Marijuana flower": "Cannabis flower",
    # Typo.
    "opiods": "Opioids",
    # Regional synonym, same product.
    "Soft drink": "Soda",
    # Less clear-cut than the rest -- little cigars and cigarillos are
    # technically distinct products, but the RA's own compound label
    # ("Little cigars/cigarillos") already treats them as one category.
    "Little cigars/cigarillos": "Cigarillos",
}
