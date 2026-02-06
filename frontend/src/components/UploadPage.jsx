import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import './UploadPage.css'

const API_URL = 'http://localhost:8000'

function UploadPage() {
  const { token, selectedInvestigationId } = useAuth()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Editable form data
  const [formData, setFormData] = useState({
    tracker_name: '',
    address: '',
    screenshot_date: '',
    location_type: 'unknown'
  })
  

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setOcrResult(null)
      setError(null)

      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(selectedFile))
    
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setOcrResult(null)
      setError(null)
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(URL.createObjectURL(droppedFile))
    }
  }
  

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file) return
  
    setUploading(true)
    setError(null)
    setUploadProgress(0)
  
    const formDataObj = new FormData()
    formDataObj.append('file', file)
  
    try {
      const response = await axios.post(`${API_URL}/api/upload/screenshot`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
  

      setOcrResult(response.data)
      
      // Pre-fill form with OCR results
      setFormData({
        tracker_name: response.data.ocr_result.tracker_name || '',
        address: response.data.ocr_result.address || '',
        screenshot_date: new Date().toISOString().slice(0, 16), // Default to now, user can change
        location_type: 'unknown'
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
      investigation_id: selectedInvestigationId,
      tracker_name: formData.tracker_name || "Unknown Tracker",
      platform: ocrResult.ocr_result.platform,
      address: formData.address || "",
      location_type: formData.location_type || 'unknown',
      screenshot_timestamp: formData.screenshot_date ? new Date(formData.screenshot_date).toISOString() : new Date().toISOString(),
      screenshot_path: ocrResult.file_path || null,
      ocr_raw_text: JSON.stringify(ocrResult.ocr_result)
    }
    

    try {
      const response = await axios.post(`${API_URL}/api/locations/from-ocr`, locationData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      toast.success(
        `Saved! Location #${response.data.id} • ${response.data.city || 'Unknown'}, ${response.data.state || ''}`,
        { duration: 4000 }
      )
      
      
      // Reset form
      setFile(null)
      setOcrResult(null)
      setFormData({
        tracker_name: '',
        address: '',
        screenshot_date: '',
        location_type: 'unknown'
      })
      
      setSaving(false)
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to save location'
      setError(errorMsg)
      toast.error(errorMsg)
      setSaving(false)
    }
    
  }

  return (
    <div className="upload-page">
      <h2>Upload Screenshot</h2>
      <p className="subtitle">Upload a Find My screenshot to extract location data</p>

      {/* File Upload Area */}
      <div 
        className={`upload-zone ${file ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {!file ? (
          <label htmlFor="file-upload" className="upload-label">
            <div className="upload-icon">📷</div>
            <p>Click to select or drag & drop a screenshot</p>
            <p className="hint">Supports Apple Find My and Google Find My Device</p>
          </label>
        ) : (
          <div className="file-preview">
  <img src={previewUrl} alt="Preview" className="preview-image" />
  <div className="file-info">
    <span className="file-name">📄 {file.name}</span>
    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
  </div>
  <button onClick={() => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }} className="remove-file">✕</button>
</div>

        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="progress-text">Processing... {uploadProgress}%</p>
        </div>
      )}

      {/* Upload Button */}
      {file && !ocrResult && (
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          className="btn-upload"
        >
          {uploading ? 'Processing...' : '🔍 Extract Data from Screenshot'}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {/* OCR Results - Editable Form */}
      {ocrResult && (
        <div className="ocr-results">
          <h3>📝 Review & Edit Extracted Data</h3>
          
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="tracker_name">Tracker Name *</label>
              <input
                id="tracker_name"
                name="tracker_name"
                type="text"
                value={formData.tracker_name}
                onChange={handleInputChange}
                placeholder="e.g., Sephora NYC 1"
              />
            </div>

            <div className="form-field">
              <label htmlFor="address">Address *</label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Full address"
              />
            </div>

            <div className="form-field">
              <label htmlFor="screenshot_date">Screenshot Date/Time *</label>
              <input
                id="screenshot_date"
                name="screenshot_date"
                type="datetime-local"
                value={formData.screenshot_date}
                onChange={handleInputChange}
              />
              <p className="field-hint">When was this screenshot taken?</p>
            </div>

            <div className="form-field">
              <label htmlFor="location_type">Location Type</label>
              <select
                id="location_type"
                name="location_type"
                value={formData.location_type}
                onChange={handleInputChange}
              >
                <option value="unknown">Unknown</option>
                <option value="starting_point">Starting Point</option>
                <option value="mrf">MRF (Material Recovery Facility)</option>
                <option value="landfill">Landfill</option>
                <option value="incinerator">Incinerator</option>
                <option value="recycling_center">Recycling Center</option>
                <option value="transfer_station">Transfer Station</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Platform info */}
          <div className="metadata">
            <span className="metadata-item">
              📱 Platform: <strong>{ocrResult.ocr_result.platform || 'Unknown'}</strong>
            </span>
            {ocrResult.ocr_result.confidence && (
              <span className="metadata-item">
                🎯 Confidence: <strong>{ocrResult.ocr_result.confidence}%</strong>
              </span>
            )}
          </div>

          {/* Save Button */}
          <div className="action-buttons">
            <button 
              onClick={handleSave} 
              disabled={saving || !formData.tracker_name || !formData.address}
              className="btn-save"
            >
              {saving ? '💾 Saving...' : '✅ Save Location'}
            </button>
            <button 
              onClick={() => {
                setFile(null)
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null) 
                }
                setOcrResult(null)
                setFormData({
                  tracker_name: '',
                  address: '',
                  screenshot_date: '',
                  location_type: 'unknown'
                })
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
