import { useState, useEffect } from 'react'
import axios from 'axios'
import EmojiPickerModal from './EmojiPickerModal'
import TrackerMap from './TrackerMap'
import Timeline from './Timeline'
import { generateLocationCSV, downloadCSV } from '../utils/csvExport'
import './InvestigationsList.css'

const API_URL = 'http://localhost:8000'

function InvestigationsList() {
  const [trackers, setTrackers] = useState([])
  const [selectedTracker, setSelectedTracker] = useState(null)
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingEmoji, setEditingEmoji] = useState(null)

  // Fetch trackers on component mount
  useEffect(() => {
    fetchTrackers()
  }, [])

  const fetchTrackers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/trackers/investigation/4`)
      setTrackers(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load trackers: ' + err.message)
      console.error('Error fetching trackers:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async (trackerId) => {
    try {
      const response = await axios.get(`${API_URL}/api/locations/tracker/${trackerId}`)
      setLocations(response.data)
    } catch (err) {
      setError('Failed to load locations: ' + err.message)
      console.error('Error fetching locations:', err)
    }
  }

  const handleTrackerClick = (tracker) => {
    setSelectedTracker(tracker)
    fetchLocations(tracker.id)
  }

  const handleBackToList = () => {
    setSelectedTracker(null)
    setLocations([])
  }

  const handleEmojiEdit = (tracker, e) => {
    e.stopPropagation() // Prevent tracker card click
    setEditingEmoji(tracker)
  }

  const handleEmojiSave = async (trackerId, emoji) => {
    try {
      await axios.patch(`${API_URL}/api/trackers/${trackerId}`, { emoji })
      
      // Update local state
      setTrackers(trackers.map(t => 
        t.id === trackerId ? { ...t, emoji } : t
      ))
      
      // Update selected tracker if it's the one being edited
      if (selectedTracker && selectedTracker.id === trackerId) {
        setSelectedTracker({ ...selectedTracker, emoji })
      }
      
      setEditingEmoji(null)
    } catch (err) {
      console.error('Error saving emoji:', err)
      alert('Failed to save emoji: ' + err.message)
    }
  }

  const handleExportCSV = () => {
    const csvContent = generateLocationCSV(locations, selectedTracker)
    if (csvContent) {
      const filename = `${selectedTracker.name.replace(/[^a-z0-9]/gi, '_')}_locations_${new Date().toISOString().split('T')[0]}.csv`
      downloadCSV(csvContent, filename)
    }
  }  

  if (loading) {
    return <div className="loading">Loading trackers...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  // Show tracker detail view if one is selected
  if (selectedTracker) {
    return (
      <div className="investigations-container">
       <div className="detail-header">
  <div className="header-actions">
    <button onClick={handleBackToList} className="back-button">
      ← Back to Trackers
    </button>
    <button onClick={handleExportCSV} className="export-button">
      📥 Export to CSV
    </button>
  </div>

          <div className="tracker-title">
            <h2>
              <span 
                className="emoji-clickable" 
                onClick={(e) => handleEmojiEdit(selectedTracker, e)}
                title="Click to change emoji"
              >
                {selectedTracker.emoji || '📍'}
              </span>
              {' '}
              {selectedTracker.name}
            </h2>
            <p className="platform-badge">{selectedTracker.platform}</p>
          </div>
        </div>

        {/* MAP VIEW */}
        <TrackerMap locations={locations} tracker={selectedTracker} />

        {/* TIMELINE VIEW */}
        <Timeline locations={locations} tracker={selectedTracker} />

        {/* LOCATION TABLE */}
        <div className="locations-section">
          <h3>Location History ({locations.length} locations)</h3>
          {locations.length === 0 ? (
            <p className="no-data">No locations recorded yet</p>
          ) : (
            <table className="locations-table">
              <thead>
                <tr>
                  <th>Screenshot</th>
                  <th>Date/Time</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((location) => (
                  <tr key={location.id}>
                    <td>
                      {location.screenshots && location.screenshots.length > 0 ? (
                        <img 
                          src={`${API_URL}${location.screenshots[0].file_path}`}
                          alt="Screenshot"
                          className="location-screenshot"
                          onClick={() => window.open(`${API_URL}${location.screenshots[0].file_path}`, '_blank')}
                          title="Click to view full size"
                        />
                      ) : (
                        <span className="no-screenshot">No image</span>
                      )}
                    </td>
                    <td>
                      {location.screenshot_timestamp
                        ? new Date(location.screenshot_timestamp).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td>{location.address}</td>
                    <td>{location.city || '-'}</td>
                    <td>{location.state || '-'}</td>
                    <td className="coordinates">
                      {location.latitude && location.longitude
                        ? `${parseFloat(location.latitude).toFixed(4)}, ${parseFloat(location.longitude).toFixed(4)}`
                        : 'Not geocoded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editingEmoji && (
          <EmojiPickerModal
            tracker={editingEmoji}
            onClose={() => setEditingEmoji(null)}
            onSave={handleEmojiSave}
          />
        )}
      </div>
    )
  }

  // Show trackers list view
  return (
    <div className="investigations-container">
      <h2>Cup Trackers ({trackers.length})</h2>
      <p className="subtitle">Investigation: Starbucks Cold Cups Test</p>

      {trackers.length === 0 ? (
        <div className="no-data">
          <p>No trackers found. Upload a screenshot to get started!</p>
        </div>
      ) : (
        <div className="trackers-grid">
          {trackers.map((tracker) => (
            <div
              key={tracker.id}
              className="tracker-card"
              onClick={() => handleTrackerClick(tracker)}
            >
              <div 
                className="tracker-emoji emoji-clickable" 
                onClick={(e) => handleEmojiEdit(tracker, e)}
                title="Click to change emoji"
              >
                {tracker.emoji || '📍'}
              </div>
              <div className="tracker-info">
                <h3>{tracker.name}</h3>
                <span className="platform-badge">{tracker.platform}</span>
                <p className="tracker-type">{tracker.tracker_type || 'airtag'}</p>
              </div>
              <div className="tracker-arrow">→</div>
            </div>
          ))}
        </div>
      )}

      {editingEmoji && (
        <EmojiPickerModal
          tracker={editingEmoji}
          onClose={() => setEditingEmoji(null)}
          onSave={handleEmojiSave}
        />
      )}
    </div>
  )
}

export default InvestigationsList

