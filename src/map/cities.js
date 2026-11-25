import { COLORS } from './style.js'
import { emptyFc } from './arcs.js'

export const CITY_SOURCE = 'cities'

// One feature per place reached up to maxYear. Visits count arrivals and transfers.
export function buildCityFeatures(segments, db, maxYear) {
  const map = new Map()
  const touch = (code, year, isDest) => {
    const ap = db[code]
    if (!ap) return
    let c = map.get(code)
    if (!c) {
      c = { code, ap, visits: 0, first: year }
      map.set(code, c)
    }
    c.first = Math.min(c.first, year)
    if (isDest) c.visits += 1
  }
  for (const s of segments) {
    if (s.year > maxYear) continue
    touch(s.originName, s.year, false)
    touch(s.destName, s.year, true)
  }
  return [...map.values()].map(({ code, ap, visits, first }) => ({
    type: 'Feature',
    properties: {
      code,
      city: ap.city || code,
      name: ap.name,
      country: ap.country,
      visits: Math.max(visits, 1),
      hub: ap.isHub ? 1 : 0,
      airport: ap.kind === 'place' ? 0 : 1,
      first,
    },
    geometry: { type: 'Point', coordinates: [ap.lon, ap.lat] },
  }))
}

const NO_CODE = ['==', ['get', 'code'], '']
const NO_YEAR = ['==', ['get', 'first'], -1]

export function cityLayers() {
  const visits = ['min', ['get', 'visits'], 12]
  const isHub = ['==', ['get', 'hub'], 1]
  const scale = (a, b) => ['interpolate', ['linear'], ['zoom'], 0, a, 8, b]
  return [
    {
      // A ring round places reached for the first time in the year being shown.
      id: 'cities-new',
      type: 'circle',
      source: CITY_SOURCE,
      filter: NO_YEAR,
      paint: {
        'circle-radius': scale(8, 13),
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': COLORS.place,
        'circle-stroke-width': 1.5,
      },
    },
    {
      // Invisible, wider than the dot: what the pointer picks.
      id: 'cities-hit',
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': scale(['case', isHub, 4, ['+', 7, ['*', 1.1, visits]]], ['case', isHub, 8, ['+', 12, ['*', 2, visits]]]),
        'circle-opacity': 0,
      },
    },
    {
      // A place is a solid dot, larger the more often it was reached, with a ground-coloured edge
      // so it stays clear of the lines under it.
      id: 'cities-core',
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': scale(['case', isHub, 1.8, ['+', 2.6, ['*', 0.18, visits]]], ['case', isHub, 3.2, ['+', 4.2, ['*', 0.32, visits]]]),
        'circle-color': ['case', isHub, COLORS.hub, COLORS.place],
        'circle-stroke-color': COLORS.page,
        'circle-stroke-width': ['case', isHub, 0, 1],
      },
    },
    {
      id: 'cities-hover',
      type: 'circle',
      source: CITY_SOURCE,
      filter: NO_CODE,
      paint: {
        'circle-radius': scale(9, 14),
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': COLORS.hover,
        'circle-stroke-width': 1.5,
      },
    },
    {
      // The one selection, in the accent.
      id: 'cities-selected',
      type: 'circle',
      source: CITY_SOURCE,
      filter: NO_CODE,
      paint: {
        'circle-radius': scale(10, 16),
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': COLORS.focus,
        'circle-stroke-width': 2,
      },
    },
    {
      id: 'cities-label',
      type: 'symbol',
      source: CITY_SOURCE,
      filter: ['==', ['get', 'hub'], 0],
      minzoom: 1.5,
      layout: {
        'text-field': ['get', 'city'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 11, 6, 13],
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-max-width': 8,
        'symbol-sort-key': ['-', 0, ['get', 'visits']],
      },
      paint: {
        'text-color': COLORS.placeLabel,
        'text-halo-color': COLORS.halo,
        'text-halo-width': 1.6,
        'text-halo-blur': 0,
      },
    },
  ]
}

export function addCityLayers(map) {
  map.addSource(CITY_SOURCE, { type: 'geojson', data: emptyFc() })
  // Cities sit above the arcs and the base-map labels.
  for (const layer of cityLayers()) map.addLayer(layer)
}

/** Ring the place that is selected and the one that is hovered (a code, or null). */
export function setCityFocus(map, { selectedCode, hoverCode }) {
  map.setFilter('cities-selected', ['==', ['get', 'code'], selectedCode || ''])
  map.setFilter('cities-hover', ['==', ['get', 'code'], hoverCode && hoverCode !== selectedCode ? hoverCode : ''])
}

/** Ring the places first reached in `year` (connections left out). */
export function setFirstVisitYear(map, year) {
  map.setFilter('cities-new', ['all', ['==', ['get', 'first'], year], ['==', ['get', 'hub'], 0]])
}
