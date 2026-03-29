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
import tempfile
import time
import unicodedata
import urllib.parse
import urllib.request

import matplotlib
matplotlib.use("Agg")  # headless / no display needed
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.collections import LineCollection
import numpy as np
import matplotlib.patheffects as pe

# ── Configuration ────────────────────────────────────────────────────────────

OUTPUT = "flight_map.png"
FIG_W, FIG_H = 20, 11          # inches
DPI = 200

BG_COLOR     = "#0a0a1a"
LAND_COLOR   = "#1e293b"
COAST_COLOR  = "#2a3a4e"
ARC_COLOR    = "#06b6d4"       # cyan
CITY_COLOR   = "#f59e0b"       # amber
TEXT_COLOR   = "#e2e8f0"
TEXT2_COLOR  = "#94a3b8"

# ── City geocoding (Nominatim / OpenStreetMap, local cache) ──────────────────

CITY_CACHE_FILE = os.path.join(os.path.dirname(__file__), ".cities_cache.json")
_city_cache: dict = {}

def _load_city_cache():
    global _city_cache
    if os.path.exists(CITY_CACHE_FILE):
        with open(CITY_CACHE_FILE, encoding="utf-8") as f:
            _city_cache = json.load(f)

def _save_city_cache():
    with open(CITY_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(_city_cache, f, indent=2, ensure_ascii=False)

_load_city_cache()

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize(name: str) -> str:
    """Lowercase + strip accents (handles São Paulo → sao paulo)."""
    return unicodedata.normalize("NFD", name.lower()).encode("ascii", "ignore").decode()


def geocode_city(name: str):
    """Return (lat, lon, country) via local cache or Nominatim API."""
    key = normalize(name)
    if key in _city_cache:
        e = _city_cache[key]
        return e["lat"], e["lon"], e["country"]

    print(f"  Geocoding: {name} …")
    url = ("https://nominatim.openstreetmap.org/search?"
           f"q={urllib.parse.quote(name)}&format=json&limit=1&addressdetails=1")
    req = urllib.request.Request(url, headers={
        "User-Agent": "flight-map-visualizer/1.0",
        "Accept-Language": "en",
    })
    try:
        time.sleep(1)   # Nominatim fair-use: max 1 req/sec
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        if not data:
            print(f"  Geocode failed for: {name}")
            return None
        result = data[0]
        lat     = float(result["lat"])
        lon     = float(result["lon"])
        country = result.get("address", {}).get("country", "Unknown")
        _city_cache[key] = {"lat": lat, "lon": lon, "country": country}
        _save_city_cache()
        return lat, lon, country
    except Exception as e:
        print(f"  Geocode error for {name}: {e}")
        return None


def lookup(name: str):
    result = geocode_city(name)
    return (result[0], result[1]) if result else None


def lookup_country(name: str):
    result = geocode_city(name)
    return result[2] if result else None


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
GEOJSON_CACHE = os.path.join(tempfile.gettempdir(), "ne_110m_countries.geojson")

def load_world():
    if not os.path.exists(GEOJSON_CACHE):
        print("Downloading world outlines …")
        try:
            urllib.request.urlretrieve(GEOJSON_URL, GEOJSON_CACHE)
        except Exception as e:
            print(f"  Failed ({e}) — world outlines will be skipped")
            return []
    with open(GEOJSON_CACHE, encoding="utf-8") as f:
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
    """
    CSV schema: year, origin_city, transfer_city, dest_city
    Each row becomes 1 arc segment (no transfer) or 2 arc segments (with transfer).
    is_transfer=True marks that the destination of that segment is a hub stop.
    """
    segments = []
    csv_path = os.path.join(os.path.dirname(__file__), "flight_history.csv")
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                year = int(row["year"])
            except (KeyError, ValueError):
                continue

            origin   = row["origin_city"].strip()
            transfer = row.get("transfer_city", "").strip()
            dest     = row["dest_city"].strip()

            o_coords = lookup(origin)
            d_coords = lookup(dest)

            if not o_coords:
                print(f"  Unknown city: {origin}")
                continue
            if not d_coords:
                print(f"  Unknown city: {dest}")
                continue

            if transfer:
                t_coords = lookup(transfer)
                if not t_coords:
                    print(f"  Unknown transfer city: {transfer}")
                    # fall back to direct arc
                    segments.append({
                        "origin": origin, "dest": dest,
                        "origin_coords": o_coords, "dest_coords": d_coords,
                        "dist_km": haversine(*o_coords, *d_coords),
                        "year": year, "is_transfer": False,
                    })
                else:
                    # leg 1: origin → transfer hub
                    segments.append({
                        "origin": origin, "dest": transfer,
                        "origin_coords": o_coords, "dest_coords": t_coords,
                        "dist_km": haversine(*o_coords, *t_coords),
                        "year": year, "is_transfer": True,
                    })
                    # leg 2: transfer hub → destination
                    segments.append({
                        "origin": transfer, "dest": dest,
                        "origin_coords": t_coords, "dest_coords": d_coords,
                        "dist_km": haversine(*t_coords, *d_coords),
                        "year": year, "is_transfer": False,
                    })
            else:
                segments.append({
                    "origin": origin, "dest": dest,
                    "origin_coords": o_coords, "dest_coords": d_coords,
                    "dist_km": haversine(*o_coords, *d_coords),
                    "year": year, "is_transfer": False,
                })
    return segments


# ── Stats ─────────────────────────────────────────────────────────────────────

def compute_stats(flights):
    total_km = sum(f["dist_km"] for f in flights)
    hours    = sum(f["dist_km"] / 850 + 0.5 for f in flights)

    # Real destination cities only (exclude transfer hubs)
    real_cities = set()
    hub_cities  = set()
    for f in flights:
        real_cities.add(f["origin"])
        if f["is_transfer"]:
            hub_cities.add(f["dest"])
        else:
            real_cities.add(f["dest"])
    real_cities -= hub_cities  # cities that appear only as hubs stay out

    # Countries via CITIES lookup
    countries = set()
    for city in real_cities:
        c = lookup_country(city)
        if c:
            countries.add(c)

    by_year = {}
    for f in flights:
        by_year[f["year"]] = by_year.get(f["year"], 0) + 1
    busiest = max(by_year, key=by_year.get)

    longest = max(flights, key=lambda f: f["dist_km"])

    city_counts = {}
    for city in real_cities:
        city_counts[city] = sum(
            1 for f in flights
            if f["origin"] == city or (f["dest"] == city and not f["is_transfer"])
        )
    top_city = max(city_counts, key=city_counts.get)

    return {
        "total_flights":  len(flights),
        "total_km":       total_km,
        "earth_laps":     total_km / 40075,
        "hours":          hours,
        "countries":      len(countries),
        "cities":         len(real_cities),
        "busiest_year":   busiest,
        "busiest_count":  by_year[busiest],
        "longest_route":  f"{longest['origin']} → {longest['dest']}",
        "longest_km":     longest["dist_km"],
        "top_city":       top_city,
        "top_city_count": city_counts[top_city],
    }


# ── Draw ──────────────────────────────────────────────────────────────────────

def draw(flights, world_polys):
    stats = compute_stats(flights)
    print(f"  {stats['total_flights']} flights  |  "
          f"{stats['total_km']:,.0f} km  |  "
          f"{stats['countries']} countries  |  "
          f"{stats['cities']} cities")

    fig = plt.figure(figsize=(FIG_W, FIG_H), facecolor=BG_COLOR)
    ax  = fig.add_axes([0.01, 0.13, 0.74, 0.84])   # main map
    ax.set_facecolor(BG_COLOR)
    ax.set_xlim(-180, 180)
    ax.set_ylim(-75, 85)          # crop Antarctica, show more north
    ax.set_aspect("equal")
    ax.axis("off")

    # ── Coordinate tick labels (professional cartography look) ──
    for lat in range(-60, 91, 30):
        label = f"{abs(lat)}°{'N' if lat >= 0 else 'S'}"
        ax.text(-179, lat, label, fontsize=4.5, color=TEXT2_COLOR,
                alpha=0.35, va="center", ha="left", fontfamily="monospace")
    for lon in range(-150, 181, 30):
        label = f"{abs(lon)}°{'E' if lon >= 0 else 'W'}"
        ax.text(lon, -73, label, fontsize=4.5, color=TEXT2_COLOR,
                alpha=0.35, va="bottom", ha="center", fontfamily="monospace")

    # ── Graticule (lat/lon grid) ──
    graticule_color = "#ffffff"
    for lat in range(-60, 91, 30):
        ax.axhline(lat, color=graticule_color, lw=0.25, alpha=0.07, zorder=0, linestyle="-")
    for lon in range(-180, 181, 30):
        ax.axvline(lon, color=graticule_color, lw=0.25, alpha=0.07, zorder=0, linestyle="-")
    # equator slightly more visible
    ax.axhline(0, color=graticule_color, lw=0.4, alpha=0.12, zorder=0)

    # ── World polygons ──
    for rings in world_polys:
        for ring in rings:
            xs = [c[0] for c in ring]
            ys = [c[1] for c in ring]
            ax.fill(xs, ys, color=LAND_COLOR, linewidth=0, zorder=1)
            ax.plot(xs, ys, color=COAST_COLOR, linewidth=0.5, zorder=2)

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
        # Line width scales with distance (primary) + repeat routes (bonus)
        lw = 0.45 + min(f["dist_km"] / 2800, 3.2) + min(repeats - 1, 4) * 0.18
        for seg in split_antimeridian(pts):
            if len(seg) < 2:
                continue
            xs = [p[1] for p in seg]
            ys = [p[0] for p in seg]
            # soft glow halo
            ax.plot(xs, ys, color=ARC_COLOR, lw=lw*3.5, alpha=0.06, zorder=3, solid_capstyle="round")
            # main arc — solid, clean
            ax.plot(xs, ys, color=ARC_COLOR, lw=lw, alpha=0.85, zorder=5, solid_capstyle="round")

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

    HUB_COLOR = "#818cf8"   # soft indigo — distinct from amber cities and cyan arcs

    # Label offsets (dx_deg, dy_deg, ha) for every city in CITIES dict
    CITY_LABEL_OFFSETS = {
        "edinburgh": (-2.5,  1.8, "right"), "london":    (-2.5, -2.5, "right"),
        "dublin":    (-3.0,  1.5, "right"), "stockholm": ( 2.5,  1.5, "left"),
        "amsterdam": ( 2.5,  1.8, "left"),  "paris":     ( 2.5, -2.5, "left"),
        "frankfurt": ( 2.5,  1.5, "left"),  "munich":    ( 2.5, -2.5, "left"),
        "zurich":    (-2.5, -2.5, "right"), "alicante":  (-2.5, -2.0, "right"),
        "valencia":  (-2.5,  1.8, "right"), "limassol":  ( 2.5,  1.5, "left"),
        "paphos":    (-2.5, -2.5, "right"), "istanbul":  ( 2.5,  1.5, "left"),
        "cairo":     ( 2.5, -2.5, "left"),  "doha":      ( 2.5, -2.0, "left"),
        "chengdu":   (-2.5,  1.5, "right"), "beijing":   ( 2.5,  1.5, "left"),
        "shanghai":  ( 2.5, -2.5, "left"),  "hong kong": ( 2.5, -2.5, "left"),
        "bangkok":   ( 2.5,  1.5, "left"),  "chiang mai":(-2.5,  1.5, "right"),
        "singapore": ( 2.5, -2.5, "left"),  "new york":  (-2.5,  1.5, "right"),
        "washington d.c.": (-2.5, -3.0, "right"),
        "chicago":       (-2.5,  1.5, "right"), "atlanta":     (-2.5, -2.5, "right"),
        "houston":       (-2.5,  1.5, "right"), "los angeles": (-2.5,  1.8, "right"),
        "san francisco": (-2.5,  1.5, "right"), "san diego":   (-2.5, -2.5, "right"),
        "rio de janeiro": (2.5,  1.5, "left"),  "sao paulo":   ( 2.5, -2.5, "left"),
    }
    DISPLAY_NAMES = {
        "sao paulo": "São Paulo",      "rio de janeiro": "Rio de Janeiro",
        "washington d.c.": "Washington D.C.", "chiang mai": "Chiang Mai",
        "hong kong": "Hong Kong",      "san francisco": "San Francisco",
        "los angeles": "Los Angeles",  "san diego": "San Diego",
        "new york": "New York",
    }

    # Text halo for label readability over land/arcs
    _halo = [pe.withStroke(linewidth=2.5, foreground=BG_COLOR)]

    # Transfer hubs — hollow ring + muted label
    for city, info in hub_cities.items():
        lat, lon = info["coords"]
        ax.scatter(lon, lat, s=300, color=HUB_COLOR, alpha=0.07, zorder=6, linewidths=0)
        ax.scatter(lon, lat, s=70,  facecolors="none", edgecolors=HUB_COLOR,
                   alpha=0.80, zorder=7, linewidths=1.3)
        ax.scatter(lon, lat, s=8,   color=HUB_COLOR, alpha=0.75, zorder=8, linewidths=0)
        key = normalize(city)
        dx, dy, ha = CITY_LABEL_OFFSETS.get(key, (2.5, 1.5, "left"))
        label = DISPLAY_NAMES.get(key, city.title())
        ax.text(lon + dx, lat + dy, label, fontsize=4.5, color=HUB_COLOR,
                ha=ha, va="center", fontfamily="monospace", alpha=0.65, zorder=13,
                clip_on=True, path_effects=_halo)

    # Destination cities — bright amber glow + label every city
    for city, info in dest_cities.items():
        lat, lon = info["coords"]
        c = info["count"]
        size_scale = min(1.0 + c * 0.08, 2.2)
        ax.scatter(lon, lat, s=500*size_scale, color=CITY_COLOR, alpha=0.03, zorder=9,  linewidths=0)
        ax.scatter(lon, lat, s=150*size_scale, color=CITY_COLOR, alpha=0.10, zorder=10, linewidths=0)
        ax.scatter(lon, lat, s=40*size_scale,  color=CITY_COLOR, alpha=0.45, zorder=11, linewidths=0)
        ax.scatter(lon, lat, s=10,             color=CITY_COLOR, alpha=1.0,  zorder=12, linewidths=0)
        key = normalize(city)
        dx, dy, ha = CITY_LABEL_OFFSETS.get(key, (2.5, 1.5, "left"))
        label = DISPLAY_NAMES.get(key, city.title())
        ax.text(lon + dx, lat + dy, label, fontsize=5.0, color=TEXT2_COLOR,
                ha=ha, va="center", fontfamily="monospace", alpha=0.85, zorder=13,
                clip_on=True, path_effects=_halo)

    # star for home base Edinburgh
    elat, elon, _ = geocode_city("Edinburgh")
    ax.scatter(elon, elat, s=120, color=CITY_COLOR, alpha=1.0, zorder=14,
               marker="*", linewidths=0)

    # ── Countries panel (right-side empty Pacific space) ──
    # Only destination countries (same logic as compute_stats)
    _real = set()
    _hub_only = set()
    for f in flights:
        _real.add(f["origin"])
        if f["is_transfer"]:
            _hub_only.add(f["dest"])
        else:
            _real.add(f["dest"])
    _real -= _hub_only
    dest_countries = set()
    for _c in _real:
        _cc = lookup_country(_c)
        if _cc:
            dest_countries.add(_cc)
    sorted_ctry = sorted(dest_countries)
    n_ctry = len(sorted_ctry)

    # Panel at lon ~149, lat 60 downward, step 4.2° per row
    px, py0, pstep = 149.0, 60.0, 4.2
    box_h = n_ctry * pstep + 4.5
    # Semi-opaque panel background with subtle border
    ax.add_patch(mpatches.FancyBboxPatch(
        (px - 2.0, py0 - box_h + 1.0), 20.0, box_h + 4.0,
        boxstyle="round,pad=0.6", linewidth=0.4, edgecolor="#334155",
        facecolor="#0d1117", alpha=0.88, zorder=17))
    # Amber accent line on the left of the panel
    ax.plot([px - 1.2, px - 1.2], [py0 + 2.5, py0 - box_h + 2.5],
            color=CITY_COLOR, lw=1.2, alpha=0.45, zorder=18)
    # Title
    ax.text(px, py0 + 2.2, f"{n_ctry} COUNTRIES",
            fontsize=6.5, color=CITY_COLOR, ha="left", va="bottom",
            fontfamily="monospace", fontweight="bold", alpha=0.90, zorder=20)
    for i, country in enumerate(sorted_ctry):
        lat = py0 - i * pstep
        ax.scatter(px + 0.3, lat, s=22, color=CITY_COLOR, alpha=0.85,
                   zorder=21, linewidths=0)
        ax.text(px + 2.2, lat, country, fontsize=7, color=TEXT2_COLOR,
                va="center", ha="left", fontfamily="monospace", alpha=0.88, zorder=20,
                path_effects=_halo)

    # ── Stats panel (right sidebar) ──
    sx = fig.add_axes([0.76, 0.13, 0.24, 0.84])
    sx.set_facecolor("#0d1117")
    sx.axis("off")

    def stat(y, label, value, sub=None):
        # Label — small caps, sits tight above the value
        sx.text(0.12, y, label.upper(),
                transform=sx.transAxes, fontsize=6.5, color=TEXT2_COLOR,
                fontfamily="monospace", va="top", alpha=0.65)
        # Value — large, immediately below label
        sx.text(0.12, y - 0.026, value,
                transform=sx.transAxes, fontsize=15, color=TEXT_COLOR,
                fontweight="bold", va="top")
        # Sub-note — tight below value
        if sub:
            sx.text(0.12, y - 0.062, sub,
                    transform=sx.transAxes, fontsize=7.5, color=TEXT2_COLOR,
                    va="top", alpha=0.65)

    sx.text(0.12, 0.975, "YILI'S FLIGHT MAP",
            transform=sx.transAxes, fontsize=13, color=CITY_COLOR,
            fontweight="bold", fontfamily="monospace", va="top", alpha=0.95)
    sx.text(0.12, 0.920, "personal flight history  2008 – 2026",
            transform=sx.transAxes, fontsize=7.5, color=TEXT2_COLOR, va="top", alpha=0.7)

    # divider
    sx.axhline(0.900, color="#1e293b", lw=0.8)

    # 8 stat blocks evenly spaced from 0.885 down — step = 0.09
    # bottom block sub ends at ~0.193, leaving room for legend + provenance
    stat(0.885, "Total Flights",   f"{stats['total_flights']}")
    stat(0.795, "Total Distance",  f"{stats['total_km']:,.0f} km",
         f"{stats['earth_laps']:.1f}× Earth circumference")
    stat(0.705, "Time in Air",     f"{int(stats['hours'])} h",
         f"≈ {stats['hours']/24:.0f} days aloft")
    stat(0.615, "Countries",       f"{stats['countries']}")
    stat(0.525, "Cities",          f"{stats['cities']}")
    stat(0.435, "Busiest Year",    f"{stats['busiest_year']}",
         f"{stats['busiest_count']} flights that year")
    stat(0.345, "Longest Flight",  f"{stats['longest_km']:,.0f} km",
         stats['longest_route'])
    stat(0.255, "Most Visited",    stats['top_city'],
         f"{stats['top_city_count']} appearances")

    # ── Legend ──
    sx.axhline(0.175, color="#1e293b", lw=0.6, alpha=0.8)
    sx.scatter([0.14], [0.155], s=20, color=CITY_COLOR, alpha=0.9,
               transform=sx.transAxes, zorder=10, linewidths=0, clip_on=False)
    sx.text(0.22, 0.155, "destination city", transform=sx.transAxes,
            fontsize=6, color=TEXT2_COLOR, va="center", alpha=0.65)
    sx.scatter([0.14], [0.132], s=18, facecolors="none", edgecolors=HUB_COLOR,
               alpha=0.80, transform=sx.transAxes, zorder=10, linewidths=0.9, clip_on=False)
    sx.text(0.22, 0.132, "transfer / layover", transform=sx.transAxes,
            fontsize=6, color=TEXT2_COLOR, va="center", alpha=0.65)

    # ── Data provenance ──
    sx.axhline(0.110, color="#1e293b", lw=0.4, alpha=0.5)
    provenance = (
        "Data: historical flights recovered by cross-referencing\n"
        "passport stamps & email confirmations. Future flights\n"
        "tracked automatically via Claude AI (email parsing).\n"
        "Stats computed by Claude AI."
    )
    sx.text(0.12, 0.100, provenance,
            transform=sx.transAxes, fontsize=5.5, color=TEXT2_COLOR,
            va="top", alpha=0.4, linespacing=1.6)

    # ── Bottom year bar chart ──
    by_year = {}
    for f in flights:
        by_year[f["year"]] = by_year.get(f["year"], 0) + 1
    years = sorted(by_year)
    yr_min, yr_max = min(years), max(years)

    bx = fig.add_axes([0.01, 0.01, 0.74, 0.10])
    bx.set_facecolor(BG_COLOR)
    bx.axis("off")

    all_years = list(range(yr_min, yr_max + 1))
    max_cnt = max(by_year.values())
    for i, yr in enumerate(all_years):
        cnt = by_year.get(yr, 0)
        if cnt > 0:
            alpha = 0.35 + 0.65 * (cnt / max_cnt)
            bx.bar(i, cnt, color=CITY_COLOR, alpha=alpha, width=0.72, bottom=0,
                   linewidth=0)
            # count label on top of bar
            bx.text(i, cnt + 0.18, str(cnt), ha="center", va="bottom",
                    fontsize=4.5, color=CITY_COLOR, alpha=alpha * 0.8,
                    fontfamily="monospace", fontweight="bold")
        else:
            bx.bar(i, 0.15, color="#1e293b", alpha=0.6, width=0.72, bottom=0,
                   linewidth=0)
        yr_label = str(yr) if yr % 2 == 0 else f"'{str(yr)[-2:]}"
        bx.text(i, -0.25, yr_label, ha="center", va="top",
                fontsize=5.2, color=TEXT2_COLOR if cnt else "#374151",
                fontfamily="monospace")

    bx.set_xlim(-0.5, len(all_years) - 0.5)
    bx.set_ylim(-0.5, max_cnt + 0.5)

    # "YEAR" label
    bx.text(-0.5, max_cnt * 0.5, "YEAR", va="center", ha="right",
            fontsize=5.5, color=TEXT2_COLOR, fontfamily="monospace", alpha=0.5)

    # fill the bottom-right gap (sidebar only covers y=0.13–0.97; below that is figure bg)
    import matplotlib.patches as mpatches2
    fig.patches.append(mpatches2.Rectangle(
        (0.76, 0.0), 0.24, 0.13, transform=fig.transFigure,
        facecolor="#0d1117", linewidth=0, zorder=0))

    # thin separators
    import matplotlib.lines as mlines
    fig.add_artist(mlines.Line2D(
        [0.01, 0.75], [0.12, 0.12], transform=fig.transFigure,
        color="#1e293b", linewidth=0.8))
    fig.add_artist(mlines.Line2D(
        [0.76, 0.76], [0.0, 1.0], transform=fig.transFigure,
        color="#1e293b", linewidth=0.8))

    plt.savefig(OUTPUT, dpi=DPI, bbox_inches="tight", pad_inches=0.05,
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
