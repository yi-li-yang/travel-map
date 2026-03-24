"""
Flight Fog — 3D Globe visualizer (Flighty-inspired aesthetic).
Outputs flight_globe.png.

Usage:  python3 visualize_globe.py
"""

import csv
import json
import math
import os
import unicodedata
import urllib.request

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Ellipse, FancyArrowPatch
from matplotlib.collections import LineCollection
import numpy as np

# ── Palette ──────────────────────────────────────────────────────────────────

BG          = "#020b18"    # deep space
GLOBE_BG    = "#080f22"    # globe face base
LAND_FILL   = "#0c1c3a"    # land masses
LAND_EDGE   = "#152d52"    # coastlines
ATMO_COLOR  = "#38bdf8"    # atmosphere rim (sky blue)

ARC_CORE    = "#f0f9ff"    # near-white arc core
ARC_MID     = "#7dd3fc"    # arc inner glow
ARC_OUTER   = "#0ea5e9"    # arc outer glow

DEST_CORE   = "#fbbf24"    # destination city (amber gold)
DEST_GLOW   = "#f59e0b"
HUB_CORE    = "#334155"    # transfer hub (dim slate)
HUB_GLOW    = "#1e3a5f"
HOME_COLOR  = "#fde047"    # Edinburgh home star (bright gold)

TEXT_PRI    = "#e0f2fe"
TEXT_SEC    = "#64748b"

# ── Globe orientation ─────────────────────────────────────────────────────────
# Center on Europe/Middle East — shows Edinburgh↔Chengdu arc beautifully
GLOBE_LON = 35.0
GLOBE_LAT = 38.0

# ── City coordinates (airport) ────────────────────────────────────────────────

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


def normalize(name):
    return unicodedata.normalize("NFD", name.lower()).encode("ascii", "ignore").decode()


def lookup(name):
    return CITIES.get(normalize(name))


# ── Projection ────────────────────────────────────────────────────────────────

def ortho(lat, lon, lat0=GLOBE_LAT, lon0=GLOBE_LON):
    """Orthographic projection. Returns (x,y) or None if behind globe."""
    φ  = math.radians(lat);  λ  = math.radians(lon)
    φ0 = math.radians(lat0); λ0 = math.radians(lon0)
    cos_c = math.sin(φ0)*math.sin(φ) + math.cos(φ0)*math.cos(φ)*math.cos(λ-λ0)
    if cos_c < 0:
        return None
    x = math.cos(φ) * math.sin(λ - λ0)
    y = math.cos(φ0)*math.sin(φ) - math.sin(φ0)*math.cos(φ)*math.cos(λ-λ0)
    return (x, y)


def ortho_path(pts):
    """Project [(lat,lon),...] → list of visible segments [(x,y),...]."""
    segs, seg = [], []
    for lat, lon in pts:
        p = ortho(lat, lon)
        if p:
            seg.append(p)
        else:
            if len(seg) >= 2:
                segs.append(seg)
            seg = []
    if len(seg) >= 2:
        segs.append(seg)
    return segs


