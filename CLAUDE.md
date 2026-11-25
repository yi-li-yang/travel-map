# CLAUDE.md

## Project Overview

Travel Log (repo `travel-map`, formerly Flight Log) is a personal travel history visualizer for a few people (Yili, Kim, Luyi). It draws every trip on an interactive globe: flights as glowing great-circle arcs, overland legs as dashed lines, with stats and a timeline. **The app only reads data.** There is no form, import or edit anywhere in the UI; trips are changed in the CSV files (the "back end"), by hand, by Claude, or by `npm run trips`. A Gmail watcher that adds new bookings to those files is planned (Phase 3).

**Hosted on GitHub Pages** at `https://yi-li-yang.github.io/travel-map/`

## Current State (as of 2026-11)

**Done:**

- React + Vite + Tailwind
- **MapLibre GL JS globe** (`globe` projection) with real level-of-detail: OpenFreeMap vector tiles restyled in `src/map/style.js`, plus a satellite toggle (EOX Sentinel-2 cloudless)
- Flights are GeoJSON lines that fade from origin to destination, with a glow, width scaled by how often a route is travelled, and a draw-in per year; overland legs dashed in mint; amber city markers with halos, labels decluttered by MapLibre; places first reached in the shown year glow
- Hover or select a city or route: it lights up and every other route dims. The same preview comes from rows in the Trips list, the Overview and the city panel. Tooltips show the years a route was travelled and a place's first visit. Selecting a route sends a light along it; selecting a place rings it once. Both stay off under `prefers-reduced-motion`
- Selection panels: city, route (years are buttons that move the timeline) and trip (legs of a multi-stop journey, each opens on its own). Back returns to where you came from (city → trip → leg)
- Idle auto-rotate that pauses on interaction, with a button to turn it off
- Full-bleed layout: floating glass drawer (Overview / Trips; a bottom sheet on phones with a draggable handle and two heights), bottom timeline dock with a trips-per-year histogram scrubber (hover readout, striped planned years, a dot on years with a first visit to a country), playback, replay and speed
- Overview stats that follow the timeline (up to / only the selected year): headline figures, a ring for laps round the Earth, passport (countries, continents with bars), year in focus against your average, home base, most travelled routes and places as bar lists, records
- Trips list grouped by year, newest first: click a year to move the timeline, click a trip to show it on the globe
- User switcher (Yili / Kim / Luyi) under the title. The app always opens on Yili; the choice lasts for the visit only. Switching keeps the globe mounted and flies to the new person's home
- Loading, error, empty and WebGL-unsupported states. No keyboard shortcuts; the controls themselves (tabs, the year slider) keep their arrow-key behaviour and a visible focus ring
- `scripts/trips.mjs` validates every CSV and `places.json` before each build, and can append a trip
- GitHub Actions deploy to GitHub Pages on push to main

**Not yet built:**

- Email watcher / Gmail scan (Phase 3)
- Tidier city names: airports.json city fields are verbose ("Paris (Roissy-en-France, Val-d'Oise)", "Zaventem" for Brussels)
- PWA manifest, PNG/share export
- Country hover highlight, route-frequency colour mode, share-by-URL

## Key Decisions

- **The CSVs are the only source of truth and the only way to change data.** The UI never writes, and nothing is kept in the browser except the map/satellite preference (`flightLog:basemap`). Earlier versions saved an editable copy in `localStorage` (`flightLog:flights*`, `flightLog:user`); `useTravelData.js` deletes those keys on load, because a saved copy hides the CSV.
- A trip is one row: an ordered list of stops, each leg a flight or overland. See Data Format.
- **No mode rule.** Each leg is exactly what the CSV says (`-` flight, `=` overland), including legs to places without an airport. Luyi's history before 2027 was reconstructed from memory, so its modes are judgment calls (intercity hops and coach tours overland, long legs by air).
- Multi-user: `src/data/users.js` lists Yili, Kim, Luyi. Each has `public/trips/<id>.csv`. Kim is empty for now.
- Do not build any historical import pipeline. Rows after the current year are shown as "Planned trips".
- The map is MapLibre, not Three.js. A single texture cannot give real detail when zooming; a tile pyramid can. Arcs and cities are GeoJSON sources, not meshes.
- Base map tiles come from free keyless services (OpenFreeMap, EOX). Both can disappear; the app still draws arcs and cities over a plain background and shows a toast if tiles fail.
- Email watcher (Phase 3) will use the Anthropic Claude API to parse emails, not regex, and will write rows into the CSVs (through the same rules as `npm run trips -- add`), not into the browser.
- Stats count **trips** (CSV rows), not legs. Connection-only stops are "hubs": shown as small grey dots and excluded from country/place counts. Distance is split into flown and overland; hours in the air use flown km only.
- The smallest place is a city or an area (a mountain, a lake). Finer detail (a university, a venue) goes in the trip's note.

