import { useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import './EmojiPickerModal.css'

function EmojiPickerModal({ tracker, onClose, onSave }) {
  const [selectedEmoji, setSelectedEmoji] = useState(tracker.emoji || '')
  const [saving, setSaving] = useState(false)

  const onEmojiClick = (emojiObject) => {
    setSelectedEmoji(emojiObject.emoji)
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(tracker.id, selectedEmoji)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Choose Emoji for {tracker.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="emoji-preview">
            <span className="current-emoji">{selectedEmoji || '📍'}</span>
            <p>Current selection</p>
          </div>

          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width="100%"
            height="400px"
            searchPlaceholder="Search emojis (cat, frog, coffee...)"
            previewConfig={{ showPreview: false }}
          />
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Emoji'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmojiPickerModal
