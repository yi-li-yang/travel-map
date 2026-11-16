// MapLibre GL 6 loads its web worker from a separate ES module that imports a shared chunk.
// Copy both next to the app as plain static files so the browser can load them as-is.
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const from = resolve(root, 'node_modules/maplibre-gl/dist')
const to = resolve(root, 'public/vendor/maplibre')
mkdirSync(to, { recursive: true })
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) copyFileSync(resolve(from, f), resolve(to, f))