## Tech Stack

- React 18 + Vite 6
- MapLibre GL JS 6 (globe projection, vector + raster tiles)
- Tailwind CSS 3, fonts Instrument Serif (numerals, headings) and Instrument Sans (UI)
- PapaParse for CSV (in the app and in `scripts/trips.mjs`)
- Anthropic Claude API (email parsing, Phase 3)
- GitHub Pages deployment

## Data Format

`public/trips/<id>.csv`:

```csv
year,route,note
2019,EDI-(CDG)-CTU,
1988,CTU-NKG=PVG=SUZHOU=WUX=HGH=NKG-CTU,
2010,CTU-PEK-CTU,清华
```

- `route`: stops joined by `-` (flight) or `=` (overland). `(CDG)` is a connection only (not visited). Parsing and formatting live in `src/data/route.js` (`parseRoute`, `formatRoute`, `resolveTrip`).
- Keep each file in year order. A trip's id in the app is `<person>:<row index>`, so it is the same on every load.
- Pipeline in `useTravelData`: CSV text → `trips` (`{id, year, route, note, stops, legs}`, each leg with its `mode`) → `segments` (legs with coordinates, distance, repeats). Route keys are `A|B|mode` with the pair sorted. Rows that do not resolve are left out with a console warning; the build check below stops that before it ships.

`public/airports.json` maps uppercase IATA codes to `{name, city, country, lat, lon}` (9,057 airports, OurAirports). `public/places.json` has places without an airport in the same shape, keyed by their name in capitals (4+ letters, letters only, so they never collide with IATA codes). To visit a new place without an airport, add it there first. Both are merged with `kind: 'airport' | 'place'`. Country is ISO-2; names and continents come from `src/data/countries.js`.

### Changing the data

- Edit the CSV and push; Actions deploys. Or: `npm run trips -- add yili 2027 "CTU-(HKG)-LHR" optional note` (quote routes with brackets), which validates, inserts the row in year order and runs the check.
- `npm run trips -- check` validates `places.json` and every CSV: header, year, route syntax, every code known, no stop twice in a row, no trip starting or ending at a connection. It runs as `prebuild`, so a bad row fails the deploy. A repeated identical row is only a warning (people do make the same trip twice). `TRIPS_DIR=<folder>` points it at other files for testing.

## Design System: "Night side"

One theme, dark. The globe is the single bold element; the UI is quiet glass panels over it. Tokens live in `tailwind.config.js` and `src/index.css`; map colours in `COLORS` in `src/map/style.js`.

```text
Space (page):     #070b16   star field canvas behind the transparent map
Panel:            rgba(14,21,38,.74) + backdrop blur, 1px rgba(190,205,235,.12) border (.panel)
Text / dim:       #e8ecf5 / #8d97b0
Route (arcs):     #5aaee6 → #d6f1ff from origin to destination, #4aa3df glow, #4f6f98 → #93b4da for legs of connecting flights
Overland:         #a3dcc0 dashed, no glow (token `ground`)
City light:       #ffb454 (amber), hub #7a86a4
Land / ocean:     #1a2542 / #08101f
```

- Numerals and headings use `.display` (Instrument Serif, tabular lining figures). Body is Instrument Sans.
- No neon accent and no all-caps eyebrow labels. Sentence case everywhere.
- Motion: one intro (routes draw in year by year on first load). After that, motion only answers an action (a hover, a click, a switch of person). Everything respects `prefers-reduced-motion`.
- Touch targets are at least 44px on phones. Keyboard focus is always visible (`:focus-visible`). Hover styles apply only where there is a hover-capable pointer (`future.hoverOnlyWhenSupported`).

