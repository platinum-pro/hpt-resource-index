#!/usr/bin/env python3
"""Convert HPT Resource Index.xlsx into data/data.json for the dashboard.

Run from the project root after updating the spreadsheet:

    python3 scripts/xlsx_to_json.py

Column positions below mirror the fixed layout of "HPT Resource Index.xlsx"
(row 2 = headers, data starts row 3). If columns are inserted/reordered in the
spreadsheet, update COLUMNS to match.
"""

import json
from pathlib import Path

import openpyxl

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


def coerce(value, value_type):
    if value is None or value == "":
        return None
    try:
        return value_type(value)
    except (TypeError, ValueError):
        return str(value)


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

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(records)} studies to {JSON_PATH}")


if __name__ == "__main__":
    main()
