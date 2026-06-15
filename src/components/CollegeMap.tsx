import { useEffect, useRef, useState } from 'react'
import { APIProvider, Map, useMap, InfoWindow, AdvancedMarker, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }
const DEFAULT_ZOOM = 4

type College = {
  id: string
  name: string
  lat: number
  lng: number
  league: string
  division: string | null
  gender: string
  city: string
  state: string
  team_website_url: string | null
}

export function CollegeMap({
  colleges,
  clustered,
  userLocation,
  hoveredId,
  initialCenter,
  initialZoom,
  resetKey,
  onCameraChange,
}: {
  colleges: College[]
  clustered: boolean
  userLocation: { lat: number; lng: number } | null
  hoveredId: string | null
  initialCenter?: { lat: number; lng: number }
  initialZoom?: number
  resetKey?: number
  onCameraChange?: (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number }) => void
}) {
  const [selected, setSelected] = useState<College | null>(null)

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={initialCenter ?? DEFAULT_CENTER}
        defaultZoom={initialZoom ?? DEFAULT_ZOOM}
        mapId={MAP_ID}
        className="map-container"
        gestureHandling="greedy"
        onClick={() => setSelected(null)}
        onCameraChanged={(ev) => {
          if (!onCameraChange) return
          const { center, zoom, bounds } = ev.detail
          if (bounds) {
            onCameraChange(
              { lat: center.lat, lng: center.lng },
              zoom,
              { north: bounds.north, south: bounds.south, east: bounds.east, west: bounds.west },
            )
          }
        }}
      >
        <ResetMap resetKey={resetKey} />
        {clustered ? (
          <ClusteredMarkers colleges={colleges} onSelect={setSelected} />
        ) : (
          <UnclustteredMarkers colleges={colleges} onSelect={setSelected} hoveredId={hoveredId} />
        )}
        {userLocation && (
          <>
            <ZoomToLocation location={userLocation} />
            <AdvancedMarker position={userLocation} title="You are here">
              <div className="marker-user" />
            </AdvancedMarker>
          </>
        )}
        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
            headerContent={<span className="info-window-name">{selected.name}</span>}
          >
            <div className="info-window">
              <p className="info-window-location">
                {selected.city}, {selected.state}
              </p>
              <p className="info-window-meta">
                {selected.league} {selected.division ?? ''} · {selected.gender}
              </p>
              {selected.team_website_url && (
                <a
                  href={selected.team_website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="info-window-link"
                >
                  Team website →
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}

/** Imperative markers managed entirely by MarkerClusterer - no React rendering per pin */
function ClusteredMarkers({
  colleges,
  onSelect,
}: {
  colleges: College[]
  onSelect: (c: College) => void
}) {
  const map = useMap()
  const markerLib = useMapsLibrary('marker')
  const clustererRef = useRef<InstanceType<typeof MarkerClusterer> | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])

  useEffect(() => {
    if (!map || !markerLib) return

    // Clean up previous markers
    markersRef.current.forEach((m) => (m.map = null))
    markersRef.current = []
    clustererRef.current?.clearMarkers()

    // Create markers imperatively
    const markers = colleges.map((c) => {
      const marker = new markerLib.AdvancedMarkerElement({
        position: { lat: c.lat, lng: c.lng },
        title: c.name,
        content: createPinElement(),
      })
      marker.addListener('gmp-click', () => onSelect(c))
      return marker
    })

    markersRef.current = markers

    // Create or update clusterer
    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        algorithm: new SuperClusterAlgorithm({ radius: 80 }),
      })
    } else {
      clustererRef.current.clearMarkers()
      clustererRef.current.addMarkers(markers)
    }

    return () => {
      clustererRef.current?.clearMarkers()
      markersRef.current.forEach((m) => (m.map = null))
      markersRef.current = []
    }
  }, [map, markerLib, colleges, onSelect])

  return null
}

/** React-rendered individual markers - used when clustering is off */
function UnclustteredMarkers({
  colleges,
  onSelect,
  hoveredId,
}: {
  colleges: College[]
  onSelect: (c: College) => void
  hoveredId: string | null
}) {
  return (
    <>
      {colleges.map((c) => (
        <AdvancedMarker
          key={c.id}
          position={{ lat: c.lat, lng: c.lng }}
          title={c.name}
          onClick={() => onSelect(c)}
          zIndex={hoveredId === c.id ? 1000 : undefined}
        >
          <div className={hoveredId === c.id ? 'marker-pin-active' : 'marker-pin'} />
        </AdvancedMarker>
      ))}
    </>
  )
}

function createPinElement(): HTMLElement {
  const div = document.createElement('div')
  div.className = 'marker-pin'
  return div
}

function ZoomToLocation({ location }: { location: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.panTo(location)
    map.setZoom(8)
  }, [map, location])
  return null
}

function ResetMap({ resetKey }: { resetKey?: number }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !resetKey) return
    map.panTo(DEFAULT_CENTER)
    map.setZoom(DEFAULT_ZOOM)
  }, [map, resetKey])
  return null
}
