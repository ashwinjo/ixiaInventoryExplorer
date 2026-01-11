import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

// Import logo - Place your logo file (logo.svg, logo.png, etc.) in src/assets/
// Then uncomment and update the import path below:
// import logoImage from '@/assets/logo.svg'
// Or if using a public folder: <img src="/logo.svg" alt="Ixia Logo" />

const navigation = [
  { name: 'Chassis', href: '/chassis', color: 'cyan' },
  { name: 'IxNetwork API Servers', href: '/ixnetwork', color: 'fuchsia' },
  { name: 'Cards', href: '/cards', color: 'teal' },
  { name: 'Ports', href: '/ports', color: 'violet' },
  { name: 'Licenses', href: '/licenses', color: 'amber' },
  { name: 'Sensors', href: '/sensors', color: 'emerald' },
]

const configNavItem = { name: '[ADD | DELETE ] Chassis / IxN API Servers', href: '/config', color: 'sky' }

// Bright, vibrant color palette for navigation with enhanced visibility
const colorClasses = {
  cyan: {
    active: 'text-cyan-200 border-cyan-200 bg-cyan-500/25 font-bold',
    inactive: 'text-cyan-300/95 hover:text-cyan-200 hover:border-cyan-200 hover:bg-cyan-500/15'
  },
  fuchsia: {
    active: 'text-fuchsia-200 border-fuchsia-200 bg-fuchsia-500/25 font-bold',
    inactive: 'text-fuchsia-300/95 hover:text-fuchsia-200 hover:border-fuchsia-200 hover:bg-fuchsia-500/15'
  },
  teal: {
    active: 'text-teal-200 border-teal-200 bg-teal-500/25 font-bold',
    inactive: 'text-teal-300/95 hover:text-teal-200 hover:border-teal-200 hover:bg-teal-500/15'
  },
  violet: {
    active: 'text-violet-200 border-violet-200 bg-violet-500/25 font-bold',
    inactive: 'text-violet-300/95 hover:text-violet-200 hover:border-violet-200 hover:bg-violet-500/15'
  },
  amber: {
    active: 'text-amber-200 border-amber-200 bg-amber-500/25 font-bold',
    inactive: 'text-amber-300/95 hover:text-amber-200 hover:border-amber-200 hover:bg-amber-500/15'
  },
  emerald: {
    active: 'text-emerald-200 border-emerald-200 bg-emerald-500/25 font-bold',
    inactive: 'text-emerald-300/95 hover:text-emerald-200 hover:border-emerald-200 hover:bg-emerald-500/15'
  },
  rose: {
    active: 'text-rose-200 border-rose-200 bg-rose-500/25 font-bold',
    inactive: 'text-rose-300/95 hover:text-rose-200 hover:border-rose-200 hover:bg-rose-500/15'
  },
  sky: {
    active: 'text-sky-200 border-sky-200 bg-sky-500/25 font-bold',
    inactive: 'text-sky-300/95 hover:text-sky-200 hover:border-sky-200 hover:bg-sky-500/15'
  },
}

function Navbar() {
  const location = useLocation()
  const [logoError, setLogoError] = useState(false)
  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <nav className={cn(
      "border-b border-border/50 backdrop-blur-md sticky top-0 z-50",
      isDark ? "bg-card/80" : "bg-black"
    )}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              {/* Logo - Place your logo file at: public/logo.svg or src/assets/logo.svg */}
              {/* If using public folder: src="/logo.svg" */}
              {/* If using src/assets: import logoImage from '@/assets/logo.svg' then src={logoImage} */}
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                {logoError ? (
                  <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-cyan-400 to-teal-400 rounded-lg font-bold text-white text-xl shadow-lg hover:shadow-xl transition-all"
                       style={{ boxShadow: '0 0 15px rgba(34, 211, 238, 0.6)' }}>
                    IX
                  </div>
                ) : (
                  <img 
                    src="/logo.svg" 
                    alt="Ixia Logo" 
                    className="w-full h-full object-contain brightness-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] hover:brightness-125 transition-all"
                    style={{ imageRendering: 'auto' }}
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-200 to-teal-200 bg-clip-text text-transparent group-hover:from-cyan-100 group-hover:to-teal-100 transition-all drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
              Ixia Inventory Explorer
              </span>
            </Link>
            <div className="flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/chassis' && location.pathname === '/')
                const colors = colorClasses[item.color]
                
                // Define glow effect styles for active items
                const glowStyles = {
                  cyan: { boxShadow: '0 0 15px rgba(34, 211, 238, 0.6), 0 0 30px rgba(34, 211, 238, 0.3)' },
                  fuchsia: { boxShadow: '0 0 15px rgba(217, 70, 239, 0.6), 0 0 30px rgba(217, 70, 239, 0.3)' },
                  teal: { boxShadow: '0 0 15px rgba(20, 184, 166, 0.6), 0 0 30px rgba(20, 184, 166, 0.3)' },
                  violet: { boxShadow: '0 0 15px rgba(167, 139, 250, 0.6), 0 0 30px rgba(167, 139, 250, 0.3)' },
                  amber: { boxShadow: '0 0 15px rgba(245, 158, 11, 0.6), 0 0 30px rgba(245, 158, 11, 0.3)' },
                  emerald: { boxShadow: '0 0 15px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.3)' },
                  rose: { boxShadow: '0 0 15px rgba(251, 113, 133, 0.6), 0 0 30px rgba(251, 113, 133, 0.3)' },
                  sky: { boxShadow: '0 0 15px rgba(14, 165, 233, 0.6), 0 0 30px rgba(14, 165, 233, 0.3)' },
                }
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 rounded-t-md",
                      "hover:scale-105 hover:shadow-lg hover:brightness-110",
                      isActive
                        ? colors.active
                        : `${colors.inactive} border-transparent`
                    )}
                    style={isActive ? glowStyles[item.color] : {}}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          
          {/* Add/Delete Chassis and Theme Toggle on the right */}
          <div className="flex items-center gap-3">
            {(() => {
              const isActive = location.pathname === configNavItem.href || location.pathname === '/settings'
              const colors = colorClasses[configNavItem.color]
              const glowStyles = {
                sky: { boxShadow: '0 0 15px rgba(14, 165, 233, 0.6), 0 0 30px rgba(14, 165, 233, 0.3)' },
              }
              
              return (
                <Link
                  to={configNavItem.href}
                  className={cn(
                    "px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 rounded-t-md",
                    "hover:scale-105 hover:shadow-lg hover:brightness-110",
                    isActive
                      ? colors.active
                      : `${colors.inactive} border-transparent`
                  )}
                  style={isActive ? glowStyles.sky : {}}
                >
                  {configNavItem.name}
                </Link>
              )
            })()}
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={cn(
                "relative p-2 rounded-full transition-all duration-300 ease-out",
                "hover:scale-110 active:scale-95",
                isDark 
                  ? "bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20" 
                  : "bg-sky-100 hover:bg-sky-200 text-sky-600 hover:text-sky-700 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30"
              )}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-5 h-5">
                {/* Sun icon - visible in dark mode */}
                <Sun 
                  size={20} 
                  className={cn(
                    "absolute inset-0 transition-all duration-300",
                    isDark 
                      ? "opacity-100 rotate-0 scale-100" 
                      : "opacity-0 rotate-90 scale-0"
                  )}
                />
                {/* Moon icon - visible in light mode */}
                <Moon 
                  size={20} 
                  className={cn(
                    "absolute inset-0 transition-all duration-300",
                    isDark 
                      ? "opacity-0 -rotate-90 scale-0" 
                      : "opacity-100 rotate-0 scale-100"
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
