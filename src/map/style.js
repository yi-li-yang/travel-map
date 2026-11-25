// MapLibre style for the globe: a dark, matte stone chart on OpenFreeMap vector
// tiles, with an optional satellite layer. Vector tiles are re-fetched at higher
// detail as you zoom, so coastlines, borders and labels stay sharp at every scale.

// Every colour comes from Yili's visual system (src/vp/tokens.css), read when the map is built,
// so the map follows the system instead of holding its own copies of the values.
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()

/** A token colour with an alpha, for MapLibre, which cannot read CSS custom properties. */
export function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

export const COLORS = {
  // The basemap: matte stone. The page is the ground, the ocean one step up, land one more.
  get page() { return cssVar('ground') },
  get water() { return cssVar('surface') },
  get land() { return cssVar('raised') },
  get ice() { return cssVar('rule') },
  get coast() { return cssVar('rule') },
  get border() { return withAlpha(cssVar('edge'), 0.55) },
  get borderMinor() { return cssVar('rule') },
  get road() { return cssVar('rule') },
  get building() { return cssVar('rule') },
  get label() { return cssVar('muted') },
  get halo() { return cssVar('ground') },
  // The data: flights in sky, overland legs in spruce, places in ochre, connections in muted.
  get flight() { return cssVar('data-sky') },
  get overland() { return cssVar('data-spruce') },
  get place() { return cssVar('data-ochre') },
  get placeLabel() { return cssVar('ink') },
  get hub() { return cssVar('muted') },
  // What answers the pointer: hover in ink, the one selection in the accent.
  get hover() { return cssVar('ink') },
  get focus() { return cssVar('signal') },
}

const OFM = 'https://tiles.openfreemap.org'

// Layers that belong to the stylised vector base map (hidden in satellite mode).
export const VECTOR_LAYERS = [
  'land-ice',
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
  'text-halo-blur': 0,
})

export function buildStyle() {
  return {
    version: 8,
    name: 'stone',
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
    // No atmosphere: the globe's edge is a clean line against the ground, with no glow.
    sky: {
      'sky-color': COLORS.page,
      'horizon-color': COLORS.page,
      'fog-color': COLORS.page,
      'atmosphere-blend': 0,
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
        paint: labelPaint(COLORS.label),
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
        paint: labelPaint(COLORS.label),
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
        paint: labelPaint(COLORS.label),
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
