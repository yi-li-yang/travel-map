import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { normalizeCode } from '../data/parseCsv.js'
import { greatCirclePoints } from '../utils/geo.js'

const R = 1.0
const TOPO = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const P = {
  bg:     '#f6f5f4',  // warm white, matches app shell
  ocean:  '#0b1d35',  // deep dark navy
  land:   '#d4ccc4',  // warm stone — strong contrast against ocean
  border: '#8a7e74',  // warm brown-gray, visible borders
  arc:    '#0075de',  // Notion blue (direct flights)
  xfer:   '#62aef0',  // light link blue (transfer legs)
  city:   '#f59e0b',  // amber
  hub:    '#c4bfba',  // muted warm for transit hubs
  atmo:   '#5b9fd4',  // richer blue atmosphere
}

// lat/lon → unit sphere XYZ (Three.js convention: Y-up, right-hand)
function ll2v(lat, lon, r = R) {
  const phi = (90 - lat) * (Math.PI / 180)
  const lam = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(lam),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(lam),
  )
}

// Build a 4096×2048 canvas texture from TopoJSON using D3 equirectangular
function makeEarthTexture(world) {
  const W = 4096, H = 2048
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')

  // Ocean fill
  ctx.fillStyle = P.ocean
  ctx.fillRect(0, 0, W, H)

  const proj = d3.geoEquirectangular().scale(H / Math.PI).translate([W / 2, H / 2])
  const path = d3.geoPath(proj, ctx)

  // Land fill with subtle inner shadow effect
  ctx.fillStyle = P.land
  ctx.beginPath()
  path(topojson.feature(world, world.objects.countries))
  ctx.fill()

  // Coast / land edge — thin dark stroke for depth
  ctx.strokeStyle = P.ocean
  ctx.lineWidth = 1.2
  ctx.globalAlpha = 0.35
  ctx.beginPath()
  path(topojson.feature(world, world.objects.countries))
  ctx.stroke()
  ctx.globalAlpha = 1

  // Country borders — clearly visible
  ctx.strokeStyle = P.border
  ctx.lineWidth = 1.4
  ctx.globalAlpha = 0.7
  ctx.beginPath()
  path(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
  ctx.stroke()
  ctx.globalAlpha = 1

  // Graticule — subtle 30° grid
  const graticule = d3.geoGraticule().step([30, 30])()
  ctx.strokeStyle = P.border
  ctx.lineWidth = 0.5
  ctx.globalAlpha = 0.15
  ctx.beginPath()
  path(graticule)
  ctx.stroke()
  ctx.globalAlpha = 1

  return new THREE.CanvasTexture(cvs)
}

export default function Globe({ segments, citiesDb, maxYear }) {
  const mountRef = useRef(null)
  const glRef    = useRef(null)  // holds { renderer, scene, camera, controls, dataGroup }

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.clientWidth, H = el.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(P.bg)

    // Camera
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.z = 2.75

    // Lights — warm sun + cool rim + ambient fill
    const sun = new THREE.DirectionalLight(0xfff6e8, 1.2)
    sun.position.set(5, 4, 5)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0xd0e8ff, 0.25)
    rim.position.set(-4, -2, -4)
    scene.add(rim)
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.04
    controls.autoRotate       = true
    controls.autoRotateSpeed  = 0.35
    controls.minDistance      = 1.35
    controls.maxDistance      = 5.0
    controls.enablePan        = false

    // Earth sphere — 96 segments for smooth silhouette
    const earthGeo = new THREE.SphereGeometry(R, 96, 96)
    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(P.ocean),
      shininess: 30,
      specular: new THREE.Color('#1a3d6e'),
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    // Atmosphere halo — layered for depth
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.030, 64, 64),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(P.atmo),
        transparent: true, opacity: 0.10,
        side: THREE.BackSide,
        depthWrite: false,
      })
    ))
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.065, 64, 64),
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(P.atmo),
        transparent: true, opacity: 0.04,
        side: THREE.BackSide,
        depthWrite: false,
      })
    ))

    // Async: fetch topology → build canvas texture → apply to earth
    fetch(TOPO)
      .then(r => r.json())
      .then(world => {
        const tex = makeEarthTexture(world)
        tex.anisotropy = 4
        earthMat.map = tex
        earthMat.color.set(0xffffff)
        earthMat.shininess = 22
        earthMat.needsUpdate = true
      })
      .catch(err => console.warn('Topology load failed:', err))

    // Group re-created whenever flight data changes
    const dataGroup = new THREE.Group()
    scene.add(dataGroup)

    // Render loop
    let raf
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    // Responsive resize
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    glRef.current = { renderer, scene, camera, controls, dataGroup, earthGeo, earthMat }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      earthGeo.dispose()
      earthMat.map?.dispose()
      earthMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      glRef.current = null
    }
  }, [])

  // ── Dynamic: rebuild arcs + city markers on data/year change ─────────────
  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    const { dataGroup } = gl

    const toDispose = []

    // Clear previous objects
    while (dataGroup.children.length) {
      dataGroup.remove(dataGroup.children[0])
    }

    const vis = segments.filter(s => !s.year || s.year <= maxYear)

    // Shared materials
    const arcMat  = new THREE.LineBasicMaterial({ color: P.arc,  transparent: true, opacity: 0.80 })
    const xferMat = new THREE.LineBasicMaterial({ color: P.xfer, transparent: true, opacity: 0.55 })
    const dotMat  = new THREE.MeshPhongMaterial({ color: P.city, emissive: P.city, emissiveIntensity: 0.3 })
    const hubMat  = new THREE.MeshPhongMaterial({ color: P.hub,  transparent: true, opacity: 0.65 })
    const dotGeo  = new THREE.SphereGeometry(0.013, 10, 10)
    toDispose.push(arcMat, xferMat, dotMat, hubMat, dotGeo)

    // Flight arcs
    vis.forEach(seg => {
      if (!seg.originCoords || !seg.destCoords) return
      const pts = greatCirclePoints(
        seg.originCoords.lat, seg.originCoords.lon,
        seg.destCoords.lat,   seg.destCoords.lon,
        80,
      ).map(([lat, lon]) => ll2v(lat, lon, R * 1.007))
      if (pts.length < 2) return
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      toDispose.push(geo)
      dataGroup.add(new THREE.Line(geo, seg.isTransfer ? xferMat : arcMat))
    })

    // City markers
    const seen = new Map()
    vis.forEach(seg => {
      const add = (name, coords, isHub) => {
        if (!coords) return
        const k = normalizeCode(name)
        if (!seen.has(k)) seen.set(k, { coords, isHub })
      }
      add(seg.originName, seg.originCoords, false)
      add(seg.destName,   seg.destCoords,   citiesDb[normalizeCode(seg.destName)]?.isHub ?? false)
    })

    seen.forEach(({ coords, isHub }) => {
      const mesh = new THREE.Mesh(dotGeo, isHub ? hubMat : dotMat)
      mesh.position.copy(ll2v(coords.lat, coords.lon, R * 1.014))
      dataGroup.add(mesh)
    })

    return () => {
      while (dataGroup.children.length) dataGroup.remove(dataGroup.children[0])
      toDispose.forEach(d => d.dispose())
    }
  }, [segments, citiesDb, maxYear])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
}