## File Structure

```text
travel-map/
├── public/
│   ├── trips/<id>.csv            # one file per person: year,route,note (the data)
│   ├── places.json               # places without an airport, same shape as airports.json
│   ├── airports.json             # IATA → {name,city,country,lat,lon}
│   └── vendor/maplibre/          # generated by scripts/copy-maplibre-worker.mjs (gitignored)
├── scripts/
│   ├── trips.mjs                 # check / add: validates the CSVs (runs before build)
│   └── copy-maplibre-worker.mjs
├── src/
│   ├── App.jsx                   # state, layout, wiring between globe, panels and timeline
│   ├── components/
│   │   ├── Globe.jsx             # MapLibre wrapper: camera, picking, spin, focus, effects
│   │   ├── Timeline.jsx          # dock: play/replay, rolling year, speed
│   │   ├── Scrubber.jsx          # histogram of trips per year, readout, milestones
│   │   ├── Drawer.jsx            # side panel / bottom sheet (draggable handle)
│   │   ├── Overview.jsx          # composes the stats blocks in overview/
│   │   ├── overview/             # Figures (ring), Passport, RankBars, YearFocus, shared parts
│   │   ├── SelectionPanel.jsx    # CityPanel, RoutePanel
│   │   ├── TripPanel.jsx         # a multi-leg trip and its legs
│   │   ├── panelParts.jsx        # Back, Stat
│   │   ├── TripList.jsx          # read-only list by year
│   │   ├── RouteChain.jsx        # "Chengdu → Nanjing ⇢ Suzhou"
│   │   ├── UserSwitcher.jsx
│   │   ├── MapControls.jsx, Tooltip.jsx, Screens.jsx (loading/error/empty)
│   │   └── ui/                   # Button, Tabs, Toasts, Icons, Starfield
│   ├── map/
│   │   ├── style.js              # MapLibre style, basemap toggle
│   │   ├── arcs.js               # arc layers, focus/dimming, ArcAnimator (draw-in)
│   │   ├── cities.js             # city layers, focus rings, first-visit glow
│   │   └── effects.js            # the light along a route, the ring on a place
│   ├── hooks/                    # useMedia, usePlayback, useSelection, useElementHeight
│   ├── data/
│   │   ├── useTravelData.js      # loads one person's CSV → trips → segments (read only)
│   │   ├── route.js              # route grammar, route keys
│   │   ├── parseCsv.js           # PapaParse, trips, segments, places lookup
│   │   ├── users.js              # people and CSV paths
│   │   └── countries.js          # continents + country names (Intl.DisplayNames)
│   └── utils/
│       ├── geo.js                # haversine, great-circle points
│       ├── stats.js              # computeStats / computeCity / computeRoute / computeTrip, and small derived maps
│       └── preview.js            # props that light a route or place on the globe from a hovered row
├── .github/workflows/deploy.yml
├── vite.config.js                # base '/' (dev) / '/travel-map/' (production)
└── tailwind.config.js
```

## Coding Conventions

- Functional React components with hooks only. Named exports for components, default export for `App`.
- Tailwind utility classes. Inline `style` only for computed values. No JS hover/focus style mutation.
- Keep components under ~200 lines.
- All geographic maths in `src/utils/geo.js`; all derived numbers in `src/utils/stats.js`.
- CSV parsing uses PapaParse, never manual splitting.
- No TypeScript for now.
- No global keyboard shortcuts.

## Common Pitfalls

