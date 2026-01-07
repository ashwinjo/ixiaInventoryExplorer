import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Chassis', href: '/chassis', color: 'cyan' },
  { name: 'Cards', href: '/cards', color: 'teal' },
  { name: 'Ports', href: '/ports', color: 'violet' },
  { name: 'Licenses', href: '/licenses', color: 'amber' },
  { name: 'Sensors', href: '/sensors', color: 'emerald' },
  { name: 'Performance', href: '/performance', color: 'rose' },
  { name: 'Add/Delete Chassis', href: '/config', color: 'sky' },
]

// Obsidian Intelligence color palette for navigation
const colorClasses = {
  cyan: {
    active: 'text-cyan-400 border-cyan-400',
    inactive: 'text-cyan-500/60 hover:text-cyan-400 hover:border-cyan-400/50'
  },
  teal: {
    active: 'text-teal-400 border-teal-400',
    inactive: 'text-teal-500/60 hover:text-teal-400 hover:border-teal-400/50'
  },
  violet: {
    active: 'text-violet-400 border-violet-400',
    inactive: 'text-violet-500/60 hover:text-violet-400 hover:border-violet-400/50'
  },
  amber: {
    active: 'text-amber-400 border-amber-400',
    inactive: 'text-amber-500/60 hover:text-amber-400 hover:border-amber-400/50'
  },
  emerald: {
    active: 'text-emerald-400 border-emerald-400',
    inactive: 'text-emerald-500/60 hover:text-emerald-400 hover:border-emerald-400/50'
  },
  rose: {
    active: 'text-rose-400 border-rose-400',
    inactive: 'text-rose-500/60 hover:text-rose-400 hover:border-rose-400/50'
  },
  sky: {
    active: 'text-sky-400 border-sky-400',
    inactive: 'text-sky-500/60 hover:text-sky-400 hover:border-sky-400/50'
  },
}

function Navbar() {
  const location = useLocation()

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Ixia Inventory Explorer
            </Link>
            <div className="flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href === '/chassis' && location.pathname === '/') ||
                  (item.href === '/config' && location.pathname === '/settings')
                const colors = colorClasses[item.color]
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-all duration-200 border-b-2 rounded-t-md",
                      isActive
                        ? `${colors.active} bg-white/5`
                        : `${colors.inactive} border-transparent hover:bg-white/5`
                    )}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
