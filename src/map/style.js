// MapLibre style for the globe: a dark "night side" chart on OpenFreeMap vector
// tiles, with an optional satellite layer. Vector tiles are re-fetched at higher
// detail as you zoom, so coastlines, borders and labels stay sharp at every scale.

export const COLORS = {
  space: '#070b16',
  land: '#1a2542',
  ice: '#26324f',
  water: '#08101f',
  coast: 'rgba(143, 211, 255, 0.28)',
  border: 'rgba(170, 190, 232, 0.30)',
  borderMinor: 'rgba(170, 190, 232, 0.14)',
  road: 'rgba(150, 170, 215, 0.20)',
  building: '#202c4c',
  label: '#b4c0dc',
  labelDim: '#7d8aa8',
  halo: '#070b16',
  route: '#8fd3ff',
  routeGlow: '#4aa3df',
  routeTransfer: '#6f8fb8',
  // Flights fade from the origin to the destination, so a route shows which way it went.
  routeFrom: '#5aaee6',
  routeTo: '#d6f1ff',
  routeTransferFrom: '#4f6f98',
  routeTransferTo: '#93b4da',
  ground: '#a3dcc0',
  city: '#ffb454',
  cityLabel: '#ffd9a0',
  hub: '#7a86a4',
}

const OFM = 'https://tiles.openfreemap.org'

// Layers that belong to the stylised vector base map (hidden in satellite mode).
export const VECTOR_LAYERS = [
  'land-ice',
  'land-wood',
  'land-park',
  'water',
  'coast',
  'polar-cap',
  'building',
]
export const SATELLITE_LAYERS = ['satellite']

// All app data (arcs, cities) is inserted before this layer so base-map labels stay on top.
export const FIRST_LABEL_LAYER = 'label-water'

const font = (weight = 'Regular') => [`Noto Sans ${weight}`]
const nameField = ['coalesce', ['get', 'name_en'], ['get', 'name']]

const labelPaint = (color = COLORS.label) => ({
  'text-color': color,
  'text-halo-color': COLORS.halo,
  'text-halo-width': 1.4,
  'text-halo-blur': 0.5,
})

export function buildStyle() {
  return {
    version: 8,
    name: 'night-side',
    projection: { type: 'globe' },
    glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      openmaptiles: { type: 'vector', url: `${OFM}/planet`, attribution: '© OpenFreeMap © OpenMapTiles Data from OpenStreetMap' },
      // Vector tiles stop near 85°N. This cap hides the seam so the Arctic reads as ocean.
      polar: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [[[-180, 84.6], [180, 84.6], [180, 90], [-180, 90], [-180, 84.6]]] },
        },
      },
      satellite: {
        type: 'raster',
        tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg'],
        tileSize: 256,
        maxzoom: 13,
        attribution: 'Sentinel-2 cloudless by <a href="https://s2maps.eu" target="_blank" rel="noreferrer">EOX</a> (modified Copernicus Sentinel data 2021)',
      },
    },
    sky: {
      'sky-color': '#173a6e',
      'horizon-color': '#2a5d9e',
      'fog-color': '#0b1b3a',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.8,
      'fog-ground-blend': 0.2,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.9, 7, 0],
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': COLORS.land } },

      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: 'none' },
        paint: { 'raster-brightness-max': 0.82, 'raster-saturation': -0.15, 'raster-fade-duration': 250 },
      },

      {
        id: 'land-ice',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'ice'],
        paint: { 'fill-color': COLORS.ice },
      },
      {
        id: 'land-wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 3,
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': '#1a2a40', 'fill-opacity': 0.7 },
      },
      {
        id: 'land-park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        minzoom: 6,
        paint: { 'fill-color': '#1b2c40', 'fill-opacity': 0.6 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-color': COLORS.water },
      },
      {
        id: 'coast',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: {
          'line-color': COLORS.coast,
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 6, 1, 12, 1.4],
        },
      },
      { id: 'polar-cap', type: 'fill', source: 'polar', paint: { 'fill-color': COLORS.water, 'fill-antialias': false } },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13.5,
        paint: { 'fill-color': COLORS.building, 'fill-opacity': 0.9 },
      },

      // Roads fade in only when you are close enough to care.
      {
        id: 'road-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 6,
        filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: {
          'line-color': COLORS.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 10, 0.9, 14, 2.4],
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 10.5,
        filter: ['all', ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary', 'minor', 'service']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: {
          'line-color': COLORS.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 10.5, 0.3, 14, 1.2],
        },
      },

      {
        id: 'border-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        minzoom: 4,
        filter: ['all', ['>=', ['get', 'admin_level'], 3], ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': COLORS.borderMinor,
          'line-width': 0.8,
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'border-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': COLORS.border,
          'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 5, 1, 10, 1.6],
        },
      },

      // ---- labels (arcs and cities are inserted before the first of these) ----
      {
        id: 'label-water',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        minzoom: 1,
        maxzoom: 7,
        filter: ['==', ['get', 'class'], 'ocean'],
        layout: {
          'text-field': nameField,
          'text-font': font('Italic'),
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 6, 15],
          'text-letter-spacing': 0.25,
          'text-max-width': 6,
        },
        paint: labelPaint('#3f5a86'),
      },
      {
        id: 'label-country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 2,
        maxzoom: 8,
        filter: ['==', ['get', 'class'], 'country'],
        layout: {
          'text-field': nameField,
          'text-font': font('Bold'),
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 14, 8, 18],
          'text-max-width': 6,
          'text-letter-spacing': 0.08,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(COLORS.labelDim),
      },
      {
        id: 'label-state',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 5,
        maxzoom: 9,
        filter: ['==', ['get', 'class'], 'state'],
        layout: {
          'text-field': nameField,
          'text-font': font('Italic'),
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 8, 13],
          'text-max-width': 6,
        },
        paint: labelPaint('#5d6a88'),
      },
      {
        id: 'label-place',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 5,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb']]],
        layout: {
          'text-field': nameField,
          'text-font': font('Regular'),
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10.5, 10, 14, 14, 17],
          'text-max-width': 8,
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: labelPaint(COLORS.label),
      },
    ],
  }
}

export function applyBasemap(map, basemap) {
  const sat = basemap === 'satellite'
  for (const id of VECTOR_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat ? 'none' : 'visible')
  }
  for (const id of SATELLITE_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat ? 'visible' : 'none')
  }
  // Roads clutter photographs; the vector basemap shows them.
  for (const id of ['road-major', 'road-minor']) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat ? 'none' : 'visible')
  }
  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', sat ? COLORS.water : COLORS.land)
  }
}
