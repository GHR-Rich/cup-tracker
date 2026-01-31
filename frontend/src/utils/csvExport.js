import { getDistance } from 'geolib'

export function generateLocationCSV(locations, tracker) {
  // Sort by timestamp (oldest first)
  const sortedLocations = [...locations]
    .filter(loc => loc.latitude && loc.longitude)
    .sort((a, b) => {
      if (!a.screenshot_timestamp) return 1
      if (!b.screenshot_timestamp) return -1
      return new Date(a.screenshot_timestamp) - new Date(b.screenshot_timestamp)
    })

  if (sortedLocations.length === 0) {
    alert('No geocoded locations to export')
    return null
  }

  // CSV Headers
  const headers = [
    'Stop Number',
    'Tracker Name',
    'Platform',
    'Address',
    'City',
    'State',
    'Postal Code',
    'Latitude',
    'Longitude',
    'Timestamp',
    'Distance to Next (miles)',
    'Total Distance (miles)'
  ]

  // Calculate cumulative distance
  let cumulativeDistance = 0
  const rows = sortedLocations.map((location, index) => {
    const stopNumber = index + 1
    
    // Calculate distance to next location
    let distanceToNext = ''
    if (index < sortedLocations.length - 1) {
      const nextLoc = sortedLocations[index + 1]
      const distanceMeters = getDistance(
        { latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) },
        { latitude: parseFloat(nextLoc.latitude), longitude: parseFloat(nextLoc.longitude) }
      )
      const distanceMiles = (distanceMeters * 0.000621371).toFixed(2)
      distanceToNext = distanceMiles
      cumulativeDistance += parseFloat(distanceMiles)
    }

    return [
      stopNumber,
      tracker.name,
      location.platform || tracker.platform,
      `"${location.address.replace(/"/g, '""')}"`, // Escape quotes in address
      location.city || '',
      location.state || '',
      location.postal_code || '',
      parseFloat(location.latitude).toFixed(6),
      parseFloat(location.longitude).toFixed(6),
      location.screenshot_timestamp 
        ? new Date(location.screenshot_timestamp).toLocaleString()
        : '',
      distanceToNext,
      cumulativeDistance.toFixed(2)
    ]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
