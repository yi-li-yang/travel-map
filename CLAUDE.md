# CLAUDE.md

## Project Overview

Flight Fog is a personal flight history visualizer inspired by Fog of World and Flighty. It renders a dark world map where visited cities glow through the fog and flight routes appear as luminous arcs. It also watches Gmail for new flight bookings and adds them to the map automatically.

**Hosted on GitHub Pages** from this repo.

## Key Decisions Already Made

- The complete flight history (2008–present) is already captured in `public/flight_history.csv` (63 segments). This is the seed data. Do not build any passport/historical import pipeline.
- Fog clears **around cities only** (radial gradient), NOT along flight paths. Paths are rendered as highlighted arcs but do not affect fog.
- Two map views: 3D globe (Three.js) as hero, 2D flat map (D3.js) as detail. User toggles between them.
- Email watcher uses Anthropic Claude API to parse emails (not regex). Gmail access via Gmail MCP or Gmail API.
- All data persists in localStorage with CSV import/export for portability.
- Dark theme is the default and primary design. The fog IS darkness — light theme is a nice-to-have, not a priority.

## Tech Stack

- React + Vite
- Three.js (3D globe)
- D3.js + topojson (2D flat map)
- Tailwind CSS
- Anthropic Claude API (email parsing, Phase 3)
- GitHub Pages deployment

## Data Format

`flight_history.csv` schema:
```
id,date,origin_city,origin_country,dest_city,dest_country,source,confidence,needs_review,notes
```

The app needs an internal `cities.json` mapping city names to `{lat, lng, country}`. This must cover at minimum: Edinburgh, London (Heathrow), Chengdu, Beijing, New York, San Diego, Atlanta, Alicante, Paphos, São Paulo, Frankfurt, Munich, Dublin, Amsterdam, Paris, Bangkok, Doha, Hong Kong. Add more major world cities for the autocomplete in manual entry.

## Color Palette

```
Background:      #0a0a1a
Fog overlay:     #1a1a2e at 85% opacity
City glow:       #f59e0b (amber) with radial fade
Flight arc:      #06b6d4 (cyan) at 60% opacity
Text primary:    #e2e8f0
Text secondary:  #94a3b8
Accent:          #f59e0b
```

## Build Phases — Execute in Order

### Phase 1: The Map (do this first)

1. Set up Vite + React + Tailwind project
2. Parse CSV at startup, build city coordinate lookup
3. Render 2D world map (D3.js, Natural Earth projection)
4. Dark fog overlay on entire map
5. For each visited city: clear fog with radial gradient (warm amber glow, ~200km equivalent radius)
6. Render flight arcs as great-circle curves in cyan
7. City dots with hover tooltips (name, visit count, first visit date)
8. Timeline slider (year granularity) to filter flights by date range
9. "Play" button to animate timeline from first flight to present
10. Stats panel: countries, cities, total flights, total distance (haversine), busiest route
11. Build 3D globe view (Three.js) with same data and fog logic
12. Toggle button between 2D ↔ 3D
13. Responsive layout: map takes ~70% width, stats sidebar ~30%

### Phase 2: Data Management

1. Manual flight entry form: origin city, destination city, date, notes
2. City autocomplete with fuzzy matching against cities.json
3. Inline edit/delete for existing entries
4. CSV export (download current dataset)
5. CSV import (drag-and-drop replacement)
6. Visual markers for `needs_review` entries (pulsing or different color)
7. Persist to localStorage; CSV is the portable backup

### Phase 3: Email Watcher

1. "Scan Email" button in UI
2. Search Gmail: `flight confirmation OR boarding pass OR e-ticket itinerary`
3. For each result: send email body to Anthropic Claude API with extraction prompt
4. Claude returns structured JSON: `{flights: [{date, origin, destination, airline, booking_ref}]}`
5. Deduplicate against existing data (route + date ± 1 day)
6. Review panel: user approves or dismisses each extracted flight
7. Approved flights append to dataset and render on map immediately
8. Store last scan timestamp to avoid re-processing

Known email senders to handle:
- Trip.com: `en_flight_noreply@trip.com`
- 携程: `ia_rsv@trip.com`
- Qatar Airways: `ebooking@qatarairways.com.qa`
- Delta: `DeltaAirLines@t.delta.com`
- Sabre: `confirmation@sabre.com`
- Expedia: `Expedia@uk.expediamail.com`

### Phase 4: Deploy & Polish

1. GitHub Actions workflow: build on push to main, deploy /dist to gh-pages
2. Responsive mobile layout
3. Share map view as PNG export
4. Loading states and transitions
5. PWA manifest

## File Structure

```
flight-fog/
├── public/
│   └── flight_history.csv
├── src/
│   ├── components/
│   │   ├── Globe.jsx
│   │   ├── FlatMap.jsx
│   │   ├── Timeline.jsx
│   │   ├── StatsPanel.jsx
│   │   ├── FlightTable.jsx
│   │   ├── ManualEntryForm.jsx
│   │   └── EmailScanner.jsx
│   ├── data/
│   │   ├── cities.json
│   │   └── parseCsv.js
│   ├── utils/
│   │   ├── geo.js
│   │   ├── dedup.js
│   │   └── emailParser.js
│   ├── App.jsx
│   └── main.jsx
├── .github/
│   └── workflows/
│       └── deploy.yml
├── package.json
├── vite.config.js
├── tailwind.config.js
├── CLAUDE.md
└── README.md
```

## Coding Conventions

- Functional React components with hooks only, no class components
- Named exports for components, default export for pages
- Use Tailwind utility classes, avoid custom CSS unless needed for canvas/WebGL
- Keep components focused — if a component exceeds ~200 lines, split it
- All geographic calculations (haversine, great-circle interpolation) go in `src/utils/geo.js`
- CSV parsing goes in `src/data/parseCsv.js` — use Papa Parse or similar, not manual splitting
- No TypeScript (keep it simple for now; can migrate later)

## Common Pitfalls to Avoid

- D3.js and React both want to control the DOM. Use D3 for math/projections but React refs for DOM attachment. Don't mix D3 selections with React rendering.
- Three.js scenes need cleanup on unmount (dispose geometries, materials, textures). Use a useEffect cleanup function.
- The fog effect is NOT a filter on the map tiles. It's a separate overlay layer (dark canvas/div) with holes punched in it. This is simpler and more performant than trying to darken/desaturate actual map tiles.
- Great-circle arcs on a 2D Mercator projection need to be computed as multiple small line segments, not a single bezier curve. Use D3's `d3.geoGreatArc()` or manual interpolation.
- City names in the CSV won't always match the lookup exactly. Use case-insensitive matching and handle common variants (e.g., "Sao Paulo" vs "São Paulo").