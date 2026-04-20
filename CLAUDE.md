# CLAUDE.md

## Project Overview

Flight Fog is a personal flight history visualizer inspired by Fog of World and Flighty. It renders a dark world map where visited cities glow through the fog and flight routes appear as luminous arcs. It also watches Gmail for new flight bookings and adds them to the map automatically.

**Hosted on GitHub Pages** at `https://yi-li-yang.github.io/travel-map/`

## Current State (as of 2026-04)

**Done:**

- React + Vite + Tailwind + D3 + PapaParse project scaffolding
- 2D flat map (D3 Natural Earth projection) with fog-of-war effect
- Flight arcs as great-circle curves; fog clears at visited cities
- City hover tooltips, arc width scales with distance + frequency
- Timeline slider with play/pause and year-by-year animation
- Stats panel (flights, countries, cities, hours, distance, busiest year, longest route, most visited city)
- Flight table with inline delete, CSV export, CSV import
- Manual flight entry form with city autocomplete
- localStorage persistence; CSV as portable backup
- GitHub Actions deploy to GitHub Pages on push to main
- Notion-inspired UI shell (white header, warm-white sidebar, Inter font, Notion Blue accents)

**Not yet built:**

- 3D globe view (Three.js) — planned Phase 1 item
- Email watcher / Gmail scan (Phase 3)
- Inline edit of existing flights (Phase 2)
- `needs_review` visual markers (Phase 2)
- PWA manifest (Phase 4)

## Key Decisions

- Flight data lives in `public/flight_history.csv`. Do not build any historical import pipeline.
- Fog clears **around cities only** (radial gradient), NOT along flight paths. Arcs are rendered but do not clear fog.
- Two map views: 2D flat (D3, done) and 3D globe (Three.js, planned). User toggles between them.
- Email watcher uses Anthropic Claude API to parse emails (not regex). Gmail access via Gmail MCP or Gmail API.
- All data persists in localStorage with CSV import/export for portability.
- **Design split**: The map canvas is intentionally dark (fog IS darkness). The surrounding UI shell uses a Notion-inspired light theme (white panels, warm neutrals, Inter font). The dark map reads as an embedded content window.
- `visualize.py` is a separate Python/Matplotlib script that generates a static `flight_map.png` — it has its own dark color scheme and is independent of the web app's UI design.

## Tech Stack

- Python + Matplotlib + NumPy (`visualize.py` — static PNG only)
- React + Vite
- Three.js (3D globe — planned)
- D3.js + topojson (2D flat map — done)
- Tailwind CSS + Inter font
- Anthropic Claude API (email parsing, Phase 3)
- GitHub Pages deployment

## Data Format

`public/flight_history.csv` actual schema in use:

```csv
year,origin_city,transfer_city,dest_city
```

`transfer_city` is blank for direct flights. A row with a transfer produces 2 arc segments (origin→transfer, transfer→dest). Transfer cities (Doha, Amsterdam, etc.) appear as dimmer hub dots on the map and are excluded from country/city counts.

`public/cities.json` maps lowercase city names to `{lat, lon, country}`. Current coverage: Chengdu, New York, Doha, Houston, Edinburgh, Amsterdam, London, Frankfurt, Munich, Dublin, Paris, Alicante, Paphos, Bangkok, Beijing, Hong Kong, São Paulo, Atlanta, San Diego, and more.

## Design System

### Map internals (unchanged — dark)

```text
Map background:  #0f172a
Land fill:       #1e293b
Land border:     #334155
City glow:       #f59e0b (amber)
Flight arc:      #06b6d4 (cyan, direct) / #818cf8 (indigo, transfer leg)
Fog overlay:     rgba(26,26,46,0.88)
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
2. ✅ Parse CSV at startup, build city coordinate lookup
3. ✅ Render 2D world map (D3.js, Natural Earth projection)
4. ✅ Dark fog overlay
5. ✅ Fog clears at visited cities (radial gradient)
6. ✅ Flight arcs as great-circle curves
7. ✅ City dots with hover tooltips
8. ✅ Timeline slider (year granularity)
9. ✅ Play button to animate timeline
10. ✅ Stats panel
11. ☐ 3D globe view (Three.js)
12. ☐ 2D ↔ 3D toggle button
13. ✅ Responsive layout (map + sidebar)

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
│   ├── flight_history.csv
│   └── cities.json
├── src/
│   ├── components/
│   │   ├── FlatMap.jsx       # D3 map, fog canvas, arcs, city dots
│   │   ├── Timeline.jsx      # Year slider + playback
│   │   ├── StatsPanel.jsx    # Metric cards + stat rows
│   │   ├── FlightTable.jsx   # CSV-backed editable list
│   │   └── ManualEntryForm.jsx
│   ├── data/
│   │   ├── useFlightData.js  # State hook, localStorage, CSV ops
│   │   └── parseCsv.js       # CSV parsing + segment expansion
│   ├── utils/
│   │   └── geo.js            # Haversine, great-circle, antimeridian split
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .github/
│   └── workflows/
│       └── deploy.yml        # Build + deploy to GitHub Pages on push to main
├── requirements.txt          # Python: matplotlib, numpy
├── visualize.py              # Standalone static PNG generator
├── package.json
├── vite.config.js            # base: '/travel-map/'
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
- The fog effect is NOT a CSS filter on map tiles. It's a `<canvas>` overlay filled dark, then `destination-out` composite punches holes at city positions. This is simpler and more performant.
- Great-circle arcs on a 2D projection must be many small segments, not a bezier. Use `greatCirclePoints()` in `geo.js`.
- City names in CSV won't always match lookup exactly. Use `normalizeCityName()` (lowercase + strip diacritics) consistently.
- `visualize.py` and the web app are independent — changing the React UI design does NOT affect the PNG output, and vice versa.
