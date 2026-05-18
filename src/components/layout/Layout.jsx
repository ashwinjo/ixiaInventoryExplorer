import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import ChatAssistant from '../ChatAssistant'

function Layout() {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto container mx-auto px-4 py-8">
          <Outlet />
        </main>
        <ChatAssistant
          isCollapsed={isChatCollapsed}
          onToggle={() => setIsChatCollapsed(!isChatCollapsed)}
        />
      </div>
    </div>
  )
}

export default Layout

