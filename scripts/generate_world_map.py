#!/usr/bin/env python3
"""Generate assets/img/world-outline.svg from Natural Earth land polygons.

Source data (public domain, no attribution required):
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
  (Natural Earth 1:110m physical vectors, "land" layer)

Projection is plain equirectangular (x = lon, y = -lat), matching the
lon/lat -> x/y math used client-side in assets/js/dashboard.js for the
country dot overlay, so the two line up without any shared library.

Re-run only if a higher-resolution or updated land layer is wanted:
    curl -sL <source url above> -o scripts/.ne_110m_land.geojson
    python3 scripts/generate_world_map.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "scripts" / ".ne_110m_land.geojson"
OUT = ROOT / "assets" / "img" / "world-outline.svg"

# Must match WORLD_MAP_W / WORLD_MAP_H in assets/js/dashboard.js.
W, H = 980, 500


def project(lon, lat):
    x = (lon + 180) / 360 * W
    y = (90 - lat) / 180 * H
    return round(x, 1), round(y, 1)


def ring_to_path(ring):
    points = [project(lon, lat) for lon, lat in ring]
    d = "M" + " L".join(f"{x},{y}" for x, y in points) + " Z"
    return d


def main():
    data = json.loads(SRC.read_text())
    subpaths = []
    for feature in data["features"]:
        geom = feature["geometry"]
        if geom["type"] == "Polygon":
            rings = geom["coordinates"]
        elif geom["type"] == "MultiPolygon":
            rings = [ring for poly in geom["coordinates"] for ring in poly]
        else:
            continue
        for ring in rings:
            subpaths.append(ring_to_path(ring))

    d = " ".join(subpaths)
    svg = (
        f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" '
        f'class="world-outline-svg" aria-hidden="true">\n'
        f'  <path d="{d}" class="world-land"></path>\n'
        f"</svg>\n"
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(svg)
    print(f"Wrote {OUT} ({len(svg)} bytes, {len(subpaths)} land polygons)")


if __name__ == "__main__":
    main()
