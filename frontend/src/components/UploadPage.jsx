import { useState } from 'react'
import axios from 'axios'
import './UploadPage.css'

const API_URL = 'http://localhost:8000'

function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Editable form data
  const [formData, setFormData] = useState({
    tracker_name: '',
    address: '',
    last_seen_text: '',
    city: '',
    state: '',
    postal_code: ''
  })

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

    const formDataObj = new FormData()
    formDataObj.append('file', file)

    try {
      const response = await axios.post(`${API_URL}/api/upload/screenshot`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setOcrResult(response.data)
      
      // Pre-fill form with OCR results
      setFormData({
        tracker_name: response.data.ocr_result.tracker_name || '',
        address: response.data.ocr_result.address || '',
        last_seen_text: response.data.ocr_result.last_seen || '',
        city: '',
        state: '',
        postal_code: ''
      })
      
      setUploading(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
      setUploading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSave = async () => {
    if (!ocrResult) return

    setSaving(true)
    setError(null)

    // Prepare data for saving
    const locationData = {
      investigation_id: 4,
      tracker_name: formData.tracker_name || "Unknown Tracker",
      platform: ocrResult.ocr_result.platform,
      address: formData.address || "",
      last_seen_text: formData.last_seen_text,
      city: formData.city || null,
      state: formData.state || null,
      postal_code: formData.postal_code || null,
      screenshot_timestamp: new Date().toISOString(),
      screenshot_path: ocrResult.file_path || null,
      ocr_raw_text: JSON.stringify(ocrResult.ocr_result)
    }

    try {
      const response = await axios.post(`${API_URL}/api/locations/from-ocr`, locationData)
      
      alert(`✅ Saved successfully!\n\nLocation ID: ${response.data.id}\nTracker: ${response.data.tracker_id}\nCoordinates: ${response.data.latitude}, ${response.data.longitude}\n\n✅ Screenshot saved and can be deleted from phone!`)
      
      // Reset form
      setFile(null)
      setOcrResult(null)
      setFormData({
        tracker_name: '',
        address: '',
        last_seen_text: '',
        city: '',
        state: '',
        postal_code: ''
      })
      setSaving(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save data')
      setSaving(false)
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
          <h3>Review & Edit Extracted Data</h3>
          <p className="edit-hint">✏️ Edit any fields before saving (especially tracker name)</p>
          
          <div className="result-card">
            <div className="info-row">
              <strong>Platform:</strong>
              <span className="platform-badge">{ocrResult.ocr_result.platform}</span>
            </div>
            <div className="info-row">
              <strong>OCR Confidence:</strong>
              <span>{ocrResult.ocr_result.confidence}%</span>
            </div>
          </div>

          <form className="edit-form">
            <div className="form-group">
              <label htmlFor="tracker_name">
                Tracker Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="tracker_name"
                name="tracker_name"
                value={formData.tracker_name}
                onChange={handleInputChange}
                placeholder="e.g., Sephora NYC 1"
                required
              />
              <small className="field-hint">Fix emoji/OCR errors in tracker name</small>
            </div>

            <div className="form-group">
              <label htmlFor="address">
                Address <span className="required">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Full address (city/state/zip auto-filled from geocoding)"
                rows="3"
                required
              />
              <small className="field-hint">City, state, and zip will be auto-populated after save</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City (optional)</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Auto-filled if left blank"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State (optional)</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Auto-filled if left blank"
                  maxLength="2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postal_code">Zip Code (optional)</label>
                <input
                  type="text"
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                  placeholder="Auto-filled if left blank"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="last_seen_text">Last Seen</label>
              <input
                type="text"
                id="last_seen_text"
                name="last_seen_text"
                value={formData.last_seen_text}
                onChange={handleInputChange}
                placeholder="e.g., 16 minutes ago"
              />
            </div>
          </form>

          <div className="button-group">
            <button 
              onClick={handleSave} 
              className="btn-primary"
              disabled={saving || !formData.tracker_name || !formData.address}
            >
              {saving ? '💾 Saving...' : '✅ Save to Database'}
            </button>
            <button onClick={() => {
              setFile(null)
              setOcrResult(null)
              setFormData({
                tracker_name: '',
                address: '',
                last_seen_text: '',
                city: '',
                state: '',
                postal_code: ''
              })
            }} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
