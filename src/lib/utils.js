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

