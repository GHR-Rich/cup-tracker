import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './App.css'
import Login from './components/Login'
import UploadPage from './components/UploadPage'
import InvestigationsList from './components/InvestigationsList'
import CampaignMap from './components/CampaignMap'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')
  const { user, logout, isAuthenticated, loading, isAdmin } = useAuth()

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
          {isAdmin() && (
            <button 
              onClick={() => setCurrentPage('campaign')}
              className={currentPage === 'campaign' ? 'active' : ''}
            >
              Campaign Map
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
        {currentPage === 'upload' && <UploadPage />}
        {currentPage === 'investigations' && <InvestigationsList />}
        {currentPage === 'campaign' && isAdmin() && <CampaignMap />}
      </main>
    </div>
  )
}

export default App
