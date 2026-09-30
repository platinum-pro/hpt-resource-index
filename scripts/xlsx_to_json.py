#!/usr/bin/env python3
"""Convert HPT Resource Index.xlsx into data/data.json for the dashboard.

Run from the project root after updating the spreadsheet:

    python3 scripts/xlsx_to_json.py

Column positions below mirror the fixed layout of "HPT Resource Index.xlsx"
(row 2 = headers, data starts row 3). If columns are inserted/reordered in the
spreadsheet, update COLUMNS to match.
"""

import json
import re
from collections import Counter
from pathlib import Path

import openpyxl

from commodity_aliases import COMMODITY_ALIASES
from commodity_categories import COMMODITY_TO_CATEGORY
from demand_model_aliases import DEMAND_MODEL_ALIASES

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "HPT Resource Index.xlsx"
JSON_PATH = ROOT / "data" / "data.json"

# (spreadsheet column letter, json key, value type)
COLUMNS = [
    ("A", "study_id", str),
    ("B", "year", int),
    ("C", "journal", str),
    ("D", "doi", str),
    ("E", "url", str),
    ("F", "pub_type", str),
    ("G", "open_access", str),
    ("H", "commodity", str),
    ("I", "commodity_domain", str),
    ("J", "study_design", str),
    ("K", "participant_assignment", str),
    ("L", "individual_analysis", str),
    ("M", "aggregate_analysis", str),
    ("N", "country", str),
    ("O", "region", str),
    ("P", "sample_size", int),
    ("Q", "population", str),
    ("R", "mean_age", float),
    ("S", "num_prices", int),
    ("T", "lowest_price", float),
    ("U", "highest_price", float),
    ("V", "currency", str),
    ("W", "demand_model", str),
    ("X", "k_value", float),
    ("Y", "has_alpha", str),
    ("Z", "has_q0", str),
    ("AA", "has_k", str),
    ("AB", "has_breakpoint", str),
    ("AC", "has_pmax", str),
    ("AD", "has_essential_value", str),
    ("AE", "has_r2", str),
    ("AF", "other_index", str),
    ("AG", "mean_alpha", float),
    ("AH", "mean_q0", float),
    ("AI", "mean_breakpoint", float),
    ("AJ", "mean_pmax", float),
    ("AK", "mean_r2", float),
    ("AL", "notes", str),
]

HEADER_ROW = 2
FIRST_DATA_ROW = 3

# Short categorical fields (used in filters/breakdown charts) where two
# values that differ only in *where* whitespace falls -- "Leisure/entertainment"
# vs "Leisure / entertainment" -- should still be treated as one category.
# Free-text fields (notes, journal, population, ...) are left alone, since
# collapsing their whitespace could touch meaningful content.
WHITESPACE_INSENSITIVE_FIELDS = {
    "pub_type", "open_access", "commodity", "commodity_domain", "study_design",
    "participant_assignment", "region", "currency", "demand_model",
}


def coerce(value, value_type):
    if isinstance(value, str):
        value = value.strip()
    if value is None or value == "":
        return None
    try:
        result = value_type(value)
    except (TypeError, ValueError):
        result = str(value)
    return result.strip() if isinstance(result, str) else result


def normalize_casing(records):
    """Collapse data-entry variants (stray whitespace, mixed case) of the
    same value down to one spelling, per field, so they don't fragment
    filters and breakdown charts into near-duplicate categories. Only
    touches values that actually collide once trimmed/case-folded — real
    distinct values are untouched.
    """
    string_fields = [key for _, key, value_type in COLUMNS if value_type is str]
    for field in string_fields:
        insensitive = field in WHITESPACE_INSENSITIVE_FIELDS
        counts = Counter(r[field] for r in records if r.get(field))
        groups = {}
        for value, count in counts.items():
            key = re.sub(r"\s+", "", value).casefold() if insensitive else value.casefold()
            groups.setdefault(key, []).append((value, count))
        canonical = {}
        for variants in groups.values():
            if len(variants) > 1:
                winner = max(variants, key=lambda vc: vc[1])[0]
                for value, _ in variants:
                    canonical[value] = winner
        if canonical:
            for r in records:
                if r.get(field) in canonical:
                    r[field] = canonical[r[field]]


def apply_demand_model_aliases(records):
    """Merges confident-only demand_model wording variants -- see
    scripts/demand_model_aliases.py for what's covered and why the rest
    isn't. Applied before normalize_casing so any stray whitespace/casing
    on the merged results still gets cleaned up.
    """
    for r in records:
        value = r.get("demand_model")
        if value in DEMAND_MODEL_ALIASES:
            r["demand_model"] = DEMAND_MODEL_ALIASES[value]


def apply_commodity_aliases(records):
    """Merges confident-only commodity wording variants -- see
    scripts/commodity_aliases.py for what's covered and why. Applied before
    assign_commodity_category so the category lookup sees the canonical
    spelling, not the raw one.
    """
    for r in records:
        value = r.get("commodity")
        if value in COMMODITY_ALIASES:
            r["commodity"] = COMMODITY_ALIASES[value]


def assign_commodity_category(records):
    """Derives commodity_category from commodity via COMMODITY_TO_CATEGORY.
    Not a real spreadsheet column -- computed here so it can't drift out of
    sync with the commodity text. Anything not in the mapping (a new
    commodity an RA has since coded) is left as None and flagged below.
    """
    unmapped = set()
    for r in records:
        commodity = r.get("commodity")
        category = COMMODITY_TO_CATEGORY.get(commodity) if commodity else None
        if commodity and category is None:
            unmapped.add(commodity)
        r["commodity_category"] = category
    if unmapped:
        print("WARNING: no commodity_category mapping for:")
        for c in sorted(unmapped):
            print(f"  - {c!r}")
        print("Add these to scripts/commodity_categories.py and re-run.")


def main():
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb.active

    records = []
    for row in ws.iter_rows(min_row=FIRST_DATA_ROW):
        row_by_col = {cell.column_letter: cell.value for cell in row}
        study_id = row_by_col.get("A")
        if not study_id:
            continue
        record = {
            key: coerce(row_by_col.get(col), value_type)
            for col, key, value_type in COLUMNS
        }
        records.append(record)

    apply_demand_model_aliases(records)
    apply_commodity_aliases(records)
    normalize_casing(records)
    assign_commodity_category(records)

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(records)} studies to {JSON_PATH}")


if __name__ == "__main__":
    main()
