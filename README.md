# HPT Resource Index

A public dashboard indexing Hypothetical Purchase Task (HPT) demand studies.
Static Jekyll site, no backend — the dashboard reads a JSON file generated
from `HPT Resource Index.xlsx`.

## Status

Groundwork stage: site shell, data schema, and conversion pipeline are in
place. No studies have been coded yet, so `data/data.json` is an empty
array and the site shows an empty state. Use `?sample=1` on any page
(e.g. `/?sample=1`, `/explore.html?sample=1`) to preview the dashboard
with synthetic sample data.

## Local development

```
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

## Updating data

1. Code studies into `HPT Resource Index.xlsx` (columns are fixed — see
   `scripts/xlsx_to_json.py` for the column-to-field mapping).
2. Regenerate the dashboard's data file:

   ```
   python3 scripts/xlsx_to_json.py
   ```

3. Commit the updated `data/data.json`.

If a column is inserted, deleted, or reordered in the spreadsheet, update
`COLUMNS` in `scripts/xlsx_to_json.py` to match.

## Deployment

Not yet configured. When ready: push this repo to GitHub, enable GitHub
Pages (Jekyll build), and optionally attach a custom subdomain.

## Project structure

```
_config.yml          Jekyll site config
_layouts/default.html   Shared page layout (nav, footer, script include)
index.html            Home page — summary stats
explore.html           Searchable/filterable/sortable study table
about.html             Methodology & codebook description
citation.html          Citation info, contact, license (TBD)
assets/css/style.css   Site styles
assets/js/dashboard.js  Client-side data loading, filtering, sorting, stats
data/data.json          Real data (empty until studies are coded)
data/sample_data.json   Synthetic fixture for UI testing (?sample=1)
scripts/xlsx_to_json.py Converts the spreadsheet to data/data.json
```
