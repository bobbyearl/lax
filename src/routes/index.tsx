import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/retroui/Button'
import { Input } from '@/components/retroui/Input'
import { Card } from '@/components/retroui/Card'
import { CollegeMap } from '@/components/CollegeMap'
import {
  Map as MapIcon,
  MapPin,
  Layers,
  RotateCcw,
  Star,
  Trash2,
  Mail,
  Download,
  Upload,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useFavorites } from '@/components/FavoritesProvider'
import { EmailComposer } from '@/components/EmailComposer'
import collegeData from '../data/2026-06-15.json'

type College = (typeof collegeData.colleges)[number]

type SearchParams = {
  map?: '1'
  clustered?: '1'
  syncList?: '0'
  lat?: string
  lng?: string
  zoom?: string
  league?: string
  division?: string
  gender?: string
  state?: string
  search?: string
  conference?: string
  favorites?: '1'
}

export const Route = createFileRoute('/')({
  component: Home,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    map: search.map === '1' ? '1' : undefined,
    clustered: search.clustered === '1' ? '1' : undefined,
    syncList: search.syncList === '0' ? '0' : undefined,
    lat: (search.lat as string) || undefined,
    lng: (search.lng as string) || undefined,
    zoom: (search.zoom as string) || undefined,
    league: (search.league as string) || undefined,
    division: (search.division as string) || undefined,
    gender: (search.gender as string) || undefined,
    state: (search.state as string) || undefined,
    search: (search.search as string) || undefined,
    conference: (search.conference as string) || undefined,
    favorites: search.favorites === '1' ? '1' : undefined,
  }),
})

function useColleges() {
  return useQuery({
    queryKey: ['colleges'],
    queryFn: () => collegeData.colleges,
    initialData: collegeData.colleges,
  })
}

function useFilters() {
  const params = Route.useSearch()
  const league = params.league ?? ''
  const division = params.division ?? ''
  const gender = params.gender ?? ''
  const state = params.state ?? ''
  const search = params.search ?? ''
  const conference = params.conference ?? ''
  const showFavorites = params.favorites === '1'
  const navigate = useNavigate({ from: '/' })

  const setFilter = (updates: Partial<SearchParams>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...updates }
        return Object.fromEntries(Object.entries(next).filter(([, v]) => !!v))
      },
    })
  }

  const clearFilters = () => {
    navigate({
      search: (prev) => {
        const {
          league: _,
          division: _d,
          gender: _g,
          state: _s,
          search: _q,
          conference: _c,
          ...rest
        } = prev as Record<string, string>
        return rest
      },
    })
  }

  return {
    league,
    division,
    gender,
    state,
    search,
    conference,
    showFavorites,
    setFilter,
    clearFilters,
  }
}

