import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { getDistance } from 'geolib'
import L from 'leaflet'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import 'leaflet/dist/leaflet.css'
import './CampaignMap.css'

// Component to auto-fit map bounds
function FitBounds({ allLocations }) {
  const map = useMap()

  useEffect(() => {
    if (allLocations.length > 0) {
      const bounds = allLocations.map(loc => [
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      ])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [allLocations, map])

  return null
}

// Color palette for different trackers
const TRACKER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#A8E6CF', // Light Green
  '#FF8B94', // Pink
  '#C7CEEA', // Lavender
  '#FFDAC1', // Peach
  '#B4F8C8', // Pastel Green
  '#FBE7C6', // Cream
]

// Create custom marker icon with tracker color and emoji
function createTrackerIcon(emoji, color, size = 35) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

function CampaignMap() {
  const [trackers, setTrackers] = useState([])
  const [allLocations, setAllLocations] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleTrackers, setVisibleTrackers] = useState({})
  const [selectedUser, setSelectedUser] = useState('all')
  const { token } = useAuth()

  useEffect(() => {
    fetchCampaignData()
  }, [selectedUser])

  const fetchCampaignData = async () => {
    setLoading(true)
    try {
      // Fetch all investigations (assuming investigation_id = 1 for now)
      // TODO: Make this dynamic to fetch all investigations
      const trackersResponse = await fetch(
        'http://localhost:8000/api/trackers/investigation/1',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!trackersResponse.ok) throw new Error('Failed to fetch trackers')

      const trackersData = await trackersResponse.json()
      setTrackers(trackersData)

      // Initialize all trackers as visible
      const visibility = {}
      trackersData.forEach(tracker => {
        visibility[tracker.id] = true
      })
      setVisibleTrackers(visibility)

      // Fetch locations for all trackers
      const locationsPromises = trackersData.map(tracker =>
        fetch(`http://localhost:8000/api/locations/tracker/${tracker.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then(res => res.json()).then(locations =>
          locations.map(loc => ({ ...loc, tracker }))
        )
      )

      const locationsArrays = await Promise.all(locationsPromises)
      let allLocs = locationsArrays.flat()

      // Filter by user if selected
      if (selectedUser !== 'all') {
        allLocs = allLocs.filter(loc => loc.uploaded_by === parseInt(selectedUser))
      }

      // Extract unique users for filter
      const uniqueUsers = [...new Set(allLocs.map(loc => loc.uploaded_by))]
      setUsers(uniqueUsers)

      setAllLocations(allLocs)
    } catch (error) {
      console.error('Error fetching campaign data:', error)
      toast.error('Failed to load campaign data')
    } finally {
      setLoading(false)
    }
  }

  const toggleTrackerVisibility = (trackerId) => {
    setVisibleTrackers(prev => ({
      ...prev,
      [trackerId]: !prev[trackerId]
    }))
  }

  // Filter locations to only show visible trackers and valid coordinates
  const displayedLocations = allLocations.filter(
    loc => loc.latitude && loc.longitude && visibleTrackers[loc.tracker.id]
  )

  // Calculate campaign-wide statistics
  const calculateCampaignStats = () => {
    const visibleLocs = displayedLocations
    if (visibleLocs.length === 0) return null

    let totalDistance = 0
    const trackerDistances = {}

    trackers.forEach(tracker => {
      if (!visibleTrackers[tracker.id]) return

      const trackerLocs = visibleLocs
        .filter(loc => loc.tracker.id === tracker.id)
        .sort((a, b) => new Date(a.screenshot_timestamp) - new Date(b.screenshot_timestamp))

      let trackerDist = 0
      for (let i = 0; i < trackerLocs.length - 1; i++) {
        const dist = getDistance(
          { latitude: parseFloat(trackerLocs[i].latitude), longitude: parseFloat(trackerLocs[i].longitude) },
          { latitude: parseFloat(trackerLocs[i + 1].latitude), longitude: parseFloat(trackerLocs[i + 1].longitude) }
        )
        trackerDist += dist
      }

      trackerDistances[tracker.id] = trackerDist
      totalDistance += trackerDist
    })

    const furthestTracker = Object.entries(trackerDistances).reduce(
      (max, [id, dist]) => (dist > max.distance ? { id: parseInt(id), distance: dist } : max),
      { id: null, distance: 0 }
    )

    return {
      totalDistance: (totalDistance * 0.000621371).toFixed(2),
      activeTrackers: Object.values(visibleTrackers).filter(v => v).length,
      totalLocations: visibleLocs.length,
      furthestTracker: furthestTracker.id
        ? trackers.find(t => t.id === furthestTracker.id)
        : null,
      furthestDistance: (furthestTracker.distance * 0.000621371).toFixed(2)
    }
  }

  const stats = calculateCampaignStats()

  if (loading) {
    return <div className="loading">Loading campaign data...</div>
  }

  if (displayedLocations.length === 0) {
    return (
      <div className="map-placeholder">
        <h2>🗺️ Campaign Map</h2>
        <p>No locations to display. Try adjusting your filters or upload some tracker data!</p>
      </div>
    )
  }

  const center = [
    parseFloat(displayedLocations[0].latitude),
    parseFloat(displayedLocations[0].longitude)
  ]

  return (
    <div className="campaign-map-container">
      <div className="campaign-header">
        <div>
          <h2>🗺️ Campaign Overview Map</h2>
          <p className="subtitle">All trackers across the investigation</p>
        </div>

        {/* User Filter */}
        <div className="filter-controls">
          <label htmlFor="userFilter">Filter by User:</label>
          <select
            id="userFilter"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">All Users</option>
            {users.map(userId => (
              <option key={userId} value={userId}>User {userId}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Campaign Statistics */}
      {stats && (
        <div className="campaign-stats">
          <div className="stat-card">
            <span className="stat-label">Total Distance</span>
            <span className="stat-value">{stats.totalDistance} mi</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Active Trackers</span>
            <span className="stat-value">{stats.activeTrackers}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Locations</span>
            <span className="stat-value">{stats.totalLocations}</span>
          </div>
          {stats.furthestTracker && (
            <div className="stat-card">
              <span className="stat-label">Furthest Traveler</span>
              <span className="stat-value">
                {stats.furthestTracker.emoji} {stats.furthestTracker.name} ({stats.furthestDistance} mi)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="map-and-legend">
        {/* Tracker Legend with Toggle */}
        <div className="tracker-legend">
          <h3>Trackers</h3>
          <p className="legend-hint">Click to show/hide</p>
          {trackers.map((tracker, index) => {
            const color = TRACKER_COLORS[index % TRACKER_COLORS.length]
            const trackerLocs = allLocations.filter(loc => loc.tracker.id === tracker.id)
            const isVisible = visibleTrackers[tracker.id]

            return (
              <div
                key={tracker.id}
                className={`legend-tracker ${isVisible ? 'visible' : 'hidden'}`}
                onClick={() => toggleTrackerVisibility(tracker.id)}
              >
                <div
                  className="legend-marker"
                  style={{ backgroundColor: color }}
                >
                  {tracker.emoji || '📍'}
                </div>
                <div className="legend-info">
                  <span className="tracker-name">{tracker.name}</span>
                  <span className="tracker-count">{trackerLocs.length} locations</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Map */}
        <div className="map-wrapper">
          <MapContainer
            center={center}
            zoom={10}
            scrollWheelZoom={true}
            style={{ height: '600px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds allLocations={displayedLocations} />

            {/* Draw paths for each tracker */}
            {trackers.map((tracker, index) => {
              if (!visibleTrackers[tracker.id]) return null

              const trackerLocs = displayedLocations
                .filter(loc => loc.tracker.id === tracker.id)
                .sort((a, b) => new Date(a.screenshot_timestamp) - new Date(b.screenshot_timestamp))

              if (trackerLocs.length < 2) return null

              const pathCoords = trackerLocs.map(loc => [
                parseFloat(loc.latitude),
                parseFloat(loc.longitude)
              ])

              const color = TRACKER_COLORS[index % TRACKER_COLORS.length]

              return (
                <Polyline
                  key={tracker.id}
                  positions={pathCoords}
                  color={color}
                  weight={3}
                  opacity={0.7}
                  dashArray="10, 5"
                />
              )
            })}

            {/* Add markers for each location */}
            {displayedLocations.map((location) => {
              const trackerIndex = trackers.findIndex(t => t.id === location.tracker.id)
              const color = TRACKER_COLORS[trackerIndex % TRACKER_COLORS.length]
              const emoji = location.tracker.emoji || '📍'

              return (
                <Marker
                  key={`${location.tracker.id}-${location.id}`}
                  position={[parseFloat(location.latitude), parseFloat(location.longitude)]}
                  icon={createTrackerIcon(emoji, color)}
                >
                  <Popup>
                    <div className="marker-popup">
                      <div className="popup-header">
                        <strong>{emoji} {location.tracker.name}</strong>
                      </div>

                      <p><strong>Address:</strong><br />{location.address}</p>

                      {location.city && location.state && (
                        <p><strong>Location:</strong> {location.city}, {location.state}</p>
                      )}

                      {location.location_type && (
                        <p><strong>Type:</strong> {location.location_type}</p>
                      )}

                      {location.screenshot_timestamp && (
                        <p><strong>Timestamp:</strong><br />
                          {new Date(location.screenshot_timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

export default CampaignMap
