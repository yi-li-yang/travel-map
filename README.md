# Flight Log

Personal flight history tracker and visualizer.

Inspired by [Fog of World](https://fogofworld.app/) and [Flighty](https://flighty.com/).

---

## How It Works

**Visualize** — flights render on an interactive 3D globe. 

**Stats** — total distance, time in the air, countries, cities, busiest year, longest route, and most-visited city.

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
| 3D Globe | Three.js |
| Map Data | D3.js + TopoJSON |
| Web App | React + Vite |
| Styling | Tailwind CSS + Notion-inspired design |
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