function Home() {
  const { data: colleges } = useColleges()
  const {
    league,
    division,
    gender,
    state,
    search,
    conference,
    showFavorites,
    setFilter,
    clearFilters,
  } = useFilters()
  const { favorites, count: favCount } = useFavorites()
  const clustered = Route.useSearch().clustered === '1'
  const syncList = Route.useSearch().syncList !== '0'
  const showMap = Route.useSearch().map === '1'
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [bounds, setBounds] = useState<{
    north: number
    south: number
    east: number
    west: number
  } | null>(null)
  const [showEmail, setShowEmail] = useState(false)

  const params = Route.useSearch()
  const initialCenter =
    params.lat && params.lng
      ? { lat: parseFloat(params.lat), lng: parseFloat(params.lng) }
      : undefined
  const initialZoom = params.zoom ? parseFloat(params.zoom) : undefined

  const cameraTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleCameraChange = useCallback(
    (
      center: { lat: number; lng: number },
      zoom: number,
      newBounds: { north: number; south: number; east: number; west: number },
    ) => {
      clearTimeout(cameraTimerRef.current)
      cameraTimerRef.current = setTimeout(() => {
        setBounds(newBounds)
        setFilter({
          lat: center.lat.toFixed(4),
          lng: center.lng.toFixed(4),
          zoom: zoom.toFixed(1),
        })
      }, 300)
    },
    [setFilter],
  )

  const handleLocateMe = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => alert('Could not get your location'),
    )
  }

  const options = useMemo(() => {
    // Each dropdown shows only values that exist given the OTHER active filters
    const matchesOtherFilters = (c: College, excludeFilter: string) => {
      if (excludeFilter !== 'league' && league && c.league !== league)
        return false
      if (excludeFilter !== 'division' && division && c.division !== division)
        return false
      if (excludeFilter !== 'gender' && gender && c.gender !== gender)
        return false
      if (excludeFilter !== 'state' && state && c.state !== state) return false
      if (
        excludeFilter !== 'conference' &&
        conference &&
        c.conference !== conference
      )
        return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false
      if (showFavorites && !favorites.has(c.id)) return false
      return true
    }

    const unique = (key: keyof College, filterName: string) =>
      [
        ...new Set(
          colleges
            .filter((c) => matchesOtherFilters(c, filterName))
            .map((c) => c[key]),
        ),
      ]
        .filter(Boolean)
        .sort() as string[]

    return {
      leagues: unique('league', 'league'),
      divisions: unique('division', 'division'),
      genders: unique('gender', 'gender'),
      states: unique('state', 'state'),
      conferences: unique('conference', 'conference'),
    }
  }, [
    colleges,
    league,
    division,
    gender,
    state,
    search,
    conference,
    showFavorites,
    favorites,
  ])

  // Auto-clear filters whose selected value no longer exists in the available options
  useEffect(() => {
    const stale: Partial<SearchParams> = {}
    if (league && !options.leagues.includes(league)) stale.league = undefined
    if (division && !options.divisions.includes(division))
      stale.division = undefined
    if (gender && !options.genders.includes(gender)) stale.gender = undefined
    if (state && !options.states.includes(state)) stale.state = undefined
    if (conference && !options.conferences.includes(conference))
      stale.conference = undefined
    if (Object.keys(stale).length > 0) setFilter(stale)
  }, [options, league, division, gender, state, conference, setFilter])

  const filtered = useMemo(() => {
    return colleges
      .filter((c) => {
        if (league && c.league !== league) return false
        if (division && c.division !== division) return false
        if (gender && c.gender !== gender) return false
        if (state && c.state !== state) return false
        if (conference && c.conference !== conference) return false
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
          return false
        if (showFavorites && !favorites.has(c.id)) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [
    colleges,
    league,
    division,
    gender,
    state,
    search,
    conference,
    showFavorites,
    favorites,
  ])

  const hasFilters = !!(
    league ||
    division ||
    gender ||
    state ||
    search ||
    conference
  )

  const listColleges = useMemo(() => {
    if (!syncList || !bounds) return filtered
    return filtered.filter(
      (c) =>
        c.lat >= bounds.south &&
        c.lat <= bounds.north &&
        c.lng >= bounds.west &&
        c.lng <= bounds.east,
    )
  }, [filtered, syncList, bounds])

  return (
    <div className="page-container-wide">
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title mb-0">Lax List</h1>
        <div className="flex items-center gap-2">
          {favCount > 0 && (
            <button
              onClick={() => setShowEmail(true)}
              className="header-email-btn"
              title="Email coaches"
            >
              <Mail className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() =>
              setFilter({ favorites: showFavorites ? undefined : '1' })
            }
            className={`header-fav-btn ${showFavorites ? 'header-fav-btn-active' : ''}`}
            title={showFavorites ? 'Show all' : 'Show favorites'}
          >
            <Star
              className={`h-4 w-4 ${showFavorites ? 'fill-current' : ''}`}
            />
            {favCount > 0 && (
              <span className="header-fav-count">{favCount}</span>
            )}
          </button>
          <ThemeToggle />
        </div>
      </div>
      <p className="page-subtitle">
        {listColleges.length.toLocaleString()} of{' '}
        {colleges.length.toLocaleString()} college lacrosse programs
      </p>

      <Card className="w-full mb-6">
        <Card.Content>
          <div className="filter-bar">
            <Input
              placeholder="Search by name..."
              value={search || ''}
              onChange={(e) => setFilter({ search: e.target.value })}
              className="filter-search filter-input"
            />
            <FilterSelect
              value={gender || ''}
              onChange={(v) => setFilter({ gender: v })}
              options={options.genders}
              label="Gender"
            />
            <FilterSelect
              value={league || ''}
              onChange={(v) => setFilter({ league: v })}
              options={options.leagues}
              label="League"
            />
            <FilterSelect
              value={division || ''}
              onChange={(v) => setFilter({ division: v })}
              options={options.divisions}
              label="Division"
            />
            <FilterSelect
              value={conference || ''}
              onChange={(v) => setFilter({ conference: v })}
              options={options.conferences}
              label="Conference"
            />
            <FilterSelect
              value={state || ''}
              onChange={(v) => setFilter({ state: v })}
              options={options.states}
              label="State"
            />
            {hasFilters && (
              <Button
                variant="link"
                onClick={clearFilters}
                size="sm"
                className="filter-btn"
              >
                Clear all
              </Button>
            )}

            <div className="filter-actions">
              <Button
                variant={showMap ? 'default' : 'outline'}
                size="icon"
                className="filter-btn w-9 sm:w-10"
                onClick={() => {
                  if (showMap) {
                    setFilter({
                      map: undefined,
                      lat: undefined,
                      lng: undefined,
                      zoom: undefined,
                      clustered: undefined,
                      syncList: undefined,
                    })
                  } else {
                    setFilter({ map: '1' })
                  }
                }}
                aria-label="Toggle map"
              >
                <MapIcon className="icon-sm" />
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className={showMap ? 'content-split' : ''}>
        <ListView
          colleges={listColleges}
          hoveredId={hoveredId}
          onHover={setHoveredId}
        />

        {showMap && (
          <div className="map-panel">
            <Card className="w-full mb-3">
              <Card.Content>
                <div className="map-toolbar">
                  <Button
                    variant={syncList ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setFilter({ syncList: syncList ? '0' : undefined })
                    }
                  >
                    Sync to map
                  </Button>
                  <Button
                    variant={clustered ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setFilter({ clustered: clustered ? undefined : '1' })
                    }
                  >
                    <Layers className="icon-sm-leading" />
                    Cluster
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLocateMe}>
                    <MapPin className="icon-sm-leading" />
                    My location
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilter({
                        lat: undefined,
                        lng: undefined,
                        zoom: undefined,
                        clustered: undefined,
                        syncList: undefined,
                      })
                      setResetKey((k) => k + 1)
                    }}
                  >
                    <RotateCcw className="icon-sm-leading" />
                    Reset map
                  </Button>
                </div>
              </Card.Content>
            </Card>
            <Card className="w-full overflow-hidden">
              <CollegeMap
                colleges={filtered}
                clustered={clustered}
                userLocation={userLocation}
                hoveredId={hoveredId}
                initialCenter={initialCenter}
                initialZoom={initialZoom}
                resetKey={resetKey}
                onCameraChange={handleCameraChange}
              />
            </Card>
          </div>
        )}
      </div>

      {showEmail && (
        <EmailComposer
          colleges={colleges}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  )
}

function ListView({
  colleges,
  hoveredId,
  onHover,
}: {
  colleges: College[]
  hoveredId: string | null
  onHover: (id: string | null) => void
}) {
  const { toggle, isFavorite, count, clear, exportFavorites, importFavorites } =
    useFavorites()
  const showFavorites = Route.useSearch().favorites === '1'

  return (
    <Card className="w-full overflow-hidden">
      {showFavorites && (
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b-2 bg-accent">
          <span className="text-xs text-muted-foreground">
            {count} favorite{count !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            {count > 0 && (
              <Button
                variant="link"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  await exportFavorites()
                  alert(`${count} favorites copied to clipboard`)
                }}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            )}
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  const n = importFavorites(text)
                  if (n > 0) alert(`Imported ${n} favorites`)
                  else
                    alert(
                      'No favorites found in clipboard. Export from another device first.',
                    )
                } catch {
                  alert('Could not read clipboard.')
                }
              }}
            >
              <Upload className="h-3 w-3 mr-1" />
              Import
            </Button>
            {count > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={clear}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="list-table">
          <thead className="list-thead">
            <tr>
              <th className="list-th w-8"></th>
              <th className="list-th">Name</th>
              <th className="list-th">Location</th>
              <th className="list-th">League</th>
              <th className="list-th-hidden-mobile">Division</th>
              <th className="list-th-hidden-mobile">Conference</th>
              <th className="list-th">Gender</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {colleges.map((c) => (
              <tr
                key={c.id}
                className={`list-row ${hoveredId === c.id ? 'list-row-active' : ''}`}
                onMouseEnter={() => onHover(c.id)}
                onMouseLeave={() => onHover(null)}
              >
                <td className="list-td px-1 sm:px-2 text-center">
                  <button
                    onClick={() => toggle(c.id)}
                    className="fav-btn"
                    aria-label={
                      isFavorite(c.id)
                        ? 'Remove from favorites'
                        : 'Add to favorites'
                    }
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${isFavorite(c.id) ? 'fill-current text-amber-500' : 'text-muted-foreground'}`}
                    />
                  </button>
                </td>
                <td className="list-td">
                  {c.team_website_url ? (
                    <a
                      href={c.team_website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="list-link"
                    >
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                  {'first_season' in c &&
                    (c as Record<string, unknown>).first_season && (
                      <span
                        className="first-season-badge"
                        title={`First season: ${(c as Record<string, unknown>).first_season}`}
                      >
                        *{(c as Record<string, unknown>).first_season}
                      </span>
                    )}
                </td>
                <td className="list-td-muted">
                  {c.city}, {c.state}
                </td>
                <td className="list-td">{c.league}</td>
                <td className="list-td-hidden-mobile">{c.division ?? '—'}</td>
                <td className="list-td-hidden-mobile list-td-muted">
                  {c.conference ?? '—'}
                </td>
                <td className="list-td capitalize">{c.gender}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  label: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="filter-select"
    >
      <option value="">All {label}s</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}
