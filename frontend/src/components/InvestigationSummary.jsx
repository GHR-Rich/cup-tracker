// File: frontend/src/components/InvestigationSummary.jsx (NEW FILE)

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import './InvestigationSummary.css'

const API_URL = 'http://localhost:8000'

const TYPE_CONFIG = {
  landfill: { label: 'Landfill', icon: '🗑️', color: '#c62828' },
  mrf: { label: 'MRF (Recycling)', icon: '♻️', color: '#2e7d32' },
  incinerator: { label: 'Incinerator', icon: '🔥', color: '#e65100' },
  waste_transfer_station: { label: 'Transfer Station', icon: '🚛', color: '#6a1b9a' },
  starting_point: { label: 'Starting Point', icon: '📍', color: '#1565c0' },
  transit: { label: 'In Transit', icon: '🚚', color: '#f57f17' },
  unknown: { label: 'Unknown', icon: '❓', color: '#666' },
}

function InvestigationSummary() {
  const { token, selectedInvestigationId, selectedInvestigation } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (selectedInvestigationId) {
      fetchSummary()
    }
  }, [selectedInvestigationId])

  const fetchSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(
        `${API_URL}/api/investigations/${selectedInvestigationId}/summary`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      setSummary(response.data)
    } catch (err) {
      setError('Failed to load summary: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/investigations/${selectedInvestigationId}/export/csv`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${selectedInvestigation?.brand || 'investigation'}_export.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('CSV exported!')
    } catch (err) {
      toast.error('Export failed: ' + (err.response?.data?.detail || err.message))
    }
  }

  if (loading) {
    return <div className="summary-container"><p>Loading summary...</p></div>
  }

  if (error) {
    return <div className="summary-container"><p className="error-text">{error}</p></div>
  }

  if (!summary) return null

  const { investigation, total_trackers, total_locations, destination_breakdown, state_breakdown, trackers } = summary

  // Sort destination breakdown by count descending
  const sortedDestinations = Object.entries(destination_breakdown)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="summary-container">
      <div className="summary-header">
        <div>
          <h2>Investigation Summary</h2>
          <p className="summary-subtitle">
            {investigation.brand} — {investigation.name}
          </p>
        </div>
        <button className="btn-export-csv" onClick={handleExportCSV}>
          📥 Export Full CSV
        </button>
      </div>

      {/* Overview Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-number">{total_trackers}</span>
          <span className="stat-label">Total Trackers</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{total_locations}</span>
          <span className="stat-label">Total Locations</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{state_breakdown.length}</span>
          <span className="stat-label">States Reached</span>
        </div>
      </div>

      {/* Destination Breakdown */}
      <div className="destination-section">
        <h3>Final Destination Breakdown</h3>
        <p className="section-hint">Where did the cups end up?</p>

        {sortedDestinations.length === 0 ? (
          <p className="no-data-text">No final destinations classified yet. Classify locations in the View Data tab first.</p>
        ) : (
          <div className="destination-bars">
            {sortedDestinations.map(([type, count]) => {
              const config = TYPE_CONFIG[type] || TYPE_CONFIG.unknown
              const percentage = total_trackers > 0 ? Math.round((count / total_trackers) * 100) : 0

              return (
                <div key={type} className="destination-row">
                  <div className="dest-label">
                    <span className="dest-icon">{config.icon}</span>
                    <span className="dest-name">{config.label}</span>
                    <span className="dest-count">{count} tracker{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="dest-bar-bg">
                    <div
                      className="dest-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: config.color
                      }}
                    />
                  </div>
                  <span className="dest-percentage">{percentage}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* State Breakdown */}
      {state_breakdown.length > 0 && (
        <div className="state-section">
          <h3>States Reached</h3>
          <div className="state-chips">
            {state_breakdown.map(({ state, tracker_count }) => (
              <div key={state} className="state-chip">
                <span className="state-name">{state}</span>
                <span className="state-count">{tracker_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tracker Details Table */}
      <div className="tracker-summary-section">
        <h3>Tracker Final Destinations</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Tracker</th>
              <th>Locations</th>
              <th>Final Destination</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {trackers.map(tracker => {
              const dest = tracker.final_destination
              const typeConfig = dest ? (TYPE_CONFIG[dest.location_type] || TYPE_CONFIG.unknown) : TYPE_CONFIG.unknown

              return (
                <tr key={tracker.id}>
                  <td>
                    <span className="tracker-name-cell">
                      {tracker.emoji || '📍'} {tracker.name}
                    </span>
                  </td>
                  <td>{tracker.location_count}</td>
                  <td>
                    {dest ? (
                      <span>{dest.address ? `${dest.city || ''}, ${dest.state || ''}` : 'No address'}</span>
                    ) : (
                      <span className="no-dest">No locations yet</span>
                    )}
                  </td>
                  <td>
                    {dest ? (
                      <span
                        className="type-pill"
                        style={{ backgroundColor: typeConfig.color + '20', color: typeConfig.color }}
                      >
                        {typeConfig.icon} {typeConfig.label}
                      </span>
                    ) : (
                      <span className="no-dest">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InvestigationSummary