- **MapLibre 6 worker.** The worker is a separate ES module. `scripts/copy-maplibre-worker.mjs` copies it (and its shared chunk) to `public/vendor/maplibre/` before `dev` and `build`, and `Globe.jsx` points `setWorkerUrl` at it. Importing MapLibre's worker through Vite (`?worker`, pre-bundling) silently hangs the style load.
- **MapLibre 6 has no default export.** Use `import * as maplibregl from 'maplibre-gl'`.
- **Map container CSS.** MapLibre's stylesheet sets `.maplibregl-map { position: relative }`, overriding Tailwind `absolute`. Keep the map div inside a sized wrapper (`h-full w-full`).
- **Hidden tabs don't render.** In headless/background tabs `requestAnimationFrame` is paused, so the map never fires `load` and the loading screen stays up. Activate the tab when testing. Software WebGL (headless, or at 2× pixel ratio) is slow: the intro can take over a minute.
- **Idle spin vs camera moves.** The spin calls `jumpTo` every frame, which cancels any `easeTo`/`flyTo`. The spin must stay paused for a while after any `movestart`/`moveend` (see `spinRef` in `Globe.jsx`).
- **The arcs source is rewritten every frame during a draw-in.** `ArcAnimator` calls `setData` each tick, which would drop `feature-state`. Highlighting and dimming therefore use filters and paint expressions on `routeKey`, `from` and `to` (`setArcFocus` in `arcs.js`), never feature-state.
- **Fading flights need `lineMetrics: true` on the arcs source** and one layer per colour pair (`line-gradient` cannot read feature properties). Dashed overland legs cannot use a gradient, so they stay a separate layer.
- **Antimeridian.** Arc longitudes are unwrapped so one line stays continuous across ±180°; do not split lines. `chainPath` in `effects.js` shifts joined legs by whole turns for the same reason.
- **The globe is never torn down.** `Globe` mounts once the first person's data is in and stays mounted when another person is chosen; `useTravelData` keeps the previous trips until the new file arrives, and `Globe` flies to the new `home`. Do not put the map behind a loading condition again: it refetches every tile.
- **Poles.** MapLibre's globe clamps lines at ±85° latitude, so a leg whose great circle passes near a pole (e.g. JFK–CTU, 88°N) draws a bump around it. Such a leg was almost always a connection; add one, e.g. `JFK-(PVG)-CTU`.
- **Dashes and direction.** Dashes start at a line's first point, so an outbound and a return overland leg would fill each other's gaps. `legCoordinates` in `arcs.js` draws every overland pair in one direction.
- **Hover rows go away under the pointer.** A row that opens something is replaced without a mouse-leave, so `App` clears the preview whenever the selection, the tab or the scope changes.
- Place keys (IATA codes and places.json names) are uppercase. Normalise with `normalizeCode()` for every lookup, never lowercase. Show a code only for airports (`isAirport`, `shortLabel`).
- Tile fonts are only what OpenFreeMap serves: Noto Sans Regular, Italic and Bold (no Medium).

## Build Phases

### Phase 1: The Map ✅

### Phase 2: Data ✅ (CSV files are the back end, validated at build time; the UI is read only)

### Phase 3: Email Watcher ☐

1. "Scan Email" button in UI (or a scheduled job: the UI itself stays read only)
2. Search Gmail: `flight confirmation OR boarding pass OR e-ticket itinerary`
3. Send email body to the Anthropic Claude API with an extraction prompt
4. Claude returns `{trips: [{date, route, airline, booking_ref}]}`
5. Deduplicate against existing data (route + date ± 1 day)
6. Review step: approve or dismiss each extracted trip
7. Approved trips are written to `public/trips/<id>.csv` with the `trips.mjs` rules and deployed
8. Store last scan timestamp to avoid re-processing

Known email senders: Trip.com `en_flight_noreply@trip.com`, 携程 `ia_rsv@trip.com`, Qatar Airways `ebooking@qatarairways.com.qa`, Delta `DeltaAirLines@t.delta.com`, Sabre `confirmation@sabre.com`, Expedia `Expedia@uk.expediamail.com`.

### Phase 4: Deploy & Polish (mostly done)

GitHub Actions deploy ✅, responsive layout ✅, loading states ✅, README preview ✅. Open: share view as PNG, PWA manifest.

The README preview (`docs/preview.webp`, `docs/preview-anim.webp`, `docs/preview-record.json`) is made by [auto-generate-preview-image](https://github.com/yi-li-yang/auto-generate-preview-image) from `preview.json`, with a fictional traveller's trips in `docs/preview/fixtures/`. Never edit those files by hand, and never put real trips in the fixtures.

### Phase 5: Ideas still open

Country hover highlight, route-frequency colour mode, share-by-URL (year + selection in the hash).
