import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { getDistance } from 'geolib'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './TrackerMap.css'

// Component to auto-fit map bounds to show all markers
function FitBounds({ locations }) {
  const map = useMap()
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(loc => [
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      ])
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [locations, map])
  
  return null
}

// Create numbered marker icons with color coding
function createNumberedIcon(number, total) {
  // Color gradient from blue (old) to red (new)
  const ratio = (number - 1) / Math.max(total - 1, 1)
  const hue = (1 - ratio) * 240 // 240 (blue) to 0 (red)
  const color = `hsl(${hue}, 70%, 50%)`
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 35px;
      height: 35px;
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      color: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [35, 35],
    iconAnchor: [17, 17]
  })
}

// Calculate journey statistics
function calculateJourneyStats(locations) {
  if (locations.length < 2) {
    return {
      totalDistance: 0,
      averageDistance: 0,
      timeSpan: null,
      segments: []
    }
  }

  let totalDistance = 0
  const segments = []

  for (let i = 0; i < locations.length - 1; i++) {
    const from = locations[i]
    const to = locations[i + 1]
    
    const distance = getDistance(
      { latitude: parseFloat(from.latitude), longitude: parseFloat(from.longitude) },
      { latitude: parseFloat(to.latitude), longitude: parseFloat(to.longitude) }
    )
    
    totalDistance += distance
    segments.push({
      from: from.address,
      to: to.address,
      distance: distance,
      distanceMiles: (distance * 0.000621371).toFixed(2)
    })
  }

  // Calculate time span
  const timestamps = locations
    .map(loc => loc.screenshot_timestamp)
    .filter(ts => ts)
    .map(ts => new Date(ts))
    .sort((a, b) => a - b)

  let timeSpan = null
  if (timestamps.length >= 2) {
    const earliest = timestamps[0]
    const latest = timestamps[timestamps.length - 1]
    const diffMs = latest - earliest
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    timeSpan = { days: diffDays, hours: diffHours, earliest, latest }
  }

  return {
    totalDistance,
    totalDistanceMiles: (totalDistance * 0.000621371).toFixed(2),
    averageDistance: totalDistance / segments.length,
    averageDistanceMiles: ((totalDistance / segments.length) * 0.000621371).toFixed(2),
    timeSpan,
    segments
  }
}

function TrackerMap({ locations, tracker }) {
  // Filter locations that have coordinates and sort by timestamp (oldest first)
  const validLocations = locations
    .filter(loc => loc.latitude && loc.longitude)
    .sort((a, b) => {
      if (!a.screenshot_timestamp) return 1
      if (!b.screenshot_timestamp) return -1
      return new Date(a.screenshot_timestamp) - new Date(b.screenshot_timestamp)
    })

  if (validLocations.length === 0) {
    return (
      <div className="map-placeholder">
        <p>📍 No geocoded locations to display on map yet</p>
        <p className="hint">Upload screenshots with addresses to see the tracker's journey!</p>
      </div>
    )
  }

  // Calculate statistics
  const stats = calculateJourneyStats(validLocations)

  // Get center point (use first location)
  const center = [
    parseFloat(validLocations[0].latitude),
    parseFloat(validLocations[0].longitude)
  ]

  // Prepare path coordinates for the polyline
  const pathCoordinates = validLocations.map(loc => [
    parseFloat(loc.latitude),
    parseFloat(loc.longitude)
  ])

  return (
    <div className="map-container">
      <div className="map-header">
        <div className="map-title">
          <h3>🗺️ Tracker Journey Map</h3>
          <p>{validLocations.length} location{validLocations.length !== 1 ? 's' : ''} plotted</p>
        </div>
        
        {/* Journey Statistics */}
        <div className="journey-stats">
          <div className="stat">
            <span className="stat-label">Total Distance</span>
            <span className="stat-value">{stats.totalDistanceMiles} mi</span>
          </div>
          {validLocations.length > 1 && (
            <div className="stat">
              <span className="stat-label">Avg Segment</span>
              <span className="stat-value">{stats.averageDistanceMiles} mi</span>
            </div>
          )}
          {stats.timeSpan && (
            <div className="stat">
              <span className="stat-label">Time Span</span>
              <span className="stat-value">
                {stats.timeSpan.days > 0 ? `${stats.timeSpan.days}d ` : ''}
                {stats.timeSpan.hours}h
              </span>
            </div>
          )}
          <div className="stat">
            <span className="stat-label">Stops</span>
            <span className="stat-value">{validLocations.length}</span>
          </div>
        </div>
      </div>
      
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Auto-fit bounds to show all markers */}
        <FitBounds locations={validLocations} />
        
        {/* Draw path connecting all points */}
        {validLocations.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            color="#4CAF50"
            weight={3}
            opacity={0.7}
            dashArray="10, 5"
          />
        )}
        
        {/* Add numbered markers for each location */}
        {validLocations.map((location, index) => {
          const locationNumber = index + 1
          
          return (
            <Marker
              key={location.id}
              position={[parseFloat(location.latitude), parseFloat(location.longitude)]}
              icon={createNumberedIcon(locationNumber, validLocations.length)}
            >
              <Popup>
                <div className="marker-popup">
                  <div className="popup-header">
                    <strong>{tracker.emoji || '📍'} {tracker.name}</strong>
                    <span className="location-badge">
                      {locationNumber === 1 ? '🏁 Start' : 
                       locationNumber === validLocations.length ? '📍 Current' :
                       `Stop #${locationNumber}`}
                    </span>
                  </div>
                  
                  <p><strong>Address:</strong><br />{location.address}</p>
                  
                  {location.city && location.state && (
                    <p><strong>Location:</strong> {location.city}, {location.state}</p>
                  )}
                  
                  {location.screenshot_timestamp && (
                    <p><strong>Timestamp:</strong><br />
                      {new Date(location.screenshot_timestamp).toLocaleString()}
                    </p>
                  )}
                  
                  {/* Show distance to next location */}
                  {index < validLocations.length - 1 && stats.segments[index] && (
                    <p className="distance-info">
                      <strong>→ Next stop:</strong> {stats.segments[index].distanceMiles} mi
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'hsl(240, 70%, 50%)' }}></div>
          <span>Oldest</span>
        </div>
        <div className="legend-gradient"></div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'hsl(0, 70%, 50%)' }}></div>
          <span>Newest</span>
        </div>
      </div>
    </div>
  )
}

export default TrackerMap
