import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import { AppProvider } from '@/context/AppContext'
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="min-h-screen bg-background dark">
          <AppRoutes />
          <Toaster />
        </div>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App

