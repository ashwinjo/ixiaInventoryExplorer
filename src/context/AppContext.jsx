import { createContext, useContext, useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

const AppContext = createContext(undefined)

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const setLoadingState = useCallback((isLoading) => {
    setLoading(isLoading)
  }, [])

  const setErrorState = useCallback((err) => {
    setError(err)
    if (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'An error occurred',
      })
    }
  }, [toast])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AppContext.Provider
      value={{
        loading,
        error,
        setLoading: setLoadingState,
        setError: setErrorState,
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

