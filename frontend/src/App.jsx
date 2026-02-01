import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import './App.css'
import UploadPage from './components/UploadPage'
import InvestigationsList from './components/InvestigationsList'

function App() {
  const [currentPage, setCurrentPage] = useState('upload')

  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4CAF50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
          },
        }}
      />
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