# ── Geometry helpers ──────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    d = math.radians
    a = math.sin(d(lat2-lat1)/2)**2 + math.cos(d(lat1))*math.cos(d(lat2))*math.sin(d(lon2-lon1)/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def great_circle(lat1, lon1, lat2, lon2, n=120):
    lat1r,lon1r,lat2r,lon2r = map(math.radians,[lat1,lon1,lat2,lon2])
    x1=math.cos(lat1r)*math.cos(lon1r); y1=math.cos(lat1r)*math.sin(lon1r); z1=math.sin(lat1r)
    x2=math.cos(lat2r)*math.cos(lon2r); y2=math.cos(lat2r)*math.sin(lon2r); z2=math.sin(lat2r)
    dot = max(-1.0, min(1.0, x1*x2+y1*y2+z1*z2))
    omega = math.acos(dot)
    if omega < 1e-9:
        return [(lat1,lon1)]
    pts=[]
    for i in range(n+1):
        t=i/n
        a=math.sin((1-t)*omega)/math.sin(omega)
        b=math.sin(t*omega)/math.sin(omega)
        x,y,z = a*x1+b*x2, a*y1+b*y2, a*z1+b*z2
        pts.append((math.degrees(math.asin(z)), math.degrees(math.atan2(y,x))))
    return pts


# ── Data loaders ─────────────────────────────────────────────────────────────

GEOJSON_URL   = ("https://raw.githubusercontent.com/nvkelso/"
                 "natural-earth-vector/master/geojson/"
                 "ne_110m_admin_0_countries.geojson")
GEOJSON_CACHE = "/tmp/ne_110m_countries.geojson"

def load_world():
    if not os.path.exists(GEOJSON_CACHE):
        print("  Downloading world outlines …")
        urllib.request.urlretrieve(GEOJSON_URL, GEOJSON_CACHE)
    with open(GEOJSON_CACHE) as f:
        gj = json.load(f)
    polys = []
    for feat in gj["features"]:
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            polys.append(geom["coordinates"][0])
        elif geom["type"] == "MultiPolygon":
            for part in geom["coordinates"]:
                polys.append(part[0])
    return polys


def load_flights():
    flights = []
    path = os.path.join(os.path.dirname(__file__), "flight_history.csv")
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            o = lookup(row["origin_city"])
            d = lookup(row["dest_city"])
            if not o or not d:
                continue
            try:
                year = int(row["date"].split("/")[0])
            except Exception:
                continue
            flights.append({
                "origin":      row["origin_city"],
                "dest":        row["dest_city"],
                "o_country":   row["origin_country"],
                "d_country":   row["dest_country"],
                "oc":          o,
                "dc":          d,
                "dist":        haversine(*o, *d),
                "year":        year,
                "is_transfer": row.get("transfer","").strip() == "1",
            })
    return flights


def city_stats(flights):
    dest_cities, hub_cities = {}, {}
    for f in flights:
        for city, coords, is_hub in [
            (f["origin"], f["oc"], False),   # origin is always a real city (it was a destination before)
            (f["dest"],   f["dc"], f["is_transfer"]),
        ]:
            if is_hub:
                hub_cities[city] = hub_cities.get(city, {"coords": coords, "count": 0})
                hub_cities[city]["count"] += 1
            else:
                dest_cities[city] = dest_cities.get(city, {"coords": coords, "count": 0})
                dest_cities[city]["count"] += 1
    return dest_cities, hub_cities


def compute_stats(flights):
    total_km   = sum(f["dist"] for f in flights)
    countries  = {f["o_country"] for f in flights} | {f["d_country"] for f in flights}
    all_cities = {f["origin"] for f in flights} | {f["dest"] for f in flights}
    dest_cits  = {f["dest"] for f in flights if not f["is_transfer"]}
    by_year    = {}
    for f in flights:
        by_year[f["year"]] = by_year.get(f["year"], 0) + 1
    busiest = max(by_year, key=by_year.get)
    longest = max(flights, key=lambda x: x["dist"])
    return {
        "total":    len(flights),
        "km":       total_km,
        "earths":   total_km / 40075,
        "hours":    sum(f["dist"]/850 + 0.5 for f in flights),
        "countries":len(countries),
        "cities":   len(dest_cits),
        "busiest":  busiest,
        "b_count":  by_year[busiest],
        "longest":  f"{longest['origin']} → {longest['dest']}",
        "long_km":  longest["dist"],
    }


# ── Drawing ───────────────────────────────────────────────────────────────────

def draw_globe_sphere(ax):
    """Background sphere, atmosphere rim, and specular highlight."""
    # Outer atmosphere rings
    theta = np.linspace(0, 2*np.pi, 800)
    ct, st = np.cos(theta), np.sin(theta)
    for lw, alpha in [(50, 0.018), (25, 0.035), (12, 0.05), (5, 0.07)]:
        ax.plot(ct, st, color=ATMO_COLOR, lw=lw, alpha=alpha,
                solid_capstyle="round", zorder=1)

    # Globe face
    globe = Circle((0,0), 1.0, facecolor=GLOBE_BG, edgecolor="none", zorder=2)
    ax.add_patch(globe)

    # Sphere shading: subtle dark vignette at edges
    x = np.linspace(-1, 1, 400)
    y = np.linspace(-1, 1, 400)
    X, Y = np.meshgrid(x, y)
    R2 = X**2 + Y**2
    mask = R2 <= 1.0
    # Darker at edges (limb darkening like a real planet)
    limb = np.where(mask, np.clip((R2 - 0.3) / 0.7, 0, 1) ** 1.5, np.nan)
    ax.imshow(limb, extent=[-1,1,-1,1], cmap="Blues", vmin=0, vmax=1,
              alpha=0.22, zorder=3, origin="lower", interpolation="bilinear")

    # Specular highlight (upper-left, soft)
    spec = Ellipse((-0.28, 0.38), 0.55, 0.38, angle=25,
                   facecolor="white", edgecolor="none", alpha=0.025, zorder=4)
    ax.add_patch(spec)


def draw_land(ax, polys):
    """Fill land polygons using orthographic projection."""
    for ring in polys:
        pts = [(c[1], c[0]) for c in ring]   # GeoJSON is [lon, lat]
        proj = []
        for lat, lon in pts:
            p = ortho(lat, lon)
            proj.append(p)

        # Build visible segments only
        xs, ys = [], []
        for p in proj:
            if p:
                xs.append(p[0]); ys.append(p[1])
            else:
                if len(xs) >= 3:
                    ax.fill(xs, ys, color=LAND_FILL, linewidth=0, zorder=5)
                    ax.plot(xs, ys, color=LAND_EDGE, lw=0.3, alpha=0.7, zorder=5)
                xs, ys = [], []
        if len(xs) >= 3:
            ax.fill(xs, ys, color=LAND_FILL, linewidth=0, zorder=5)
            ax.plot(xs, ys, color=LAND_EDGE, lw=0.3, alpha=0.7, zorder=5)


def draw_arc_glowing(ax, pts_2d, lw_scale=1.0, color_core=ARC_CORE,
                     color_mid=ARC_MID, color_outer=ARC_OUTER):
    """Draw a single visible arc segment with layered glow."""
    if len(pts_2d) < 2:
        return
    xs = np.array([p[0] for p in pts_2d])
    ys = np.array([p[1] for p in pts_2d])
    # Layer 1: wide outer haze
    ax.plot(xs, ys, color=color_outer, lw=lw_scale*9, alpha=0.025,
            solid_capstyle="round", zorder=8)
    # Layer 2: medium glow
    ax.plot(xs, ys, color=color_mid,   lw=lw_scale*4, alpha=0.08,
            solid_capstyle="round", zorder=9)
    # Layer 3: inner glow
    ax.plot(xs, ys, color=color_mid,   lw=lw_scale*2, alpha=0.22,
            solid_capstyle="round", zorder=10)
    # Layer 4: bright core with gradient fade using LineCollection
    n = len(xs)
    points = np.array([xs, ys]).T.reshape(-1, 1, 2)
    segs_lc = np.concatenate([points[:-1], points[1:]], axis=1)
    # Fade alpha slightly toward ends
    alphas = np.ones(n-1) * 0.85
    alphas[:max(1,n//6)] *= np.linspace(0.3, 1.0, max(1,n//6))
    alphas[-max(1,n//6):] *= np.linspace(1.0, 0.3, max(1,n//6))
    rgba = np.array([[*matplotlib.colors.to_rgb(color_core), a] for a in alphas])
    lc = LineCollection(segs_lc, colors=rgba, linewidths=lw_scale*0.9, zorder=11)
    ax.add_collection(lc)


def draw_arcs(ax, flights):
    """Render all flight arcs."""
    # Count route frequency for thickness
    route_cnt = {}
    for f in flights:
        key = tuple(sorted([f["origin"], f["dest"]]))
        route_cnt[key] = route_cnt.get(key, 0) + 1

    for f in flights:
        gc = great_circle(*f["oc"], *f["dc"], n=120)
        segs = ortho_path(gc)
        key = tuple(sorted([f["origin"], f["dest"]]))
        lw = 1.0 + min(route_cnt[key]-1, 8) * 0.15
        for seg in segs:
            draw_arc_glowing(ax, seg, lw_scale=lw)


def draw_cities(ax, dest_cities, hub_cities):
    """Render destination and transfer hub cities differently."""
    # Transfer hubs — small dim dots
    for city, info in hub_cities.items():
        p = ortho(*info["coords"])
        if not p:
            continue
        ax.scatter(*p, s=60,  color=HUB_GLOW,  alpha=0.20, linewidths=0, zorder=14)
        ax.scatter(*p, s=18,  color=HUB_CORE,  alpha=0.55, linewidths=0, zorder=15)
        ax.scatter(*p, s=5,   color="#94a3b8",  alpha=0.80, linewidths=0, zorder=16)

    # Destination cities — bright amber glow
    for city, info in dest_cities.items():
        p = ortho(*info["coords"])
        if not p:
            continue
        c = info["count"]
        scale = min(1.0 + c * 0.12, 2.5)
        ax.scatter(*p, s=600*scale, color=DEST_GLOW, alpha=0.04,  linewidths=0, zorder=14)
        ax.scatter(*p, s=180*scale, color=DEST_GLOW, alpha=0.12,  linewidths=0, zorder=15)
        ax.scatter(*p, s=50*scale,  color=DEST_CORE, alpha=0.50,  linewidths=0, zorder=16)
        ax.scatter(*p, s=12,        color=DEST_CORE, alpha=1.0,   linewidths=0, zorder=17)

    # Edinburgh home — bright gold star
    home = ortho(*CITIES["edinburgh"])
    if home:
        ax.scatter(*home, s=400, color=HOME_COLOR, alpha=0.20, linewidths=0, zorder=18)
        ax.scatter(*home, s=80,  color=HOME_COLOR, alpha=0.90,
                   marker="*", linewidths=0, zorder=19)
        ax.annotate("Edinburgh", xy=home, xytext=(home[0]+0.04, home[1]+0.03),
                    fontsize=7, color=HOME_COLOR, va="bottom", alpha=0.85,
                    fontfamily="monospace", zorder=20)


def draw_stats(fig, stats):
    """Overlay stats in lower-right corner."""
    sx = fig.add_axes([0.68, 0.03, 0.30, 0.44])
    sx.set_facecolor("#00000000")   # transparent
    sx.axis("off")

    # Subtle background card
    bg = mpatches.FancyBboxPatch((0.0, 0.0), 1.0, 1.0,
                                  boxstyle="round,pad=0.02",
                                  facecolor="#080f22", edgecolor="#152d52",
                                  linewidth=0.8, alpha=0.88, zorder=0)
    sx.add_patch(bg)

    def row(y, label, val, sub=None):
        sx.text(0.08, y, label.upper(), transform=sx.transAxes,
                fontsize=6, color=TEXT_SEC, fontfamily="monospace", va="top")
        sx.text(0.08, y-0.055, val, transform=sx.transAxes,
                fontsize=14, color=TEXT_PRI, fontweight="bold", va="top")
        if sub:
            sx.text(0.08, y-0.105, sub, transform=sx.transAxes,
                    fontsize=6.5, color=TEXT_SEC, va="top")

    sx.text(0.08, 0.96, "FLIGHT FOG",
            transform=sx.transAxes, fontsize=11, color=DEST_CORE,
            fontweight="bold", fontfamily="monospace", va="top")
    sx.axhline(0.86, color="#152d52", lw=0.6)

    row(0.82, "Flights",         f"{stats['total']}")
    row(0.68, "Distance",        f"{stats['km']:,.0f} km",
        f"{stats['earths']:.1f}×  Earth")
    row(0.52, "Time in Air",     f"{int(stats['hours'])} h",
        f"≈ {stats['hours']/24:.0f} days")
    row(0.37, "Countries / Cities", f"{stats['countries']}  /  {stats['cities']}")
    row(0.22, "Busiest Year",    f"{stats['busiest']}",
        f"{stats['b_count']} flights")
    row(0.08, "Longest Flight",  f"{stats['long_km']:,.0f} km",
        stats["longest"])


# ── Legend ────────────────────────────────────────────────────────────────────

def draw_legend(fig):
    lx = fig.add_axes([0.03, 0.04, 0.18, 0.10])
    lx.set_facecolor("#00000000")
    lx.axis("off")
    lx.scatter([0.08], [0.75], s=50,  color=DEST_CORE, alpha=1.0, linewidths=0,
               transform=lx.transAxes)
    lx.text(0.20, 0.73, "Destination", transform=lx.transAxes,
            fontsize=7, color=TEXT_SEC, va="center", fontfamily="monospace")
    lx.scatter([0.08], [0.32], s=18,  color="#94a3b8", alpha=0.8, linewidths=0,
               transform=lx.transAxes)
    lx.text(0.20, 0.30, "Transfer hub", transform=lx.transAxes,
            fontsize=7, color=TEXT_SEC, va="center", fontfamily="monospace")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Loading data …")
    world   = load_world()
    flights = load_flights()
    stats   = compute_stats(flights)
    dest_cities, hub_cities = city_stats(flights)

    real_dests = len({f["dest"] for f in flights if not f["is_transfer"]})
    print(f"  {len(flights)} segments  |  {stats['countries']} countries  "
          f"|  {real_dests} destinations  |  {len(hub_cities)} transit hubs")

    print("Rendering globe …")
    fig = plt.figure(figsize=(14, 14), facecolor=BG)

    # Main globe axes (square, centered, slight left bias)
    ax = fig.add_axes([0.0, 0.05, 0.75, 0.90])
    ax.set_facecolor(BG)
    ax.set_xlim(-1.22, 1.22)
    ax.set_ylim(-1.22, 1.22)
    ax.set_aspect("equal")
    ax.axis("off")

    draw_globe_sphere(ax)
    draw_land(ax, world)
    draw_arcs(ax, flights)
    draw_cities(ax, dest_cities, hub_cities)

    # Title
    fig.text(0.04, 0.97, "FLIGHT FOG",
             fontsize=22, color=DEST_CORE, fontweight="bold",
             fontfamily="monospace", va="top", alpha=0.95)
    fig.text(0.04, 0.932, "personal flight history  ·  2008 – 2026",
             fontsize=9, color=TEXT_SEC, va="top", fontfamily="monospace")

    draw_stats(fig, stats)
    draw_legend(fig)

    out = "flight_globe.png"
    plt.savefig(out, dpi=200, bbox_inches="tight",
                facecolor=BG, edgecolor="none")
    print(f"  Saved → {out}")
    plt.close(fig)


if __name__ == "__main__":
    main()
