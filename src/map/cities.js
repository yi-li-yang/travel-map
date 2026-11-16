import { COLORS } from './style.js'
import { emptyFc } from './arcs.js'

export const CITY_SOURCE = 'cities'

// One feature per airport reached up to maxYear. Visits count arrivals and transfers.
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
      first,
    },
    geometry: { type: 'Point', coordinates: [ap.lon, ap.lat] },
  }))
}

export function cityLayers() {
  const visits = ['min', ['get', 'visits'], 12]
  const isHub = ['==', ['get', 'hub'], 1]
  const scale = (a, b) => ['interpolate', ['linear'], ['zoom'], 0, a, 8, b]
  return [
    {
      id: 'cities-halo',
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': scale(['case', isHub, 4, ['+', 7, ['*', 1.1, visits]]], ['case', isHub, 8, ['+', 12, ['*', 2, visits]]]),
        'circle-color': COLORS.city,
        'circle-blur': 1,
        'circle-opacity': ['case', isHub, 0, 0.22],
      },
    },
    {
      id: 'cities-core',
      type: 'circle',
      source: CITY_SOURCE,
      paint: {
        'circle-radius': scale(['case', isHub, 1.8, ['+', 2.4, ['*', 0.16, visits]]], ['case', isHub, 3.2, ['+', 4, ['*', 0.3, visits]]]),
        'circle-color': ['case', isHub, COLORS.hub, COLORS.city],
        'circle-stroke-color': ['case', isHub, 'rgba(0,0,0,0)', '#fff3dc'],
        'circle-stroke-width': ['case', isHub, 0, 0.6],
        'circle-opacity': ['case', isHub, 0.85, 1],
      },
    },
    {
      id: 'cities-selected',
      type: 'circle',
      source: CITY_SOURCE,
      filter: ['==', ['get', 'code'], ''],
      paint: {
        'circle-radius': scale(10, 16),
        'circle-color': 'rgba(0,0,0,0)',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
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
        'text-size': ['interpolate', ['linear'], ['zoom'], 1.5, 10.5, 6, 13],
        'text-anchor': 'top',
        'text-offset': [0, 0.9],
        'text-max-width': 8,
        'symbol-sort-key': ['-', 0, ['get', 'visits']],
      },
      paint: {
        'text-color': COLORS.cityLabel,
        'text-halo-color': COLORS.halo,
        'text-halo-width': 1.6,
        'text-halo-blur': 0.5,
      },
    },
  ]
}

export function addCityLayers(map) {
  map.addSource(CITY_SOURCE, { type: 'geojson', data: emptyFc() })
  // Cities sit above the arcs and the base-map labels.
  for (const layer of cityLayers()) map.addLayer(layer)
}
