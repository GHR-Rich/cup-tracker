import { useState } from 'react'
import axios from 'axios'
import './UploadPage.css'

const API_URL = 'http://localhost:8000'

function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setOcrResult(null)
      setError(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setOcrResult(null)
      setError(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_URL}/api/upload/screenshot`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setOcrResult(response.data)
      setUploading(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!ocrResult) return
  
    // Extract data from OCR result
    const { tracker_name, address, last_seen, platform } = ocrResult.ocr_result
  
    // Prepare data for saving
    const locationData = {
      investigation_id: 4,
      tracker_name: tracker_name || "Unknown Tracker",
      platform: platform,
      address: address || "",
      last_seen_text: last_seen,
      screenshot_timestamp: new Date().toISOString()
    }
  
    try {
      const response = await axios.post(`${API_URL}/api/locations/from-ocr`, locationData)
      
      alert(`✅ Saved successfully! Location ID: ${response.data.id}`)
      
      // Reset form
      setFile(null)
      setOcrResult(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save data')
    }
  }
  

  return (
    <div className="upload-page">
      <h2>Upload Screenshot</h2>
      <p className="subtitle">Upload a Find My screenshot to extract location data</p>

      <div 
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {file ? (
          <div className="file-preview">
            <img src={URL.createObjectURL(file)} alt="Preview" />
            <p>{file.name}</p>
            <button onClick={() => setFile(null)} className="btn-secondary">
              Remove
            </button>
          </div>
        ) : (
          <div className="dropzone-empty">
            <p>📷 Drag & drop screenshot here</p>
            <p>or</p>
            <label className="file-input-label">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              Choose File
            </label>
          </div>
        )}
      </div>

      {file && !ocrResult && (
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          className="btn-primary"
        >
          {uploading ? '⏳ Processing...' : '🔍 Extract Data'}
        </button>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {ocrResult && (
        <div className="ocr-results">
          <h3>Extracted Data</h3>
          <div className="result-card">
            <div className="result-row">
              <strong>Platform:</strong>
              <span>{ocrResult.ocr_result.platform}</span>
            </div>
            <div className="result-row">
              <strong>Tracker Name:</strong>
              <span>{ocrResult.ocr_result.tracker_name || 'Not found'}</span>
            </div>
            <div className="result-row">
              <strong>Address:</strong>
              <span>{ocrResult.ocr_result.address || 'Not found'}</span>
            </div>
            <div className="result-row">
              <strong>Last Seen:</strong>
              <span>{ocrResult.ocr_result.last_seen || 'Not found'}</span>
            </div>
            <div className="result-row">
              <strong>Confidence:</strong>
              <span>{ocrResult.ocr_result.confidence}%</span>
            </div>
          </div>

          <div className="button-group">
            <button onClick={handleSave} className="btn-primary">
              ✅ Save to Database
            </button>
            <button onClick={() => {
              setFile(null)
              setOcrResult(null)
            }} className="btn-secondary">
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
