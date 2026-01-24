import { useState } from 'react'
import './App.css'
import UploadPage from './components/UploadPage'
import InvestigationsList from './components/InvestigationsList'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')

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
        </nav>
      </header>

      <main className="app-main">
        {currentPage === 'upload' && <UploadPage />}
        {currentPage === 'investigations' && <InvestigationsList />}
      </main>
    </div>
  )
}

export default App
