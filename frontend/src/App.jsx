// File: frontend/src/App.jsx (FULL REPLACEMENT)

import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './App.css'
import Login from './components/Login'
import UploadPage from './components/UploadPage'
import InvestigationsList from './components/InvestigationsList'
import CampaignMap from './components/CampaignMap'
import InvestigationSelector from './components/InvestigationSelector'
import AdminPanel from './components/AdminPanel'
import InvestigationSummary from './components/InvestigationSummary'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')
  const { user, logout, isAuthenticated, loading, isAdmin, selectedInvestigationId } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🥤 Cup Tracker</h1>
        <InvestigationSelector />
        <nav>
          <button 
            onClick={() => setCurrentPage('upload')}
            className={currentPage === 'upload' ? 'active' : ''}
          >
            Upload Screenshot
          </button>
          <button 
            onClick={() => setCurrentPage('investigations')}
            className={currentPage === 'investigations' ? 'active' : ''}
          >
            View Data
          </button>
          <button 
            onClick={() => setCurrentPage('summary')}
            className={currentPage === 'summary' ? 'active' : ''}
          >
            Summary
          </button>
          {isAdmin() && (
            <button 
              onClick={() => setCurrentPage('campaign')}
              className={currentPage === 'campaign' ? 'active' : ''}
            >
              Campaign Map
            </button>
          )}
          {isAdmin() && (
            <button 
              onClick={() => setCurrentPage('admin')}
              className={currentPage === 'admin' ? 'active' : ''}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="user-info">
          <span className="user-name">{user?.full_name || user?.email}</span>
          <span className="user-role">{user?.role}</span>
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </header>

      <main>
        {!selectedInvestigationId ? (
          <div className="no-investigation-selected">
            <h2>No Investigation Selected</h2>
            <p>Select an investigation from the dropdown above to get started.</p>
          </div>
        ) : (
          <>
            {currentPage === 'upload' && <UploadPage />}
            {currentPage === 'investigations' && <InvestigationsList />}
            {currentPage === 'summary' && <InvestigationSummary />}
            {currentPage === 'campaign' && isAdmin() && <CampaignMap />}
            {currentPage === 'admin' && isAdmin() && <AdminPanel />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
