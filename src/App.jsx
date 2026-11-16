import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Globe } from './components/Globe.jsx'
import { Timeline } from './components/Timeline.jsx'
import { Drawer } from './components/Drawer.jsx'
import { Overview } from './components/Overview.jsx'
import { CityPanel, RoutePanel } from './components/SelectionPanel.jsx'
import { FlightList } from './components/FlightList.jsx'
import { AddFlightForm } from './components/AddFlightForm.jsx'
import { MapControls } from './components/MapControls.jsx'
import { Tooltip } from './components/Tooltip.jsx'
import { LoadingScreen, ErrorScreen, WebglError, EmptyHero, ImportDialog, ShortcutsHelp } from './components/Screens.jsx'
import { Starfield } from './components/ui/Starfield.jsx'
import { Toasts } from './components/ui/Toasts.jsx'
import { Button } from './components/ui/Button.jsx'
import { PanelIcon, KeyboardIcon } from './components/ui/Icons.jsx'
import { DRAWER_TABS } from './components/Drawer.jsx'
import { useFlightData } from './data/useFlightData.js'
import { parseCsvText } from './data/parseCsv.js'
import { useMedia } from './hooks/useMedia.js'
import { usePlayback } from './hooks/usePlayback.js'
import { listYears, tripsPerYear, computeStats, computeCity, computeRoute } from './utils/stats.js'

const DRAWER_W = 360
const BASEMAP_KEY = 'flightLog:basemap'
const thisYear = new Date().getFullYear()

function isTyping(el) {
  return el && (el.closest?.('input, textarea, select, [contenteditable="true"]') || el.isContentEditable)
}

function readBasemap() {
  try {
    return localStorage.getItem(BASEMAP_KEY) === 'satellite' ? 'satellite' : 'map'
  } catch {
    return 'map'
  }
}

