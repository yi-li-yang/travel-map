import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Globe } from './components/Globe.jsx'
import { Timeline } from './components/Timeline.jsx'
import { Drawer, DRAWER_TABS, SHEET_HEIGHT } from './components/Drawer.jsx'
import { Overview } from './components/Overview.jsx'
import { CityPanel, RoutePanel } from './components/SelectionPanel.jsx'
import { TripPanel } from './components/TripPanel.jsx'
import { TripList } from './components/TripList.jsx'
import { MapControls } from './components/MapControls.jsx'
import { Tooltip } from './components/Tooltip.jsx'
import { LoadingScreen, ErrorScreen, WebglError, EmptyHero } from './components/Screens.jsx'
import { UserSwitcher } from './components/UserSwitcher.jsx'
import { Toasts } from './components/ui/Toasts.jsx'
import { Button } from './components/ui/Button.jsx'
import { PanelIcon } from './components/ui/Icons.jsx'
import { useTravelData } from './data/useTravelData.js'
import { tripRouteKeys } from './data/route.js'
import { USERS } from './data/users.js'
import { useMedia } from './hooks/useMedia.js'
import { usePlayback } from './hooks/usePlayback.js'
import { useDockSpace } from './hooks/useDockSpace.js'
import { useSelection, selectionKey } from './hooks/useSelection.js'
import {
  listYears,
  tripsPerYear,
  countPlaces,
  countryFirstYears,
  routeYearsMap,
  kmByTrip,
  homeOf,
  computeStats,
  computeCity,
  computeRoute,
  computeTrip,
} from './utils/stats.js'

const DRAWER_W = 360
const BASEMAP_KEY = 'flightLog:basemap'
const thisYear = new Date().getFullYear()

function readBasemap() {
  try {
    return localStorage.getItem(BASEMAP_KEY) === 'satellite' ? 'satellite' : 'map'
  } catch {
    return 'map'
  }
}

