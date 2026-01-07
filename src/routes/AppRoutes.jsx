import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import ChassisPage from '@/pages/ChassisPage'
import CardsPage from '@/pages/CardsPage'
import PortsPage from '@/pages/PortsPage'
import LicensesPage from '@/pages/LicensesPage'
import SensorsPage from '@/pages/SensorsPage'
import PerformancePage from '@/pages/PerformancePage'
import ConfigPage from '@/pages/ConfigPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ChassisPage />} />
        <Route path="chassis" element={<ChassisPage />} />
        <Route path="cards" element={<CardsPage />} />
        <Route path="ports" element={<PortsPage />} />
        <Route path="licenses" element={<LicensesPage />} />
        <Route path="sensors" element={<SensorsPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="settings" element={<ConfigPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes

