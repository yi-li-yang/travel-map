# Flight Log

![Flight Log preview](https://raw.githubusercontent.com/yi-li-yang/travel-map/main/thumb.gif)

Personal flight history tracker and visualizer.

Inspired by [Fog of World](https://fogofworld.app/) and [Flighty](https://flighty.com/).

---

## How It Works

**Visualize** — flights render as glowing great-circle routes on an interactive night-side globe. Zoom from the whole planet down to city streets: the map is vector tiles (with a satellite layer), so detail keeps increasing as you zoom.

**Stats** — flights, countries, airports and distance as of any year on the timeline, a passport of countries with the year you first reached each, what was new in the selected year, your home base, and records (longest flight, most-flown route, most-visited airport).

**Monitor** — connects to Gmail to detect new flight bookings automatically. Claude AI parses confirmation emails, extracts route and date, and adds it to the map.

**Edit** — add, modify, or delete flights manually. Import/export as CSV.

---

## Data

All flights live in a single CSV using IATA airport codes:

```csv
year,origin_city,transfer_city,dest_city
2025,EDI,DOH,HKG
```

`transfer_city` marks a transit hub (DOH, AMS, etc.) rather than a true visited city. Coordinates and city names are resolved from `airports.json` at runtime.

---

## Tech Stack

| | |
| --- | --- |
| Globe | MapLibre GL JS (globe projection) |
| Map Data | OpenFreeMap vector tiles, EOX Sentinel-2 satellite |
| Web App | React + Vite |
| Styling | Tailwind CSS, Instrument Serif + Instrument Sans |
| Email Parsing | Anthropic Claude API |
| Hosting | GitHub Pages |

---

## Local Development

### Option A — Vite dev server (recommended, instant HMR)

```bash
npm install
npm run dev
# open http://localhost:5173/
```

### Option B — VSCode Live Server (serves built output)

```bash
npm install
npm run build:watch   # leave running in a terminal
# then click "Go Live" in VSCode → opens http://127.0.0.1:5500/
```

Live Server is configured (`.vscode/settings.json`) to serve from `/dist`, where the watch build writes its output.

---

## Deploy to GitHub Pages

Push to `main` — the GitHub Actions workflow builds and deploys automatically.

Enable Pages in repo settings: **Settings → Pages → Source: GitHub Actions**.

Live at: `https://yi-li-yang.github.io/travel-map/`

---

## License

MIT
