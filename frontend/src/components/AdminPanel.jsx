// File: frontend/src/components/AdminPanel.jsx (NEW FILE)

import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import './AdminPanel.css'

const API_URL = 'http://localhost:8000'

function AdminPanel() {
  const { token, fetchInvestigations } = useAuth()

  // State for investigations list
  const [investigations, setInvestigations] = useState([])
  const [loading, setLoading] = useState(true)

  // State for "Create Investigation" form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    brand: '',
    description: ''
  })
  const [creating, setCreating] = useState(false)

  // State for users list (for assignment dropdown)
  const [allUsers, setAllUsers] = useState([])

  // State for per-investigation assigned users
  const [assignedUsers, setAssignedUsers] = useState({}) // { investigationId: [users] }
  const [expandedInvestigation, setExpandedInvestigation] = useState(null)

  // State for assigning a user
  const [assigningTo, setAssigningTo] = useState(null) // investigation ID currently assigning to
  const [selectedUserId, setSelectedUserId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/investigations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      setInvestigations(invRes.data)
      setAllUsers(usersRes.data)
    } catch (err) {
      toast.error('Failed to load data: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvestigation = async (e) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await axios.post(`${API_URL}/api/investigations`, createForm, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      toast.success(`Investigation "${response.data.name}" created!`)
      setCreateForm({ name: '', brand: '', description: '' })
      setShowCreateForm(false)

      // Refresh investigations list in admin panel AND in the header selector
      loadData()
      fetchInvestigations()
    } catch (err) {
      toast.error('Failed to create: ' + (err.response?.data?.detail || err.message))
    } finally {
      setCreating(false)
    }
  }

  const loadAssignedUsers = async (investigationId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/investigations/${investigationId}/users`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      setAssignedUsers(prev => ({ ...prev, [investigationId]: response.data }))
    } catch (err) {
      console.error('Failed to load assigned users:', err)
    }
  }

  const handleExpandInvestigation = (investigationId) => {
    if (expandedInvestigation === investigationId) {
      setExpandedInvestigation(null)
    } else {
      setExpandedInvestigation(investigationId)
      loadAssignedUsers(investigationId)
    }
  }

  const handleAssignUser = async (investigationId) => {
    if (!selectedUserId) return

    try {
      await axios.post(
        `${API_URL}/api/investigations/${investigationId}/users`,
        { user_id: parseInt(selectedUserId) },
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      const assignedUser = allUsers.find(u => u.id === parseInt(selectedUserId))
      toast.success(`${assignedUser?.full_name || assignedUser?.email} assigned!`)

      setSelectedUserId('')
      setAssigningTo(null)
      loadAssignedUsers(investigationId)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign user')
    }
  }

  // Get users NOT already assigned to a specific investigation
  const getAvailableUsers = (investigationId) => {
    const assigned = assignedUsers[investigationId] || []
    const assignedIds = assigned.map(u => u.id)
    return allUsers.filter(u => !assignedIds.includes(u.id))
  }

  if (loading) {
    return <div className="admin-panel"><p>Loading...</p></div>
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button
          className="btn-create"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Investigation'}
        </button>
      </div>

      {/* Create Investigation Form */}
      {showCreateForm && (
        <form className="create-form" onSubmit={handleCreateInvestigation}>
          <h3>Create New Investigation</h3>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="brand">Brand *</label>
              <input
                id="brand"
                type="text"
                value={createForm.brand}
                onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })}
                placeholder="e.g., Starbucks, McDonald's"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="name">Investigation Name *</label>
              <input
                id="name"
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., NYC Cold Cups 2026"
                required
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Optional description of this investigation..."
              rows={3}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Investigation'}
          </button>
        </form>
      )}

      {/* Investigations List */}
      <div className="investigations-list">
        <h3>Investigations ({investigations.length})</h3>

        {investigations.map(inv => (
          <div key={inv.id} className="investigation-card">
            <div
              className="investigation-summary"
              onClick={() => handleExpandInvestigation(inv.id)}
            >
              <div className="inv-info">
                <h4>{inv.brand} — {inv.name}</h4>
                <span className={`status-badge ${inv.status}`}>{inv.status}</span>
              </div>
              <span className="expand-icon">
                {expandedInvestigation === inv.id ? '▼' : '▶'}
              </span>
            </div>

            {/* Expanded: show assigned users */}
            {expandedInvestigation === inv.id && (
              <div className="investigation-details">
                {inv.description && (
                  <p className="inv-description">{inv.description}</p>
                )}

                <div className="assigned-users-section">
                  <div className="section-header">
                    <h5>Assigned Users</h5>
                    <button
                      className="btn-assign"
                      onClick={() => setAssigningTo(assigningTo === inv.id ? null : inv.id)}
                    >
                      + Assign User
                    </button>
                  </div>

                  {/* Assign user form */}
                  {assigningTo === inv.id && (
                    <div className="assign-form">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      >
                        <option value="">Select a user...</option>
                        {getAvailableUsers(inv.id).map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email} ({user.role})
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-confirm-assign"
                        onClick={() => handleAssignUser(inv.id)}
                        disabled={!selectedUserId}
                      >
                        Assign
                      </button>
                    </div>
                  )}

                  {/* List of assigned users */}
                  <div className="users-list">
                    {(assignedUsers[inv.id] || []).length === 0 ? (
                      <p className="no-users">No users assigned yet</p>
                    ) : (
                      (assignedUsers[inv.id] || []).map(user => (
                        <div key={user.id} className="user-chip">
                          <span className="user-chip-name">{user.full_name || user.email}</span>
                          <span className={`user-chip-role ${user.role}`}>{user.role}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminPanel
