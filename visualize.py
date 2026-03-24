"""
Flight history visualizer — static showcase figure.
Reads flight_history.csv, draws great-circle arcs and glowing city dots
on a dark world map.  Saves flight_map.png at 2x resolution.

Usage:
    python3 visualize.py
"""

import csv
import json
import math
import os
import urllib.request

import matplotlib
matplotlib.use("Agg")  # headless / no display needed
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.collections import LineCollection
import numpy as np

# ── Configuration ────────────────────────────────────────────────────────────

OUTPUT = "flight_map.png"
FIG_W, FIG_H = 20, 11          # inches
DPI = 200

BG_COLOR     = "#0a0a1a"
LAND_COLOR   = "#1e293b"
COAST_COLOR  = "#0f172a"
ARC_COLOR    = "#06b6d4"       # cyan
CITY_COLOR   = "#f59e0b"       # amber
TEXT_COLOR   = "#e2e8f0"
TEXT2_COLOR  = "#94a3b8"

# ── City coordinates (airport lat/lng) ───────────────────────────────────────

CITIES = {
    "edinburgh":      (55.9533,  -3.1883),
    "london":         (51.4700,  -0.4543),
    "chengdu":        (30.5728, 104.0668),
    "beijing":        (39.9042, 116.4074),
    "hong kong":      (22.3080, 113.9185),
    "new york":       (40.6413, -73.7781),
    "houston":        (29.9902, -95.3368),
    "los angeles":    (33.9425,-118.4081),
    "san diego":      (32.7338,-117.1933),
    "atlanta":        (33.6407, -84.4277),
    "chicago":        (41.9742, -87.9073),
    "washington dc":  (38.9531, -77.4565),
    "alicante":       (38.2822,  -0.5580),
    "valencia":       (39.4893,  -0.4816),
    "limassol":       (34.8721,  33.6226),
    "paphos":         (34.7180,  32.4857),
    "dublin":         (53.4213,  -6.2700),
    "amsterdam":      (52.3105,   4.7683),
    "paris":          (48.8566,   2.3522),
    "frankfurt":      (50.0379,   8.5622),
    "munich":         (48.3538,  11.7861),
    "zurich":         (47.4647,   8.5492),
    "bangkok":        (13.6900, 100.7501),
    "doha":           (25.2732,  51.6080),
    "rio de janeiro": (-22.8090,-43.2436),
    "sao paulo":      (-23.4356,-46.4731),
    "istanbul":       (41.2608,  28.7418),
    "singapore":      ( 1.3644, 103.9915),
    "chiangmai":      (18.7669,  98.9628),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize(name: str) -> str:
    """Lowercase + strip accents (handles São Paulo → sao paulo)."""
    import unicodedata
    return unicodedata.normalize("NFD", name.lower()).encode("ascii", "ignore").decode()


def lookup(name: str):
    key = normalize(name)
    return CITIES.get(key)


def haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def great_circle_points(lat1, lon1, lat2, lon2, n=80):
    """Return list of (lat, lon) along the great-circle path."""
    lat1r, lon1r, lat2r, lon2r = map(math.radians, [lat1, lon1, lat2, lon2])
    x1 = math.cos(lat1r) * math.cos(lon1r)
    y1 = math.cos(lat1r) * math.sin(lon1r)
    z1 = math.sin(lat1r)
    x2 = math.cos(lat2r) * math.cos(lon2r)
    y2 = math.cos(lat2r) * math.sin(lon2r)
    z2 = math.sin(lat2r)
    dot = max(-1.0, min(1.0, x1*x2 + y1*y2 + z1*z2))
    omega = math.acos(dot)
    if omega < 1e-9:
        return [(lat1, lon1)]
    pts = []
    for i in range(n + 1):
        t = i / n
        a = math.sin((1 - t) * omega) / math.sin(omega)
        b = math.sin(t * omega) / math.sin(omega)
        x, y, z = a*x1 + b*x2, a*y1 + b*y2, a*z1 + b*z2
        pts.append((math.degrees(math.asin(z)),
                    math.degrees(math.atan2(y, x))))
    return pts


def split_antimeridian(pts):
    """Split a lat/lon path where it crosses the ±180° boundary."""
    segments = []
    seg = [pts[0]]
    for i in range(1, len(pts)):
        if abs(pts[i][1] - pts[i-1][1]) > 180:
            segments.append(seg)
            seg = [pts[i]]
        else:
            seg.append(pts[i])
    segments.append(seg)
    return segments


# ── Load world polygons (GeoJSON) ─────────────────────────────────────────────

GEOJSON_URL  = ("https://raw.githubusercontent.com/nvkelso/"
                "natural-earth-vector/master/geojson/"
                "ne_110m_admin_0_countries.geojson")
GEOJSON_CACHE = "/tmp/ne_110m_countries.geojson"

def load_world():
    if not os.path.exists(GEOJSON_CACHE):
        print("Downloading world outlines …")
        try:
            urllib.request.urlretrieve(GEOJSON_URL, GEOJSON_CACHE)
        except Exception as e:
            print(f"  Failed ({e}) — world outlines will be skipped")
            return []
    with open(GEOJSON_CACHE) as f:
        gj = json.load(f)
    polys = []
    for feat in gj["features"]:
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            polys.append([geom["coordinates"][0]])
        elif geom["type"] == "MultiPolygon":
            polys.extend(ring[:1] for ring in geom["coordinates"])
    return polys


# ── Load flights ──────────────────────────────────────────────────────────────

def load_flights():
    flights = []
    csv_path = os.path.join(os.path.dirname(__file__), "flight_history.csv")
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            o = lookup(row["origin_city"])
            d = lookup(row["dest_city"])
            if not o or not d:
                print(f"  Skipping unknown city: {row['origin_city']} / {row['dest_city']}")
                continue
            try:
                year = int(row["date"].split("/")[0])
            except Exception:
                continue
            flights.append({
                "origin":        row["origin_city"],
                "dest":          row["dest_city"],
                "origin_country":row["origin_country"],
                "dest_country":  row["dest_country"],
                "origin_coords": o,
                "dest_coords":   d,
                "dist_km":       haversine(*o, *d),
                "year":          year,
                "is_transfer":   row.get("transfer","").strip() == "1",
            })
    return flights


# ── Stats ─────────────────────────────────────────────────────────────────────

def compute_stats(flights):
    total_km   = sum(f["dist_km"] for f in flights)
    countries  = {f["origin_country"] for f in flights} | {f["dest_country"] for f in flights}
    cities     = {f["origin"] for f in flights} | {f["dest"] for f in flights}
    hours      = sum(f["dist_km"] / 850 + 0.5 for f in flights)
    by_year    = {}
    for f in flights:
        by_year[f["year"]] = by_year.get(f["year"], 0) + 1
    busiest    = max(by_year, key=by_year.get)
    longest    = max(flights, key=lambda f: f["dist_km"])
    city_counts = {}
    for f in flights:
        city_counts[f["origin"]] = city_counts.get(f["origin"], 0) + 1
        city_counts[f["dest"]]   = city_counts.get(f["dest"], 0) + 1
    top_city   = max(city_counts, key=city_counts.get)
    return {
        "total_flights":   len(flights),
        "total_km":        total_km,
        "earth_laps":      total_km / 40075,
        "hours":           hours,
        "countries":       len(countries),
        "cities":          len(cities),
        "busiest_year":    busiest,
        "busiest_count":   by_year[busiest],
        "longest_route":   f"{longest['origin']} → {longest['dest']}",
        "longest_km":      longest["dist_km"],
        "top_city":        top_city,
        "top_city_count":  city_counts[top_city],
    }


# ── Draw ──────────────────────────────────────────────────────────────────────

def draw(flights, world_polys):
    stats = compute_stats(flights)
    print(f"  {stats['total_flights']} flights  |  "
          f"{stats['total_km']:,.0f} km  |  "
          f"{stats['countries']} countries  |  "
          f"{stats['cities']} cities")

    fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor=BG_COLOR)
    ax  = fig.add_axes([0.01, 0.13, 0.70, 0.84])   # main map
    ax.set_facecolor(BG_COLOR)
    ax.set_xlim(-180, 180)
    ax.set_ylim(-75, 85)          # crop Antarctica, show more north
    ax.set_aspect("equal")
    ax.axis("off")

    # ── World polygons ──
    for rings in world_polys:
        for ring in rings:
            xs = [c[0] for c in ring]
            ys = [c[1] for c in ring]
            ax.fill(xs, ys, color=LAND_COLOR, linewidth=0, zorder=1)
            ax.plot(xs, ys, color=COAST_COLOR, linewidth=0.4, zorder=2)

    # ── Flight arcs ──
    # count duplicate routes for thickness
    route_count = {}
    for f in flights:
        key = tuple(sorted([f["origin"], f["dest"]]))
        route_count[key] = route_count.get(key, 0) + 1

    for f in flights:
        lat1, lon1 = f["origin_coords"]
        lat2, lon2 = f["dest_coords"]
        pts = great_circle_points(lat1, lon1, lat2, lon2, n=80)
        key = tuple(sorted([f["origin"], f["dest"]]))
        repeats = route_count.get(key, 1)
        lw = 0.8 + min(repeats - 1, 6) * 0.2
        for seg in split_antimeridian(pts):
            if len(seg) < 2:
                continue
            xs = [p[1] for p in seg]
            ys = [p[0] for p in seg]
            # outer glow
            ax.plot(xs, ys, color=ARC_COLOR, lw=lw*5, alpha=0.03, zorder=3, solid_capstyle="round")
            # inner glow
            ax.plot(xs, ys, color=ARC_COLOR, lw=lw*2, alpha=0.12, zorder=4, solid_capstyle="round")
            # main arc
            ax.plot(xs, ys, color=ARC_COLOR, lw=lw, alpha=0.65, zorder=5, solid_capstyle="round")

    # ── City glow dots (destination vs transfer hub) ──
    dest_cities, hub_cities = {}, {}
    for f in flights:
        c = f["origin"]
        dest_cities[c] = dest_cities.get(c, {"coords": f["origin_coords"], "count": 0})
        dest_cities[c]["count"] += 1
        c = f["dest"]
        if f["is_transfer"]:
            hub_cities[c] = hub_cities.get(c, {"coords": f["dest_coords"], "count": 0})
            hub_cities[c]["count"] += 1
        else:
            dest_cities[c] = dest_cities.get(c, {"coords": f["dest_coords"], "count": 0})
            dest_cities[c]["count"] += 1

    HUB_COLOR = "#64748b"

    # Transfer hubs — small dim dots
    for city, info in hub_cities.items():
        lat, lon = info["coords"]
        ax.scatter(lon, lat, s=40,  color=HUB_COLOR, alpha=0.15, zorder=6, linewidths=0)
        ax.scatter(lon, lat, s=10,  color=HUB_COLOR, alpha=0.50, zorder=7, linewidths=0)
        ax.scatter(lon, lat, s=3,   color="#94a3b8",  alpha=0.80, zorder=8, linewidths=0)

    # city labels for prominent cities
    LABELS = {
        "Edinburgh":    ( 3,  3, "right"),
        "Chengdu":      ( 3,  3, "left"),
        "London":       (-4, -8, "right"),
        "New York":     ( 3,  3, "left"),
        "Bangkok":      ( 3,  3, "left"),
        "Hong Kong":    ( 3, -7, "left"),
        "Beijing":      ( 3,  3, "left"),
        "Los Angeles":  ( 3,  3, "right"),
        "Rio de Janeiro":( 3, 3, "left"),
        "Singapore":    ( 3,  3, "left"),
        "Chiangmai":    ( 3,  3, "left"),
    }

    # Destination cities — bright amber glow
    for city, info in dest_cities.items():
        lat, lon = info["coords"]
        c = info["count"]
        size_scale = min(1.0 + c * 0.08, 2.2)
        ax.scatter(lon, lat, s=500*size_scale, color=CITY_COLOR, alpha=0.03, zorder=9,  linewidths=0)
        ax.scatter(lon, lat, s=150*size_scale, color=CITY_COLOR, alpha=0.10, zorder=10, linewidths=0)
        ax.scatter(lon, lat, s=40*size_scale,  color=CITY_COLOR, alpha=0.45, zorder=11, linewidths=0)
        ax.scatter(lon, lat, s=10,             color=CITY_COLOR, alpha=1.0,  zorder=12, linewidths=0)

        if city in LABELS:
            dx, dy, ha = LABELS[city]
            ax.annotate(city, xy=(lon, lat), xytext=(lon + dx*0.5, lat + dy*0.3),
                        fontsize=5.5, color=TEXT2_COLOR, ha=ha, va="center",
                        fontfamily="monospace", zorder=13, annotation_clip=True)

    # star for home base Edinburgh
    elat, elon = CITIES["edinburgh"]
    ax.scatter(elon, elat, s=120, color=CITY_COLOR, alpha=1.0, zorder=14,
               marker="*", linewidths=0)

    # ── Stats panel (right sidebar) ──
    sx = fig.add_axes([0.72, 0.13, 0.28, 0.84])
    sx.set_facecolor("#0d1117")
    sx.axis("off")

    # thin left border accent
    sx.axvline(0.0, color=CITY_COLOR, lw=1.5, alpha=0.4)

    def stat(y, label, value, sub=None):
        sx.text(0.12, y, label.upper(),
                transform=sx.transAxes, fontsize=7, color=TEXT2_COLOR,
                fontfamily="monospace", va="top", alpha=0.8)
        sx.text(0.12, y - 0.050, value,
                transform=sx.transAxes, fontsize=17, color=TEXT_COLOR,
                fontweight="bold", va="top")
        if sub:
            sx.text(0.12, y - 0.098, sub,
                    transform=sx.transAxes, fontsize=8, color=TEXT2_COLOR,
                    va="top", alpha=0.7)

    sx.text(0.12, 0.98, "FLIGHT FOG",
            transform=sx.transAxes, fontsize=15, color=CITY_COLOR,
            fontweight="bold", fontfamily="monospace", va="top", alpha=0.95)
    sx.text(0.12, 0.925, "personal flight history  2008 – 2026",
            transform=sx.transAxes, fontsize=8, color=TEXT2_COLOR, va="top", alpha=0.7)

    # divider
    sx.axhline(0.88, color="#1e293b", lw=0.8)

    stat(0.855, "Total Flights",   f"{stats['total_flights']}")
    stat(0.745, "Total Distance",  f"{stats['total_km']:,.0f} km",
         f"{stats['earth_laps']:.1f}×  Earth circumference")
    stat(0.625, "Time in Air",     f"{int(stats['hours'])} h",
         f"≈ {stats['hours']/24:.0f} days aloft")
    stat(0.515, "Countries",       f"{stats['countries']}")
    stat(0.415, "Cities",          f"{stats['cities']}")
    stat(0.315, "Busiest Year",    f"{stats['busiest_year']}",
         f"{stats['busiest_count']} flights that year")
    stat(0.205, "Longest Flight",  f"{stats['longest_km']:,.0f} km",
         stats['longest_route'])
    stat(0.095, "Most Visited",    stats['top_city'],
         f"{stats['top_city_count']} appearances")

    # ── Bottom year bar chart ──
    by_year = {}
    for f in flights:
        by_year[f["year"]] = by_year.get(f["year"], 0) + 1
    years = sorted(by_year)
    yr_min, yr_max = min(years), max(years)

    bx = fig.add_axes([0.01, 0.01, 0.70, 0.10])
    bx.set_facecolor(BG_COLOR)
    bx.axis("off")

    all_years = list(range(yr_min, yr_max + 1))
    max_cnt = max(by_year.values())
    for i, yr in enumerate(all_years):
        cnt = by_year.get(yr, 0)
        if cnt > 0:
            alpha = 0.35 + 0.65 * (cnt / max_cnt)
            bx.bar(i, cnt, color=CITY_COLOR, alpha=alpha, width=0.75, bottom=0,
                   linewidth=0)
        else:
            bx.bar(i, 0.15, color="#1e293b", alpha=0.6, width=0.75, bottom=0,
                   linewidth=0)
        label = str(yr) if yr % 2 == 0 else str(yr)[-2:]
        bx.text(i, -0.25, str(yr), ha="center", va="top",
                fontsize=5.2, color=TEXT2_COLOR if cnt else "#374151",
                fontfamily="monospace")

    bx.set_xlim(-0.5, len(all_years) - 0.5)
    bx.set_ylim(-0.5, max_cnt + 0.5)

    # "YEAR" label
    bx.text(-0.5, max_cnt * 0.5, "YEAR", va="center", ha="right",
            fontsize=5.5, color=TEXT2_COLOR, fontfamily="monospace", alpha=0.5)

    # thin separators
    import matplotlib.lines as mlines
    fig.add_artist(mlines.Line2D(
        [0.01, 0.71], [0.12, 0.12], transform=fig.transFigure,
        color="#1e293b", linewidth=0.8))
    fig.add_artist(mlines.Line2D(
        [0.72, 0.72], [0.0, 1.0], transform=fig.transFigure,
        color="#1e293b", linewidth=0.8))

    plt.savefig(OUTPUT, dpi=DPI, bbox_inches="tight",
                facecolor=BG_COLOR, edgecolor="none")
    print(f"  Saved → {OUTPUT}")
    plt.close(fig)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading world outlines …")
    world = load_world()
    print(f"  {len(world)} polygons loaded")

    print("Loading flights …")
    flights = load_flights()
    print(f"  {len(flights)} flight segments loaded")

    print("Rendering …")
    draw(flights, world)
