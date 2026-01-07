import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
    console.log('API Request:', config.method?.toUpperCase(), config.url)
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

