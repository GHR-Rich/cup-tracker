import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import './UploadPage.css'

const API_URL = 'http://localhost:8000'

function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
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
    setUploadProgress(0)
  
    const formDataObj = new FormData()
    formDataObj.append('file', file)
  
    try {
      const response = await axios.post(`${API_URL}/api/upload/screenshot`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
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
      investigation_id: 4,
      tracker_name: formData.tracker_name || "Unknown Tracker",
      platform: ocrResult.ocr_result.platform,
      address: formData.address || "",
      location_type: formData.location_type || 'unknown',
      screenshot_timestamp: formData.screenshot_date ? new Date(formData.screenshot_date).toISOString() : new Date().toISOString(),
      screenshot_path: ocrResult.file_path || null,
      ocr_raw_text: JSON.stringify(ocrResult.ocr_result)
    }
    

    try {
      const response = await axios.post(`${API_URL}/api/locations/from-ocr`, locationData)
      
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
  <>
    <button 
      onClick={handleUpload} 
      disabled={uploading}
      className="btn-primary"
    >
      {uploading ? '⏳ Processing OCR...' : '🔍 Extract Data'}
    </button>
    
    {uploading && uploadProgress > 0 && (
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
        <span className="progress-text">{uploadProgress}%</span>
      </div>
    )}
  </>
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

  <div className="form-group">
    <label htmlFor="screenshot_date">
      Screenshot Date & Time <span className="required">*</span>
    </label>
    <input
      type="datetime-local"
      id="screenshot_date"
      name="screenshot_date"
      value={formData.screenshot_date}
      onChange={handleInputChange}
      required
    />
    <small className="field-hint">When was this screenshot actually taken? (Not when you're uploading it)</small>
  </div>

  <div className="form-group">
    <label htmlFor="location_type">
      Location Type
    </label>
    <select
      id="location_type"
      name="location_type"
      value={formData.location_type}
      onChange={handleInputChange}
    >
      <option value="unknown">Unknown/Other</option>
      <option value="starting_point">Starting Point (Recycling Bin)</option>
      <option value="in_transit">In Transit</option>
      <option value="waste_transfer_station">Waste Transfer Station</option>
      <option value="mrf">MRF (Material Recovery Facility)</option>
      <option value="incinerator">Incinerator</option>
      <option value="landfill">Landfill</option>
    </select>
    <small className="field-hint">Classify this location in the cup's journey</small>
  </div>
</form>


          <div className="button-group">
          <button 
  onClick={handleSave} 
  className="btn-primary"
  disabled={saving || !formData.tracker_name || !formData.address}
>
  {saving ? '💾 Saving & Geocoding...' : '✅ Save to Database'}
</button>
{saving && (
  <div className="saving-indicator">
    <div className="spinner-small"></div>
    <span>Geocoding address and saving location...</span>
  </div>
)}

            <button onClick={() => {
              setFile(null)
              setOcrResult(null)
              setFormData({
                tracker_name: '',
                address: '',
                screenshot_date: '',
                location_type: 'unknown'
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
