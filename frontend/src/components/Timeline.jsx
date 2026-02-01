import { getDistance } from 'geolib'
import './Timeline.css'

function Timeline({ locations, tracker }) {
  // Sort by timestamp (oldest first)
  const sortedLocations = [...locations]
    .filter(loc => loc.screenshot_timestamp)
    .sort((a, b) => new Date(a.screenshot_timestamp) - new Date(b.screenshot_timestamp))

  if (sortedLocations.length === 0) {
    return (
      <div className="timeline-placeholder">
        <p>⏱️ No timestamped locations to display timeline</p>
        <p className="hint">Upload screenshots to see the chronological journey!</p>
      </div>
    )
  }

  // Calculate time gaps and distances
  const timelineItems = sortedLocations.map((location, index) => {
    const item = { location, index: index + 1 }

    // Calculate time gap from previous location
    if (index > 0) {
      const prevTimestamp = new Date(sortedLocations[index - 1].screenshot_timestamp)
      const currTimestamp = new Date(location.screenshot_timestamp)
      const diffMs = currTimestamp - prevTimestamp
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

      item.timeGap = { days: diffDays, hours: diffHours, minutes: diffMinutes, ms: diffMs }
    }

    // Calculate distance from previous location
    if (index > 0 && location.latitude && location.longitude) {
      const prevLoc = sortedLocations[index - 1]
      if (prevLoc.latitude && prevLoc.longitude) {
        const distanceMeters = getDistance(
          { latitude: parseFloat(prevLoc.latitude), longitude: parseFloat(prevLoc.longitude) },
          { latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) }
        )
        item.distance = (distanceMeters * 0.000621371).toFixed(2) // Convert to miles
      }
    }

    return item
  })

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>⏱️ Journey Timeline</h3>
        <p>{sortedLocations.length} timestamped location{sortedLocations.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="timeline">
        {timelineItems.map((item, idx) => (
          <div key={item.location.id} className="timeline-item">
            {/* Time Gap Indicator */}
            {item.timeGap && (
              <div className="time-gap">
                {item.timeGap.days > 0 && <span>{item.timeGap.days} day{item.timeGap.days > 1 ? 's' : ''}</span>}
                {item.timeGap.hours > 0 && <span>{item.timeGap.hours} hour{item.timeGap.hours > 1 ? 's' : ''}</span>}
                {item.timeGap.days === 0 && item.timeGap.hours === 0 && item.timeGap.minutes > 0 && (
                  <span>{item.timeGap.minutes} min</span>
                )}
                <span className="gap-label">later</span>
                {item.distance && <span className="distance-badge">↓ {item.distance} mi</span>}
              </div>
            )}

            {/* Timeline Event */}
            <div className="timeline-event">
              {/* Marker */}
              <div className="timeline-marker">
                <div className={`marker-dot ${idx === 0 ? 'start' : idx === timelineItems.length - 1 ? 'current' : ''}`}>
                  {item.index}
                </div>
                {idx < timelineItems.length - 1 && <div className="timeline-line"></div>}
              </div>

              {/* Content */}
              <div className="timeline-content">
                {/* Header with badges */}
                <div className="event-header">
                  <div className="event-badges">
                    {idx === 0 && <span className="badge start">🏁 Start</span>}
                    {idx === timelineItems.length - 1 && <span className="badge current">📍 Current</span>}
                    <span className="badge stop">Stop #{item.index}</span>
                  </div>
                  <div className="event-time">
                    {new Date(item.location.screenshot_timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Location Details */}
                <div className="event-body">
                  {/* Screenshot Thumbnail */}
                  {item.location.screenshots && item.location.screenshots.length > 0 && (
                    <div className="event-screenshot">
                      <img
                        src={`http://localhost:8000${item.location.screenshots[0].file_path}`}
                        alt="Location screenshot"
                        onClick={() => window.open(`http://localhost:8000${item.location.screenshots[0].file_path}`, '_blank')}
                      />
                    </div>
                  )}

                  {/* Address Info */}
                  <div className="event-details">
                    <p className="address">{item.location.address}</p>
                    {item.location.city && item.location.state && (
                      <p className="location-info">
                        📍 {item.location.city}, {item.location.state}
                      </p>
                    )}
                    {item.location.latitude && item.location.longitude && (
                      <p className="coordinates">
                        🌐 {parseFloat(item.location.latitude).toFixed(4)}, {parseFloat(item.location.longitude).toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Timeline
