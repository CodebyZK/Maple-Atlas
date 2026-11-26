"""Generate src/canadaGeometry.ts from Natural Earth province boundaries.

Usage (Python 3.10+, no dependencies):

    python scripts/build_canada_map.py ne_50m_admin_1_states_provinces.geojson

Download the input from Natural Earth (public domain):
https://www.naturalearthdata.com/downloads/50m-cultural-vectors/
or https://github.com/nvkelso/natural-earth-vector/tree/master/geojson

The shapes are projected with Statistics Canada's Lambert conformal conic,
small islands are dropped, outlines are simplified, and the result is fitted
to a fixed SVG viewBox. Only the generated TypeScript is committed.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / "src" / "canadaGeometry.ts"
WIDTH = 1000.0
PADDING = 8.0
# Douglas-Peucker tolerance and minimum ring area, in output pixels.
TOLERANCE = 1.1
MIN_RING_AREA = 14.0
# Small provinces keep more detail so they stay recognisable.
SMALL = {"PE", "NS", "NB"}
SMALL_TOLERANCE = 0.45
SMALL_MIN_RING_AREA = 1.5

NAMES = {
    "AB": "Alberta",
    "BC": "British Columbia",
    "MB": "Manitoba",
    "NB": "New Brunswick",
    "NL": "Newfoundland and Labrador",
    "NS": "Nova Scotia",
    "NT": "Northwest Territories",
    "NU": "Nunavut",
    "ON": "Ontario",
    "PE": "Prince Edward Island",
    "QC": "Quebec",
    "SK": "Saskatchewan",
    "YT": "Yukon",
}

# Statistics Canada Lambert conformal conic (EPSG:3347 parameters).
PHI1, PHI2 = math.radians(49.0), math.radians(77.0)
PHI0, LAMBDA0 = math.radians(63.390675), math.radians(-91.866667)
N = math.log(math.cos(PHI1) / math.cos(PHI2)) / math.log(
    math.tan(math.pi / 4 + PHI2 / 2) / math.tan(math.pi / 4 + PHI1 / 2)
)
F = math.cos(PHI1) * math.tan(math.pi / 4 + PHI1 / 2) ** N / N
RHO0 = F / math.tan(math.pi / 4 + PHI0 / 2) ** N


def project(lon: float, lat: float) -> tuple[float, float]:
    phi, lam = math.radians(lat), math.radians(lon)
    rho = F / math.tan(math.pi / 4 + phi / 2) ** N
    theta = N * (lam - LAMBDA0)
    return rho * math.sin(theta), RHO0 - rho * math.cos(theta)


def area(ring: list[tuple[float, float]]) -> float:
    return abs(
        sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))
    ) / 2


def simplify(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Douglas-Peucker for a closed ring (first point equals last).

    A closed ring's endpoints coincide, so it is split at the point farthest
    from the start and each half is simplified as an open line.
    """
    if len(points) < 4:
        return points
    x0, y0 = points[0]
    split = max(range(len(points)), key=lambda i: math.hypot(points[i][0] - x0, points[i][1] - y0))
    first = _simplify_line(points[: split + 1], tolerance)
    second = _simplify_line(points[split:], tolerance)
    return first[:-1] + second


def _simplify_line(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    """Iterative Douglas-Peucker for an open line."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        (x1, y1), (x2, y2) = points[start], points[end]
        dx, dy = x2 - x1, y2 - y1
        length = math.hypot(dx, dy) or 1e-12
        best, index = 0.0, -1
        for i in range(start + 1, end):
            x, y = points[i]
            distance = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length
            if distance > best:
                best, index = distance, i
        if best > tolerance and index != -1:
            keep[index] = True
            stack.extend([(start, index), (index, end)])
    return [point for point, kept in zip(points, keep) if kept]


def main(source: Path) -> None:
    features = [
        feature
        for feature in json.loads(source.read_text(encoding="utf-8"))["features"]
        if feature["properties"].get("adm0_a3") == "CAN"
    ]
    projected: dict[str, list[list[tuple[float, float]]]] = {}
    for feature in features:
        code = feature["properties"]["postal"]
        geometry = feature["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        # Outer rings only: lakes and holes are not needed at this scale.
        projected[code] = [[project(lon, lat) for lon, lat in polygon[0]] for polygon in polygons]
    assert set(projected) == set(NAMES), sorted(projected)

    xs = [x for rings in projected.values() for ring in rings for x, _ in ring]
    ys = [y for rings in projected.values() for ring in rings for _, y in ring]
    scale = (WIDTH - 2 * PADDING) / (max(xs) - min(xs))
    height = (max(ys) - min(ys)) * scale + 2 * PADDING

    def to_view(point: tuple[float, float]) -> tuple[float, float]:
        x, y = point
        return (x - min(xs)) * scale + PADDING, (max(ys) - y) * scale + PADDING

    lines = [
        "// Generated by scripts/build_canada_map.py from Natural Earth",
        "// (public domain). Do not edit by hand.",
        "",
        f"export const CANADA_VIEWBOX = \"0 0 {WIDTH:.0f} {height:.0f}\";",
        "",
        "export interface ProvinceShape {",
        "  code: string;",
        "  name: string;",
        "  d: string;",
        "}",
        "",
        "export const PROVINCE_SHAPES: ProvinceShape[] = [",
    ]
    total_points = 0
    for code in sorted(projected, key=lambda key: NAMES[key]):
        tolerance = SMALL_TOLERANCE if code in SMALL else TOLERANCE
        min_area = SMALL_MIN_RING_AREA if code in SMALL else MIN_RING_AREA
        rings = [[to_view(point) for point in ring] for ring in projected[code]]
        largest = max(area(ring) for ring in rings)
        parts = []
        for ring in sorted(rings, key=area, reverse=True):
            if area(ring) < min_area and area(ring) != largest:
                continue
            simple = simplify(ring, tolerance)
            if len(simple) < 4:
                continue
            total_points += len(simple)
            parts.append(
                "M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in simple[:-1]) + "Z"
            )
        lines.append(f'  {{ code: "{code}", name: "{NAMES[code]}", d: "{"".join(parts)}" }},')
    lines += ["];", ""]
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size / 1024:.1f} KB, {total_points} points)")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