export default function App() {
  // The app always opens on the first person; switching lasts for this visit only.
  const [user, setUser] = useState(USERS[0])
  const { trips, segments, citiesDb, updated, life, hasLoaded, error, retry } = useTravelData(user)
  const { selected, select, back, clear } = useSelection()

  const desktop = useMedia('(min-width: 768px)', true)
  const reduced = useMedia('(prefers-reduced-motion: reduce)')

  // ---- what the data looks like ----
  const years = useMemo(() => listYears(trips), [trips])
  const perYear = useMemo(() => tripsPerYear(trips), [trips])
  const minYear = years[0] ?? thisYear
  const maxYear = years[years.length - 1] ?? thisYear
  // Land on the latest year that has really happened, not a planned one.
  const nowYear = useMemo(() => [...years].reverse().find((y) => y <= thisYear) ?? maxYear, [years, maxYear])
  const placeCount = useMemo(() => countPlaces(trips), [trips])
  const firstCountries = useMemo(() => countryFirstYears(trips, citiesDb), [trips, citiesDb])
  const routeYears = useMemo(() => routeYearsMap(segments), [segments])
  const tripKm = useMemo(() => kmByTrip(segments), [segments])
  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips])
  const homePlace = useMemo(() => homeOf(trips, citiesDb), [trips, citiesDb])
  const homeCode = homePlace?.code
  const home = useMemo(() => (homePlace ? { code: homePlace.code, lon: homePlace.lon, lat: homePlace.lat } : null), [homeCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- view state ----
  const [year, setYear] = useState(null)
  const shownYear = year ?? nowYear
  const [scope, setScope] = useState('upto')
  const [tab, setTab] = useState('overview')
  const [drawerOpen, setDrawerOpen] = useState(null) // null until we know the screen size
  const [snap, setSnap] = useState('half') // how tall the phone sheet is
  const [preview, setPreview] = useState(null) // a route or place lit up by a row the pointer is over
  const [hover, setHover] = useState(null) // what the pointer is over on the globe
  const [basemap, setBasemap] = useState(readBasemap)
  const [spin, setSpin] = useState(true)
  const [mapStatus, setMapStatus] = useState('loading') // loading | ready | webgl-error
  const [toasts, setToasts] = useState([])
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
  const openRef = useRef(open)
  openRef.current = open

  const toast = useCallback((text) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-2), { id, text }])
  }, [])
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  // ---- timeline ----
  const playback = usePlayback({ years, year: shownYear, setYear })
  const { playing, start: startPlayback, stop: stopPlayback, setSpeed } = playback

  useEffect(() => {
    if (!hasLoaded || !years.length) return
    setYear((y) => (y === null ? (reduced ? nowYear : minYear) : Math.min(Math.max(y, minYear), maxYear)))
  }, [hasLoaded, years, reduced, nowYear, minYear, maxYear])

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

  const jumpToYear = useCallback(
    (y) => {
      stopPlayback()
      setYear(y)
    },
    [stopPlayback],
  )

  // ---- derived views ----
  const stats = useMemo(() => computeStats(trips, segments, citiesDb, shownYear, scope), [trips, segments, citiesDb, shownYear, scope])
  const cityView = useMemo(
    () => (selected?.type === 'city' ? computeCity(selected.code, trips, citiesDb, shownYear) : null),
    [selected, trips, citiesDb, shownYear],
  )
  const selectedTrip = selected?.tripId ? tripById.get(selected.tripId) : null
  const tripView = useMemo(() => (selectedTrip && selectedTrip.legs.length > 1 ? computeTrip(selectedTrip, citiesDb) : null), [selectedTrip, citiesDb])
  const routeView = useMemo(
    () => (selected?.type === 'route' && !tripView && selected.routeKeys.length === 1 ? computeRoute(selected.routeKeys[0], segments, shownYear) : null),
    [selected, tripView, segments, shownYear],
  )

  // ---- selection ----
  // A selection made on the globe or from the overview opens the side panel; one made from the trips list does not.
  const choose = useCallback(
    (sel, { reveal = true, keepBack = false } = {}) => {
      select(sel, { keepBack })
      if (!sel || !reveal) return
      setTab('overview')
      if (!openRef.current) setSnap('peek') // on a phone, leave the globe in view
      setDrawerOpen(true)
    },
    [select],
  )
  const chooseCity = useCallback((code, opts) => choose({ type: 'city', code }, opts), [choose])
  const chooseRoute = useCallback((keys, opts) => choose({ type: 'route', routeKeys: keys }, opts), [choose])
  const chooseTrip = useCallback(
    (trip, opts) => {
      choose({ type: 'route', routeKeys: tripRouteKeys(trip), tripId: trip.id }, opts)
      // A trip that has not happened yet only shows once the timeline reaches it.
      if (Number(trip.year) > shownYear) jumpToYear(Number(trip.year))
    },
    [choose, shownYear, jumpToYear],
  )
  const flyToCountry = useCallback(
    (c) => {
      clear()
      globeRef.current?.flyTo({ lon: c.lon, lat: c.lat, zoom: 4 })
    },
    [clear],
  )

  const backLabel = (sel) => {
    if (!sel) return 'Overview'
    if (sel.type === 'city') return citiesDb[sel.code]?.city || sel.code
    const t = sel.tripId ? tripById.get(sel.tripId) : null
    return t ? `${t.year} trip` : 'Route'
  }

  // ---- what lights up on the globe ----
  // A row that opens something goes away under the pointer without a mouse-leave, so clear its preview.
  useEffect(() => {
    setPreview(null)
  }, [selected, tab, scope])

  const hoverKind = hover?.kind
  const hoverCode = hover?.code
  const hoverRoute = hover?.routeKey
  const hoverTarget = useMemo(() => {
    if (hoverKind === 'city') return { code: hoverCode }
    return hoverKind === 'route' ? { routeKeys: [hoverRoute] } : null
  }, [hoverKind, hoverCode, hoverRoute])
  const highlight = preview ?? hoverTarget

  // ---- people, basemap, map status ----
  const switchUser = (next) => {
    if (next.id === user.id) return
    stopPlayback()
    setYear(null)
    clear()
    setPreview(null)
    setHover(null)
    setScope('upto')
    setTab('overview')
    introRef.current = 'idle' // routes draw themselves in again for the new person
    setUser(next)
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
      else if (s === 'tiles-error') toast('Map tiles could not load. Your trips still show on the globe.')
      else if (s === 'webgl-error') setMapStatus('webgl-error')
    },
    [toast],
  )

  // ---- layout numbers shared with the globe ----
  const [dockEl, setDockEl] = useState(null)
  const dockSpace = useDockSpace(dockEl)
  const dockH = (dockSpace || (desktop ? 108 : 230)) + 4
  const sheetOpen = !desktop && open
  const padding = useMemo(
    () => ({
      top: 0,
      left: 0,
      right: desktop && open ? DRAWER_W + 24 : 0,
      bottom: sheetOpen ? Math.round(vh * SHEET_HEIGHT[snap]) : dockH,
    }),
    [desktop, open, sheetOpen, snap, vh, dockH],
  )
  const dockRight = desktop && open ? DRAWER_W + 32 : 16

  const goTab = (id) => {
    setTab(id)
    setSnap('half')
    setDrawerOpen(true)
  }

  const showSelection = tab === 'overview' && (cityView || tripView || routeView)
  const isEmpty = hasLoaded && trips.length === 0

  if (error) return <ErrorScreen message={error} onRetry={retry} />

  return (
    <div className="fixed inset-0 overflow-hidden bg-ground" style={{ '--dock-h': `${dockH}px` }}>
      {hasLoaded && (
        <Globe
          ref={globeRef}
          segments={segments}
          citiesDb={citiesDb}
          maxYear={shownYear}
          selected={selected}
          highlight={highlight}
          onSelect={(sel) => choose(sel)}
          onHover={setHover}
          onStatus={onMapStatus}
          basemap={basemap}
          padding={padding}
          reducedMotion={reduced}
          autoRotate={spin}
          home={home}
        />
      )}
      {mapStatus === 'webgl-error' && <WebglError />}

      {/* Brand */}
      <header className="pointer-events-none absolute left-4 top-4 z-10 md:left-6 md:top-5">
        <h1 className="stop text-[25px] font-semibold leading-[1.15] md:text-[31px]">Travel Log</h1>
        <p className="mt-2 text-[14px] text-muted">
          <span className="num">{trips.length}</span> {trips.length === 1 ? 'trip' : 'trips'} · <span className="num">{placeCount}</span>{' '}
          {placeCount === 1 ? 'place' : 'places'}
        </p>
        {updated && (
          <p className="text-[12px] text-muted">
            Updated {new Date(updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        <UserSwitcher users={USERS} current={user} onChange={switchUser} />
      </header>

      {/* Top right: only while the panel is closed on desktop */}
      {desktop && !open && (
        <div className="absolute right-4 top-4 z-10">
          <Button className="panel" onClick={() => setDrawerOpen(true)} aria-expanded={false}>
            <PanelIcon /> Open panel
          </Button>
        </div>
      )}

      <MapControls
        className="absolute z-10 transition-[right] duration-panel"
        style={{ right: dockRight, bottom: dockH + 12, display: sheetOpen ? 'none' : undefined }}
        onZoomIn={() => globeRef.current?.zoomBy(1)}
        onZoomOut={() => globeRef.current?.zoomBy(-1)}
        onReset={() => {
          clear()
          globeRef.current?.resetView()
        }}
        basemap={basemap}
        onToggleBasemap={toggleBasemap}
        spinning={spin && !reduced}
        onToggleSpin={reduced ? undefined : () => setSpin((s) => !s)}
      />

      <Tooltip hover={hover} citiesDb={citiesDb} routeYears={routeYears} rightLimit={desktop && open ? window.innerWidth - (DRAWER_W + 32) : undefined} />

      {isEmpty && <EmptyHero name={user.name} style={{ right: desktop && open ? DRAWER_W + 24 : 0 }} />}

      {/* Timeline dock */}
      <Timeline
        dockRef={setDockEl}
        className="absolute z-20 transition-[right] duration-panel"
        style={{ left: 16, right: dockRight, bottom: desktop ? 16 : 'calc(8px + env(safe-area-inset-bottom))' }}
        minYear={minYear}
        maxYear={maxYear}
        perYear={perYear}
        firstCountries={firstCountries}
        life={life}
        year={shownYear}
        onYear={jumpToYear}
        playing={playing}
        onToggle={playback.toggle}
        speed={playback.speed}
        onSpeed={setSpeed}
        footer={
          !desktop && (
            <nav className="mt-3 grid grid-cols-2 gap-1" aria-label="Open panel">
              {DRAWER_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => goTab(t.id)}
                  className="h-11 text-[14px] font-medium text-muted transition-colors duration-fast ease-out hover:bg-surface hover:text-ink"
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )
        }
      />

      <Drawer
        open={open}
        desktop={desktop}
        tab={tab}
        scrollKey={showSelection ? selectionKey(selected) : ''}
        snap={snap}
        onSnap={setSnap}
        onTab={setTab}
        onClose={() => setDrawerOpen(false)}
      >
        {tab === 'overview' && (
          <div key={showSelection ? selectionKey(selected) : 'overview'} className="animate-rise">
            {cityView && showSelection ? (
              <CityPanel
                city={cityView}
                citiesDb={citiesDb}
                back={backLabel(selected.back)}
                onBack={back}
                onSelectTrip={(t) => chooseTrip(t, { keepBack: true })}
                onPreview={setPreview}
              />
            ) : tripView && showSelection ? (
              <TripPanel
                view={tripView}
                citiesDb={citiesDb}
                back={backLabel(selected.back)}
                onBack={back}
                onSelectLeg={(key) => chooseRoute([key], { keepBack: true })}
                onPreview={setPreview}
              />
            ) : showSelection ? (
              <RoutePanel
                route={routeView}
                back={backLabel(selected.back)}
                onBack={back}
                onSelectCity={(code) => chooseCity(code, { keepBack: true })}
                onYear={jumpToYear}
              />
            ) : (
              <Overview
                stats={stats}
                year={shownYear}
                scope={scope}
                onScope={setScope}
                reduced={reduced}
                citiesDb={citiesDb}
                onFlyCountry={flyToCountry}
                onSelectCity={chooseCity}
                onSelectRoute={chooseRoute}
                onYear={jumpToYear}
                onPreview={setPreview}
              />
            )}
          </div>
        )}
        {tab === 'trips' && (
          <TripList
            trips={trips}
            citiesDb={citiesDb}
            year={shownYear}
            selected={selected}
            kmByTrip={tripKm}
            onSelectTrip={(t) => chooseTrip(t, { reveal: false })}
            onPreview={setPreview}
            onYear={jumpToYear}
          />
        )}
      </Drawer>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <LoadingScreen visible={!hasLoaded || mapStatus === 'loading'} message="Loading the trips" />
    </div>
  )
}