export default function App() {
  const data = useFlightData()
  const { rawRows, segments, citiesDb, isLoading, error } = data

  const desktop = useMedia('(min-width: 768px)', true)
  const reduced = useMedia('(prefers-reduced-motion: reduce)')

  const years = useMemo(() => listYears(rawRows), [rawRows])
  const perYear = useMemo(() => tripsPerYear(rawRows), [rawRows])
  const minYear = years[0] ?? thisYear
  const maxYear = years[years.length - 1] ?? thisYear
  // Land on the latest year that has really happened, not a planned one.
  const nowYear = useMemo(() => [...years].reverse().find((y) => y <= thisYear) ?? maxYear, [years, maxYear])

  const [year, setYear] = useState(null)
  const shownYear = year ?? nowYear
  const [scope, setScope] = useState('upto')
  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(null) // null until we know the screen size
  const [selected, setSelected] = useState(null)
  const [hover, setHover] = useState(null)
  const [basemap, setBasemap] = useState(readBasemap)
  const [mapStatus, setMapStatus] = useState('loading') // loading | ready | webgl-error
  const [toasts, setToasts] = useState([])
  const [pendingImport, setPendingImport] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [vh, setVh] = useState(() => window.innerHeight)

  const globeRef = useRef(null)
  const introRef = useRef('idle') // idle | running | done

  useEffect(() => {
    const on = () => setVh(window.innerHeight)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // The side panel starts open on desktop and closed on phones.
  const open = drawerOpen ?? desktop
  const setOpen = useCallback((v) => setDrawerOpen(v), [])

  // ---- toasts ----
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (text, action) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-2), { id, text, action }])
      setTimeout(() => dismissToast(id), action ? 7000 : 3600)
    },
    [dismissToast],
  )

  // ---- timeline ----
  const playback = usePlayback({ years, year: shownYear, setYear })
  const { playing, start: startPlayback, stop: stopPlayback, setSpeed } = playback

  useEffect(() => {
    if (isLoading || !years.length) return
    setYear((y) => (y === null ? (reduced ? nowYear : minYear) : Math.min(Math.max(y, minYear), maxYear)))
  }, [isLoading, years, reduced, nowYear, minYear, maxYear])

  // One orchestrated moment: when the globe is ready, routes draw themselves in, year by year.
  useEffect(() => {
    if (mapStatus !== 'ready' || introRef.current !== 'idle' || !years.length) return
    introRef.current = 'done'
    if (reduced || years.length < 2) return
    introRef.current = 'running'
    startPlayback({ from: minYear, speed: 3, stopAt: nowYear })
  }, [mapStatus, years, reduced, minYear, nowYear, startPlayback])

  useEffect(() => {
    if (introRef.current === 'running' && !playing) {
      introRef.current = 'done'
      setSpeed(1)
    }
  }, [playing, setSpeed])

  // ---- derived views ----
  const stats = useMemo(
    () => computeStats(rawRows, segments, citiesDb, shownYear, scope),
    [rawRows, segments, citiesDb, shownYear, scope],
  )
  const cityView = useMemo(
    () => (selected?.type === 'city' ? computeCity(selected.code, rawRows, segments, citiesDb, shownYear) : null),
    [selected, rawRows, segments, citiesDb, shownYear],
  )
  const routeView = useMemo(
    () =>
      selected?.type === 'route' && selected.routeKeys.length === 1
        ? computeRoute(selected.routeKeys[0], segments, citiesDb, shownYear)
        : null,
    [selected, segments, citiesDb, shownYear],
  )

  const airportCount = useMemo(() => {
    const set = new Set()
    for (const r of rawRows) {
      if (r.origin_city) set.add(r.origin_city)
      if (r.dest_city) set.add(r.dest_city)
    }
    return set.size
  }, [rawRows])

  const initialCenter = useMemo(() => {
    const home = stats.home
    return home ? [home.lon, Math.min(Math.max(home.lat, 10), 40)] : undefined
    // Only the first load decides where the globe starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  // ---- selection ----
  const select = useCallback(
    (sel, { reveal = true } = {}) => {
      setSelected(sel)
      if (sel && reveal) {
        setTab('overview')
        setOpen(true)
      }
    },
    [setOpen],
  )
  const selectCity = useCallback((code) => select({ type: 'city', code }), [select])
  const selectRouteFromOverview = useCallback((keys) => select({ type: 'route', routeKeys: keys }), [select])
  const selectRouteFromList = useCallback((keys) => select({ type: 'route', routeKeys: keys }, { reveal: false }), [select])
  const flyToCountry = useCallback((c) => {
    setSelected(null)
    globeRef.current?.flyTo({ lon: c.lon, lat: c.lat, zoom: 4 })
  }, [])

  // ---- actions ----
  const addFlight = (row) => {
    const added = data.addFlight(row)
    const y = Number(added.year)
    if (y > shownYear) setYear(y)
    stopPlayback()
    const keys = [added.origin_city, added.transfer_city, added.dest_city]
      .filter(Boolean)
      .map((c, i, a) => (i ? [a[i - 1], c].sort().join('|') : null))
      .filter(Boolean)
    setSelected({ type: 'route', routeKeys: keys })
    toast(`Added ${added.origin_city} to ${added.dest_city} in ${added.year}`)
  }

  const deleteFlight = (id) => {
    const removed = data.deleteFlight(id)
    if (!removed) return
    toast('Flight deleted', { label: 'Undo', run: () => data.restoreFlight(removed) })
  }

  const exportCsv = () => {
    const blob = new Blob([data.exportCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'flight_history.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`Exported ${rawRows.length} flights`)
  }

  const importFile = async (file) => {
    const text = await file.text()
    const parsed = parseCsvText(text, citiesDb)
    if (parsed.error) return toast(parsed.error)
    if (!parsed.rows.length) return toast('No valid flights found in that file.')
    setPendingImport({ ...parsed, fileName: file.name })
  }

  const confirmImport = () => {
    data.replaceFlights(pendingImport.rows)
    toast(`Imported ${pendingImport.rows.length} flights`)
    setSelected(null)
    setPendingImport(null)
  }

  const resetFlights = async () => {
    await data.resetToDefault()
    setSelected(null)
    toast('Restored the original flights')
  }

  const toggleBasemap = () => {
    const next = basemap === 'map' ? 'satellite' : 'map'
    setBasemap(next)
    try {
      localStorage.setItem(BASEMAP_KEY, next)
    } catch {
      /* preference just won't persist */
    }
  }

  const onMapStatus = useCallback(
    (s) => {
      if (s === 'ready') setMapStatus((m) => (m === 'loading' ? 'ready' : m))
      else if (s === 'tiles-error') toast('Map tiles could not load. Your flights still show on the globe.')
      else if (s === 'webgl-error') setMapStatus('webgl-error')
    },
    [toast],
  )

  // ---- keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (isTyping(t)) return
      if (e.key === 'Escape') {
        if (selected) setSelected(null)
        return
      }
      if (e.key === ' ') {
        if (t.closest?.('button, a, [role="tab"], [role="slider"]')) return
        e.preventDefault()
        playback.toggle()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (t.closest?.('[role="slider"], [role="tab"]')) return
        e.preventDefault()
        playback.step(e.key === 'ArrowRight' ? 1 : -1)
      } else if (e.key === '[') {
        setOpen(!open)
      } else if (e.key === '?') {
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, playback, open, setOpen])

  // ---- layout numbers shared with the globe ----
  const dockH = desktop ? 108 : 150
  const padding = useMemo(
    () => ({
      top: 0,
      left: 0,
      right: desktop && open ? DRAWER_W + 24 : 0,
      bottom: !desktop && open ? Math.round(vh * 0.6) : dockH,
    }),
    [desktop, open, vh, dockH],
  )

  const goTab = (id) => {
    setTab(id)
    setOpen(true)
  }

  const showSelection = tab === 'overview' && (cityView || routeView)
  const isEmpty = !isLoading && rawRows.length === 0

  if (error) return <ErrorScreen message={error} onRetry={data.retry} />

  const dockRight = desktop && open ? DRAWER_W + 32 : 16

  return (
    <div className="fixed inset-0 overflow-hidden bg-space" style={{ '--dock-h': `${dockH}px` }}>
      <Starfield />

      {!isLoading && (
        <Globe
          ref={globeRef}
          segments={segments}
          citiesDb={citiesDb}
          maxYear={shownYear}
          selected={selected}
          onSelect={(sel) => select(sel)}
          onHover={setHover}
          onStatus={onMapStatus}
          basemap={basemap}
          padding={padding}
          reducedMotion={reduced}
          initialCenter={initialCenter}
        />
      )}
      {mapStatus === 'webgl-error' && <WebglError />}

      {/* Brand */}
      <header className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-5">
        <h1 className="display text-[28px] leading-none md:text-[32px]">Flight Log</h1>
        <p className="mt-1.5 text-[13px] text-dim">
          {rawRows.length} {rawRows.length === 1 ? 'flight' : 'flights'} · {airportCount} {airportCount === 1 ? 'airport' : 'airports'}
        </p>
      </header>

      {/* Top right: only while the panel is closed on desktop */}
      {desktop && !open && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <Button variant="ghost" size="icon" className="panel" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts">
            <KeyboardIcon />
          </Button>
          <Button className="panel" onClick={() => setOpen(true)} aria-expanded={false}>
            <PanelIcon /> Open panel
          </Button>
        </div>
      )}

      <MapControls
        className="absolute z-10 transition-[right] duration-300"
        style={{ right: dockRight, bottom: dockH + 16, display: !desktop && open ? 'none' : undefined }}
        onZoomIn={() => globeRef.current?.zoomBy(1)}
        onZoomOut={() => globeRef.current?.zoomBy(-1)}
        onReset={() => {
          setSelected(null)
          globeRef.current?.resetView()
        }}
        basemap={basemap}
        onToggleBasemap={toggleBasemap}
      />

      <Tooltip hover={hover} citiesDb={citiesDb} />

      {isEmpty && (
        <EmptyHero
          style={{ right: desktop && open ? DRAWER_W + 24 : 0 }}
          onAdd={() => goTab('add')}
          onImport={() => goTab('flights')}
        />
      )}

      {/* Timeline dock */}
      <Timeline
        className="absolute z-20 transition-[right] duration-300"
        style={{ left: 16, right: dockRight, bottom: desktop ? 16 : 8 }}
        minYear={minYear}
        maxYear={maxYear}
        perYear={perYear}
        year={shownYear}
        onYear={(y) => {
          playback.stop()
          setYear(y)
        }}
        playing={playback.playing}
        onToggle={playback.toggle}
        speed={playback.speed}
        onSpeed={playback.setSpeed}
        footer={
          !desktop && (
            <nav className="mt-3 grid grid-cols-3 gap-1" aria-label="Open panel">
              {DRAWER_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => goTab(t.id)}
                  className="h-11 rounded-xl text-[13px] font-medium text-dim transition-colors hover:bg-white/[0.07] hover:text-fg"
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )
        }
      />

      <Drawer open={open} desktop={desktop} tab={tab} scrollKey={showSelection ? JSON.stringify(selected) : ''} onTab={setTab} onClose={() => setOpen(false)}>
        {tab === 'overview' &&
          (showSelection ? (
            cityView ? (
              <CityPanel city={cityView} citiesDb={citiesDb} onBack={() => setSelected(null)} onSelectRoute={selectRouteFromOverview} />
            ) : (
              <RoutePanel route={routeView} onBack={() => setSelected(null)} onSelectCity={selectCity} />
            )
          ) : (
            <Overview
              stats={stats}
              year={shownYear}
              scope={scope}
              onScope={setScope}
              reduced={reduced}
              citiesDb={citiesDb}
              onFlyCountry={flyToCountry}
              onSelectCity={selectCity}
              onSelectRoute={selectRouteFromOverview}
            />
          ))}
        {tab === 'flights' && (
          <FlightList
            rawRows={rawRows}
            citiesDb={citiesDb}
            year={shownYear}
            selected={selected}
            onSelectRoute={selectRouteFromList}
            onDelete={deleteFlight}
            onExport={exportCsv}
            onImportFile={importFile}
            onReset={resetFlights}
            onGoAdd={() => setTab('add')}
          />
        )}
        {tab === 'add' && <AddFlightForm citiesDb={citiesDb} rawRows={rawRows} onAdd={addFlight} />}
      </Drawer>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {pendingImport && (
        <ImportDialog
          pending={pendingImport}
          currentCount={rawRows.length}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {helpOpen && <ShortcutsHelp onClose={() => setHelpOpen(false)} />}

      <LoadingScreen visible={isLoading || mapStatus === 'loading'} message="Loading your flights" />
    </div>
  )
}
