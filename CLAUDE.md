# CLAUDE.md

## Project Overview

Flight Log is a personal flight history visualizer — a simple and effective app for logging and visualizing flights. It renders an interactive 3D globe with flight routes as great-circle arcs and city markers. It also watches Gmail for new flight bookings and adds them to the map automatically.

**Hosted on GitHub Pages** at `https://yi-li-yang.github.io/travel-map/`

## Current State (as of 2026-04)

**Done:**

- React + Vite + Tailwind project scaffolding
- Three.js interactive 3D globe with canvas texture (D3 equirectangular → Notion-palette earth)
- Orbit controls: drag to rotate, scroll to zoom, auto-rotate when idle
- Flight arcs as great-circle curves on the sphere surface (Notion Blue direct, light blue transfer)
- Amber city dot markers; muted dots for transit hubs
- Atmosphere halo on globe
- Timeline slider with play/pause and year-by-year animation
- Stats panel with Notion-style metric cards
- Flight table with inline delete, CSV export, CSV import
- Manual flight entry form with city autocomplete
- localStorage persistence; CSV as portable backup
- GitHub Actions deploy to GitHub Pages on push to main
- Notion-inspired UI shell (white header, warm sidebar, Inter font, Notion Blue accents)
- Live Server workflow: `npm run build:watch` → `dist/` → served at `http://127.0.0.1:5500/`

**Not yet built:**

- Email watcher / Gmail scan (Phase 3)
- Inline edit of existing flights (Phase 2)
- `needs_review` visual markers (Phase 2)
- City click → focused city panel (Phase 5)
- PWA manifest (Phase 4)

## Key Decisions

- Flight data lives in `public/flight_history.csv`. Do not build any historical import pipeline.
- Only map view: 3D globe (Three.js). The flat D3 map and fog overlay have been removed.
- Email watcher uses Anthropic Claude API to parse emails (not regex). Gmail access via Gmail MCP or Gmail API.
- All data persists in localStorage with CSV import/export for portability.
- **Design**: The globe follows the Notion design.md palette end-to-end — warm parchment land, Notion Deep Navy oceans, Notion Blue arcs. The surrounding UI shell (header, sidebar, stats) uses the same Notion-inspired light theme. Everything is one cohesive aesthetic.
- Globe surface uses NASA Blue Marble satellite texture (loaded from CDN) with a transparent D3/TopoJSON border overlay sphere on top. Country name labels via CSS2DRenderer, zoom-aware.
- No Python visualizer. `visualize.py` and `flight_map.png` have been deleted. The web app is the only output.

## Tech Stack

- React + Vite
- Three.js (3D globe)
- D3.js + topojson (earth texture, topology)
- Tailwind CSS + Inter font
- Anthropic Claude API (email parsing, Phase 3)
- GitHub Pages deployment

## Data Format

`public/flight_history.csv` actual schema in use:

```csv
year,origin_city,transfer_city,dest_city
```

`transfer_city` is blank for direct flights. A row with a transfer produces 2 arc segments (origin→transfer, transfer→dest). Transfer cities (Doha, Amsterdam, etc.) appear as dimmer hub dots on the map and are excluded from country/city counts.

`public/airports.json` maps uppercase IATA codes to `{name, city, country, lat, lon}`. Covers ~200 major global airports. CSV values are now IATA codes (e.g. `CTU`, `LHR`, `DOH`). The old `cities.json` with lowercase city-name keys has been replaced.

## Design System

Follows `design.md` (Notion-inspired) end-to-end — globe and UI chrome share the same palette.

### Globe (Three.js)

```text
Scene background:  #f6f5f4  (warm white — matches app shell)
Earth texture:     NASA Blue Marble satellite image (CDN, fallback canvas)
Border overlay:    White rgba(255,255,255,0.55) on transparent sphere
Arc (direct):      #0075de  (Notion blue, 85% opacity)
Arc (transfer):    #62aef0  (light link blue, 55% opacity)
City dot:          #f59e0b  (amber, flat circular THREE.Points sprite)
Hub dot:           #c4bfba  (muted warm, flat circular sprite)
Atmosphere halo:   #4a8fd4  (two-layer, 10% + 4% back-face)
Country labels:    CSS2DRenderer, white uppercase, zoom-aware visibility
```

### UI shell (Notion-inspired light)

```text
Page background:   #f6f5f4  (warm white)
Panel background:  #ffffff
Border:            1px solid rgba(0,0,0,0.1)  (whisper)
Accent / CTA:      #0075de  (Notion Blue)
Heading text:      rgba(0,0,0,0.95)
Secondary text:    #615d59  (warm gray 500)
Muted text:        #a39e98  (warm gray 300)
Font:              Inter (Google Fonts), 400/500/600/700
Shadow (cards):    4-layer stack, max opacity 0.04
```

## Build Phases

### Phase 1: The Map ✅ (mostly done)

1. ✅ Vite + React + Tailwind project
2. ✅ Parse CSV at startup, build IATA airport lookup
3. ✅ 3D globe (Three.js, Blue Marble texture, CSS2D country labels)
4. ✅ Flight arcs as great-circle curves
5. ✅ City dots as flat circular THREE.Points sprites
6. ✅ Timeline slider (year granularity)
7. ✅ Play button to animate timeline
8. ✅ Stats panel
9. ✅ Responsive layout (map + sidebar)

### Phase 2: Data Management ✅ (mostly done)

