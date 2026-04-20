import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { normalizeCode } from '../data/parseCsv.js'
import { greatCirclePoints } from '../utils/geo.js'

const R = 1.0

const TOPO        = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const BLUE_MARBLE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'

const P = {
  bg:     '#f6f5f4',
  ocean:  '#0b1d35',
  land:   '#d4ccc4',
  border: 'rgba(255,255,255,0.55)',
  arc:    '#0075de',
  xfer:   '#62aef0',
  city:   '#f59e0b',
  hub:    '#c4bfba',
  atmo:   '#4a8fd4',
}

function ll2v(lat, lon, r = R) {
  const phi = (90 - lat) * (Math.PI / 180)
  const lam = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(lam),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(lam),
  )
}

function makeFallbackTexture(world) {
  const W = 4096, H = 2048
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')
  ctx.fillStyle = P.ocean
  ctx.fillRect(0, 0, W, H)
  const proj = d3.geoEquirectangular().scale(H / Math.PI).translate([W / 2, H / 2])
  const path = d3.geoPath(proj, ctx)
  ctx.fillStyle = P.land
  ctx.beginPath()
  path(topojson.feature(world, world.objects.countries))
  ctx.fill()
  return new THREE.CanvasTexture(cvs)
}

function makeBorderTexture(world) {
  const W = 4096, H = 2048
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')
  const proj = d3.geoEquirectangular().scale(H / Math.PI).translate([W / 2, H / 2])
  const path = d3.geoPath(proj, ctx)

  ctx.strokeStyle = P.border
  ctx.lineWidth = 1.6
  ctx.beginPath()
  path(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
  ctx.stroke()

  const graticule = d3.geoGraticule().step([30, 30])()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  path(graticule)
  ctx.stroke()

  return new THREE.CanvasTexture(cvs)
}

function makeCircleSprite(hexColor) {
  const sz = 64
  const cvs = document.createElement('canvas')
  cvs.width = sz; cvs.height = sz
  const ctx = cvs.getContext('2d')
  ctx.clearRect(0, 0, sz, sz)
  ctx.beginPath()
  ctx.arc(sz / 2, sz / 2, sz / 2 - 2, 0, Math.PI * 2)
  ctx.fillStyle = hexColor
  ctx.fill()
  return new THREE.CanvasTexture(cvs)
}

export default function Globe({ segments, citiesDb, maxYear }) {
  const mountRef = useRef(null)
  const glRef    = useRef(null)

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.clientWidth, H = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    el.appendChild(renderer.domElement)

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(W, H)
    Object.assign(labelRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0',
      pointerEvents: 'none', overflow: 'hidden',
    })
    el.appendChild(labelRenderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(P.bg)

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
    camera.position.z = 2.75

    const sun = new THREE.DirectionalLight(0xfff6e8, 1.3)
    sun.position.set(5, 4, 5)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0xd0e8ff, 0.3)
    rim.position.set(-4, -2, -4)
    scene.add(rim)
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping    = true
    controls.dampingFactor    = 0.04
    controls.autoRotate       = true
    controls.autoRotateSpeed  = 0.35
    controls.minDistance      = 1.35
    controls.maxDistance      = 5.0
    controls.enablePan        = false

    const earthGeo = new THREE.SphereGeometry(R, 96, 96)
    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(P.ocean),
      shininess: 35,
      specular: new THREE.Color('#1a3d6e'),
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    scene.add(earth)

    for (const [scale, opacity] of [[1.030, 0.10], [1.070, 0.04]]) {
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(R * scale, 64, 64),
        new THREE.MeshPhongMaterial({ color: new THREE.Color(P.atmo), transparent: true, opacity, side: THREE.BackSide, depthWrite: false })
      ))
    }

    const dataGroup = new THREE.Group()
    scene.add(dataGroup)

    let cancelled = false

    const texLoader = new THREE.TextureLoader()
    texLoader.load(
      BLUE_MARBLE,
      (tex) => {
        if (cancelled) { tex.dispose(); return }
        tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
        tex.colorSpace = THREE.SRGBColorSpace
        earthMat.map = tex
        earthMat.color.set(0xffffff)
        earthMat.shininess = 20
        earthMat.needsUpdate = true
      },
      undefined,
      () => fetch(TOPO).then(r => r.json()).then(world => {
        if (cancelled) return
        earthMat.map = makeFallbackTexture(world)
        earthMat.color.set(0xffffff)
        earthMat.needsUpdate = true
      })
    )

    // Load TopoJSON for border overlay only
    fetch(TOPO)
      .then(r => r.json())
      .then(world => {
        if (cancelled) return
        const borderTex = makeBorderTexture(world)
        borderTex.anisotropy = 4
        scene.add(new THREE.Mesh(
          new THREE.SphereGeometry(R * 1.0015, 96, 96),
          new THREE.MeshBasicMaterial({ map: borderTex, transparent: true, depthWrite: false })
        ))
      })
      .catch(err => console.warn('Topology load failed:', err))

    // Render loop
    let raf
    const camNorm = new THREE.Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)

      // City label visibility: show only when zoomed in + facing camera
      const cityLabels = glRef.current?.cityLabels
      if (cityLabels?.length) {
        const dist = camera.position.length()
        camNorm.copy(camera.position).normalize()
        cityLabels.forEach(({ obj, pos }) => {
          const facing = camNorm.dot(pos) > 0.2
          obj.element.style.opacity = facing ? '1' : '0'
          obj.element.style.fontSize = dist < 1.7 ? '11px' : dist < 2.2 ? '10px' : '9px'
        })
      }
    }
    tick()

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      labelRenderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    glRef.current = { renderer, labelRenderer, scene, camera, controls, dataGroup, earthGeo, earthMat }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      earthGeo.dispose()
      earthMat.map?.dispose()
      earthMat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement))      el.removeChild(renderer.domElement)
      if (el.contains(labelRenderer.domElement)) el.removeChild(labelRenderer.domElement)
      glRef.current = null
    }
  }, [])

  // ── Dynamic: rebuild arcs, city markers, and city labels ──────────────────
  useEffect(() => {
    const gl = glRef.current
    if (!gl) return
    const { dataGroup } = gl
    const toDispose = []

    while (dataGroup.children.length) dataGroup.remove(dataGroup.children[0])
    gl.cityLabels = []

    const vis = segments.filter(s => !s.year || s.year <= maxYear)

    const arcMat  = new THREE.LineBasicMaterial({ color: P.arc,  transparent: true, opacity: 0.85 })
    const xferMat = new THREE.LineBasicMaterial({ color: P.xfer, transparent: true, opacity: 0.55 })
    toDispose.push(arcMat, xferMat)

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

    // Build unique city set
    const seen = new Map()
    vis.forEach(seg => {
      const add = (code, coords, isHub) => {
        if (!coords) return
        const k = normalizeCode(code)
        if (!seen.has(k)) seen.set(k, { coords, isHub })
      }
      add(seg.originName, seg.originCoords, false)
      add(seg.destName,   seg.destCoords,   citiesDb[normalizeCode(seg.destName)]?.isHub ?? false)
    })

    // City dot positions
    const termPos = [], hubPos = []
    seen.forEach(({ coords, isHub }) => {
      const v = ll2v(coords.lat, coords.lon, R * 1.008)
      if (isHub) { hubPos.push(v.x, v.y, v.z) }
      else       { termPos.push(v.x, v.y, v.z) }
    })

    const citySprite = makeCircleSprite(P.city)
    const hubSprite  = makeCircleSprite(P.hub)
    toDispose.push(citySprite, hubSprite)

    if (termPos.length) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(termPos, 3))
      const mat = new THREE.PointsMaterial({ map: citySprite, size: 0.030, sizeAttenuation: true, transparent: true, alphaTest: 0.4, depthWrite: false })
      dataGroup.add(new THREE.Points(geo, mat))
      toDispose.push(geo, mat)
    }

    if (hubPos.length) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(hubPos, 3))
      const mat = new THREE.PointsMaterial({ map: hubSprite, size: 0.020, sizeAttenuation: true, transparent: true, alphaTest: 0.4, depthWrite: false, opacity: 0.7 })
      dataGroup.add(new THREE.Points(geo, mat))
      toDispose.push(geo, mat)
    }

    // City name labels (non-hub only, shown when zoomed in)
    const cityLabels = []
    seen.forEach(({ coords, isHub }, code) => {
      if (isHub) return
      const cityName = citiesDb[code]?.city || code
      const pos = ll2v(coords.lat, coords.lon, R * 1.012)

      const div = document.createElement('div')
      div.textContent = cityName
      div.style.cssText = [
        'color:rgba(255,255,255,0.95)',
        'font-size:9px',
        'font-weight:600',
        'font-family:Inter,system-ui,sans-serif',
        'pointer-events:none',
        'text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.6)',
        'white-space:nowrap',
        'opacity:0',
        'transition:opacity 0.2s',
        'user-select:none',
        'margin-left:7px',
      ].join(';')

      const obj = new CSS2DObject(div)
      obj.position.copy(pos)
      dataGroup.add(obj)
      cityLabels.push({ obj, pos: pos.clone().normalize() })
    })
    gl.cityLabels = cityLabels

    return () => {
      gl.cityLabels = []
      while (dataGroup.children.length) dataGroup.remove(dataGroup.children[0])
      toDispose.forEach(d => d.dispose())
    }
  }, [segments, citiesDb, maxYear])

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
  )
}
