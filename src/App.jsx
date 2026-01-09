import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { AppProvider } from '@/context/AppContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppProvider>
          <div className="min-h-screen bg-background transition-colors duration-300">
            <AppRoutes />
            <Toaster />
          </div>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App

