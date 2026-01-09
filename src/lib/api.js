import axios from 'axios'

// DEPLOYMENT-AGNOSTIC API Configuration
// ====================================
// Uses relative URLs by default, which works in all deployment scenarios:
// - Local development (with Vite proxy)
// - ngrok tunnels
// - Cloud Run (single container serving frontend + API)
// - Any other hosting (Kubernetes, VM, etc.)
//
// The frontend and API should be served from the SAME origin in production.
// Vite dev server proxies /api to the backend during development.
//
// Override with VITE_API_URL environment variable if you need absolute URLs
// (e.g., for separate frontend/backend deployments)
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Debug: Log the configured base URL on startup
console.log('[API Config] Base URL:', API_BASE_URL || '(empty - using relative URLs)')
console.log('[API Config] Window origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A')

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',  // Explicitly request JSON
    // Skip ngrok browser warning interstitial (required for ngrok free tier)
    'ngrok-skip-browser-warning': 'true',
  },
  // Ensure axios parses JSON responses
  responseType: 'json',
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Debug: Log full request URL
    const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url
    console.log('[API Request]', config.method?.toUpperCase(), fullUrl, '| Base:', config.baseURL || 'none')
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    
    // Check if we got HTML instead of JSON (indicates proxy issue or wrong server)
    const contentType = response.headers['content-type'] || ''
    if (contentType.includes('text/html') && response.config.url?.startsWith('/api')) {
      console.error('[API Error] Received HTML instead of JSON for API request:', response.config.url)
      console.error('[API Error] This usually means the proxy is not working or the backend is not running')
      console.error('[API Error] Response preview:', String(response.data).substring(0, 200))
      
      // Reject with a clear error
      return Promise.reject(new Error('API returned HTML instead of JSON. Check that the backend is running and the proxy is configured correctly.'))
    }
    
    // Also check if data is a string that looks like HTML
    if (typeof response.data === 'string' && response.data.trim().startsWith('<!')) {
      console.error('[API Error] Response data is HTML string:', response.data.substring(0, 200))
      return Promise.reject(new Error('API returned HTML instead of JSON'))
    }
    
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 400:
          console.error('Bad Request:', data.detail || data.message)
          break
        case 401:
          console.error('Unauthorized:', data.detail || data.message)
          // Handle unauthorized - redirect to login if needed
          break
        case 404:
          console.error('Not Found:', data.detail || data.message)
          break
        case 500:
          console.error('Server Error:', data.detail || data.message)
          break
        default:
          console.error('Error:', data.detail || data.message)
      }
    } else if (error.request) {
      // Request was made but no response received (backend not running or network issue)
      console.error('API Network Error:', error.config?.method?.toUpperCase(), error.config?.url, error.message)
    } else {
      // Something else happened (configuration error, etc.)
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default api