1. ✅ Manual flight entry form
2. ✅ City autocomplete
3. ☐ Inline edit of existing entries (delete works; edit doesn't)
4. ✅ CSV export
5. ✅ CSV import (file picker; drag-and-drop is nice-to-have)
6. ☐ Visual markers for `needs_review` entries
7. ✅ localStorage persistence

### Phase 3: Email Watcher ☐

1. "Scan Email" button in UI
2. Search Gmail: `flight confirmation OR boarding pass OR e-ticket itinerary`
3. Send email body to Anthropic Claude API with extraction prompt
4. Claude returns `{flights: [{date, origin, destination, airline, booking_ref}]}`
5. Deduplicate against existing data (route + date ± 1 day)
6. Review panel: approve or dismiss each extracted flight
7. Approved flights append to dataset and render immediately
8. Store last scan timestamp to avoid re-processing

Known email senders:

- Trip.com: `en_flight_noreply@trip.com`
- 携程: `ia_rsv@trip.com`
- Qatar Airways: `ebooking@qatarairways.com.qa`
- Delta: `DeltaAirLines@t.delta.com`
- Sabre: `confirmation@sabre.com`
- Expedia: `Expedia@uk.expediamail.com`

### Phase 4: Deploy & Polish ✅ (mostly done)

1. ✅ GitHub Actions workflow: build on push to main, deploy `/dist` to GitHub Pages
2. ☐ Responsive mobile layout (basic layout exists; mobile polish needed)
3. ☐ Share map view as PNG export
4. ☐ Loading states and transitions
5. ☐ PWA manifest

### Phase 5: Interactions

Ideas to prioritize (user to decide order):

#### Map interactions

- **City click** → sidebar switches to a focused city panel: all flights for that city (as origin + destination) listed by date, total visit count, first visit year. Clicking another city or pressing Escape deselects.
- **Arc click** → highlight that route on the map (brighten arc, dim others); sidebar shows route stats: times flown, total distance, first and last date.
- **Country hover** → subtle highlight of all cities and arcs in that country; cursor shows country name + flight count.
- **Fly-to animation** → when a city is selected, the map smoothly pans/zooms to center on it.
- **Arc draw animation** → during timeline playback, new arcs animate drawing from origin to destination (300ms ease) instead of appearing instantly.

#### Timeline & filtering

- **Year chips** → row of clickable year labels above or below the slider for instant year jumps.
- **Milestone markers** → small tick marks on the timeline for notable events: first flight, 50th flight, first international, etc.
- **Decade mode** → coarser slider granularity that groups flights into 5-year bands.

#### Visualization modes

- **Route frequency overlay** → toggle arc color coding by how many times flown: single (cyan) → 2× (teal) → 3×+ (amber). Overrides the default direction-based coloring.
- **Heatmap mode** → toggle city dots to show visit count as a filled heatmap rather than individual dots (useful at world scale).
- **"First visit" highlight** → on timeline playback, cities and arcs appearing for the first time glow brighter momentarily.

#### Utility

- **City search** → search input in header or sidebar; typing zooms and centers the map on a matching city.
- **Keyboard shortcuts**: `Space` = play/pause, `←` / `→` = step one year, `Escape` = deselect, `f` = toggle route frequency mode.
- **Screenshot export** → "Save as PNG" button captures current map canvas + SVG layers and downloads as an image.
- **Share URL** → encode current year + selected city/route into the URL hash so a specific view can be linked.

## File Structure (actual)

```text
travel-map/
├── public/
│   ├── flight_history.csv       # IATA codes, e.g. CTU,DOH,JFK
│   └── airports.json            # ~200 airports: IATA → {name,city,country,lat,lon}
├── src/
│   ├── components/
│   │   ├── Globe.jsx          # Three.js globe, arcs, city dots, orbit controls
│   │   ├── Timeline.jsx       # Year slider + playback
│   │   ├── StatsPanel.jsx     # Metric cards + stat rows
│   │   ├── FlightTable.jsx    # CSV-backed editable list
│   │   └── ManualEntryForm.jsx
│   ├── data/
│   │   ├── useFlightData.js   # State hook, localStorage, CSV ops
│   │   └── parseCsv.js        # CSV parsing + segment expansion
│   ├── utils/
│   │   └── geo.js             # Haversine, great-circle interpolation
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .github/
│   └── workflows/
│       └── deploy.yml         # Build + deploy to GitHub Pages on push to main
├── .vscode/
│   └── settings.json          # Live Server: root = /dist, port = 5500
├── package.json
├── vite.config.js             # base '/' (dev) / '/travel-map/' (production)
├── tailwind.config.js
├── CLAUDE.md
└── README.md
```

## Coding Conventions

- Functional React components with hooks only, no class components
- Named exports for components, default export for pages/App
- Use Tailwind utility classes; inline `style` props for dynamic/computed values
- Keep components under ~200 lines; split if larger
- All geographic calculations go in `src/utils/geo.js`
- CSV parsing goes in `src/data/parseCsv.js` — use PapaParse, not manual splitting
- No TypeScript for now

## Common Pitfalls

- D3 and React both want DOM control. Use D3 for math/projections, React refs for DOM attachment. Don't mix D3 selections with React rendering.
- Three.js scenes need cleanup on unmount (dispose geometries, materials, textures). Use `useEffect` cleanup.
- Great-circle arcs must be many small segments, not a bezier. Use `greatCirclePoints()` in `geo.js`.
- IATA codes in CSV are uppercase. Use `normalizeCode()` (just `.toUpperCase().trim()`) for all lookups — never lowercase.
- CSS2DRenderer labels need the mount div to have `position: relative` and the renderer DOM element positioned absolutely inside it, or labels will misalign.
- Country labels use back-face culling: check `camNorm.dot(labelPos.normalize()) > 0.18` before showing. Without this, labels on the far side of the globe appear through the sphere.
