import { useAuth } from '../contexts/AuthContext'
import './InvestigationSelector.css'

const InvestigationSelector = () => {
  const {
    investigations,
    investigationsLoading,
    selectedInvestigationId,
    selectInvestigation,
    isAdmin,
  } = useAuth()

  if (investigationsLoading) {
    return <div className="investigation-selector loading">Loading...</div>
  }

  // No investigations
  if (investigations.length === 0) {
    if (isAdmin()) {
      return (
        <div className="investigation-selector empty">
          <button className="create-investigation-btn">
            + Create Investigation
          </button>
        </div>
      )
    } else {
      return (
        <div className="investigation-selector empty">
          <span className="no-investigations">No investigations assigned</span>
        </div>
      )
    }
  }

  // Single investigation - show as label
  if (investigations.length === 1) {
    const inv = investigations[0]
    return (
      <div className="investigation-selector single">
        <span className="investigation-label">
          {inv.brand} - {inv.name}
        </span>
      </div>
    )
  }

  // Multiple investigations - show dropdown
  return (
    <div className="investigation-selector">
      <select
        value={selectedInvestigationId || ''}
        onChange={(e) => selectInvestigation(parseInt(e.target.value))}
        className="investigation-dropdown"
      >
        <option value="" disabled>
          Select Investigation
        </option>
        {investigations.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.brand} - {inv.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default InvestigationSelector
