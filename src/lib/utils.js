import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of header objects with {key, label} or array of strings
 * @param {string} filename - Name of the file to download
 */
export function exportToCSV(data, headers, filename) {
  if (!data || data.length === 0) {
    return
  }

  // Convert headers to array format if needed
  let headerKeys = []
  let headerLabels = []
  
  if (headers && headers.length > 0) {
    if (typeof headers[0] === 'object' && headers[0].key) {
      // Headers are objects with key and label
      headerKeys = headers.map(h => h.key)
      headerLabels = headers.map(h => h.label || h.key)
    } else {
      // Headers are just keys
      headerKeys = headers
      headerLabels = headers
    }
  } else {
    // Auto-detect headers from first object
    headerKeys = Object.keys(data[0])
    headerLabels = headerKeys
  }

  // Create CSV content
  const csvRows = []
  
  // Add header row
  csvRows.push(headerLabels.map(label => `"${String(label).replace(/"/g, '""')}"`).join(','))
  
  // Add data rows
  data.forEach(row => {
    const values = headerKeys.map(key => {
      const value = row[key]
      if (value === null || value === undefined) {
        return '""'
      }
      // Handle arrays (like tags)
      if (Array.isArray(value)) {
        return `"${value.join('; ').replace(/"/g, '""')}"`
      }
      // Handle objects
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }
      return `"${String(value).replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  })
  
  const csvContent = csvRows.join('\n')
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename || 'export.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Format lastUpdatedAt_UTC timestamp for display
 * @param {string} timestamp - UTC timestamp string
 * @returns {string} Formatted date string or 'N/A'
 */
export function formatLastPolled(timestamp) {
  if (!timestamp) return 'N/A'
  
  try {
    // Handle different timestamp formats
    let date
    if (timestamp.includes('T')) {
      // ISO format: 2024-01-11T12:30:45
      date = new Date(timestamp)
    } else if (timestamp.includes(',')) {
      // Format: 1/11/2024, 12:30:45
      date = new Date(timestamp)
    } else {
      // Format: 2024-01-11 12:30:45
      date = new Date(timestamp.replace(' ', 'T'))
    }
    
    if (isNaN(date.getTime())) {
      return 'N/A'
    }
    
    // Format: "Jan 11, 2024 at 12:30 PM"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch (e) {
    return 'N/A'
  }
}

/**
 * Get last polled timestamp from data array
 * @param {Array} dataList - Array of data objects
 * @returns {string} Formatted timestamp or 'N/A'
 */
export function getLastPolledTime(dataList) {
  if (!dataList || dataList.length === 0) {
    return 'N/A'
  }
  
  // Get first record's lastUpdatedAt_UTC
  const firstRecord = dataList[0]
  const timestamp = firstRecord?.lastUpdatedAt_UTC || firstRecord?.lastUpdatedAt || null
  
  return formatLastPolled(timestamp)
}

