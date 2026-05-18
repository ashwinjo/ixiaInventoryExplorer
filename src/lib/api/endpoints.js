import api from '../api'

// Chassis endpoints
export const getChassis = () => api.get('/api/chassis')
export const pollChassis = () => api.post('/api/poll/chassis')

// Cards endpoints
export const getCards = () => api.get('/api/cards')
export const pollCards = () => api.post('/api/poll/cards')

// Ports endpoints
export const getPorts = () => api.get('/api/ports')
export const pollPorts = () => api.post('/api/poll/ports')

// Licenses endpoints
export const getLicenses = () => api.get('/api/licenses')
export const pollLicenses = () => api.post('/api/poll/licensing')

// Sensors endpoints
export const getSensors = () => api.get('/api/sensors')
export const pollSensors = () => api.post('/api/poll/sensors')

// Performance endpoints
export const getChassisList = () => api.get('/api/performance/chassis-list')
export const getPerformanceMetrics = (ip) => api.get(`/api/performance/metrics/${ip}`)

// Tags endpoints
export const addTags = (data) => api.post('/api/tags/add', data)
export const removeTags = (data) => api.post('/api/tags/remove', data)

// Config endpoints
export const getConfiguredChassis = () => api.get('/api/config/chassis')
export const uploadConfig = (data) => api.post('/api/config/upload', data)
export const setPollingIntervals = (data) => api.post('/api/config/polling-intervals', data)
export const resetDatabase = () => api.delete('/api/config/reset')

// Logs endpoints
export const collectLogs = (data) => api.post('/api/logs/collect', data)

