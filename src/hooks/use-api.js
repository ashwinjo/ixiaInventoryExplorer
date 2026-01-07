import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'

/**
 * Custom hook for API calls with loading and error states
 * @param {Function} apiCall - The API function to call
 * @param {Array} dependencies - Dependencies for useEffect
 * @param {boolean} immediate - Whether to call immediately on mount
 */
export function useApi(apiCall, dependencies = [], immediate = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)
  const { setLoading: setGlobalLoading, setError: setGlobalError } = useApp()

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true)
      setGlobalLoading(true)
      setError(null)
      const response = await apiCall(...args)
      setData(response.data)
      return response.data
    } catch (err) {
      // Handle network errors more gracefully
      // Network errors occur when backend is not running - don't treat as errors
      const isNetworkError = !err.response && err.request
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred'
      
      // Only set error for actual API errors (not network/connection issues)
      // Network errors are handled gracefully in components (empty state)
      if (!isNetworkError) {
        setError(errorMessage)
        setGlobalError({ message: errorMessage })
      } else {
        // For network errors, don't set error state - component will show empty state
        setError(null)
      }
      
      throw err
    } finally {
      setLoading(false)
      setGlobalLoading(false)
    }
  }, [apiCall, setGlobalLoading, setGlobalError])

  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, ...dependencies])

  return { data, loading, error, execute, refetch: execute }
}

/**
 * Custom hook for mutations (POST, PUT, DELETE)
 */
export function useMutation(apiCall) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setLoading: setGlobalLoading, setError: setGlobalError } = useApp()

  const mutate = useCallback(async (data, options = {}) => {
    try {
      setLoading(true)
      setGlobalLoading(true)
      setError(null)
      const response = await apiCall(data)
      
      if (options.onSuccess) {
        options.onSuccess(response.data)
      }
      
      return response.data
    } catch (err) {
      // Handle network errors more gracefully
      const isNetworkError = !err.response && err.request
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred'
      
      // Only set error for actual API errors (not network/connection issues)
      if (!isNetworkError) {
        setError(errorMessage)
        setGlobalError({ message: errorMessage })
      }
      
      if (options.onError) {
        options.onError(err)
      }
      
      throw err
    } finally {
      setLoading(false)
      setGlobalLoading(false)
    }
  }, [apiCall, setGlobalLoading, setGlobalError])

  return { mutate, loading, error }
}

