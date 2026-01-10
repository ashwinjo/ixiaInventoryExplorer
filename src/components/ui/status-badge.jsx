import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

export function StatusBadge({ status, className }) {
  const { isDark } = useTheme()
  
  // Status mapping with theme-aware colors for professional visibility
  const statusConfig = {
    ready: {
      dark: 'bg-green-500/20 text-green-400 border border-green-500/30',
      light: 'bg-green-100 text-green-800 border border-green-300'
    },
    up: {
      dark: 'bg-green-500/20 text-green-400 border border-green-500/30',
      light: 'bg-green-100 text-green-800 border border-green-300'
    },
    down: {
      dark: 'bg-red-500/20 text-red-400 border border-red-500/30',
      light: 'bg-red-100 text-red-800 border border-red-300'
    },
    'not-reachable': {
      dark: 'bg-red-500/20 text-red-400 border border-red-500/40',
      light: 'bg-red-200 text-red-900 border border-red-400'
    },
    'not-available': {
      dark: 'bg-red-500/20 text-red-400 border border-red-500/40',
      light: 'bg-red-200 text-red-900 border border-red-400'
    },
    warning: {
      dark: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      light: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    },
    expired: {
      dark: 'bg-red-500/20 text-red-400 border border-red-500/30',
      light: 'bg-red-100 text-red-800 border border-red-300'
    },
    active: {
      dark: 'bg-green-500/20 text-green-400 border border-green-500/30',
      light: 'bg-green-100 text-green-800 border border-green-300'
    },
    unknown: {
      dark: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      light: 'bg-orange-100 text-orange-800 border border-orange-300'
    },
    disabled: {
      dark: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      light: 'bg-orange-100 text-orange-800 border border-orange-300'
    },
    unplugged: {
      dark: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      light: 'bg-orange-100 text-orange-800 border border-orange-300'
    },
    init: {
      dark: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      light: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    },
    configuring: {
      dark: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      light: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    },
    testing: {
      dark: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      light: 'bg-yellow-100 text-yellow-800 border border-yellow-300'
    },
    default: {
      dark: 'bg-muted text-muted-foreground border border-border',
      light: 'bg-muted text-muted-foreground border border-border'
    }
  }
  
  // Normalize status to key - handle various formats
  const normalizeStatus = (statusStr) => {
    if (!statusStr) return 'default'
    const lower = statusStr.toLowerCase().trim()
    
    // Direct matches
    if (statusConfig[lower]) return lower
    
    // Check for partial matches
    if (lower.includes('ready') || lower === 'up') return 'ready'
    if (lower.includes('down')) return 'down'
    if (lower.includes('not-reachable') || lower.includes('not-available') || lower.includes('unreachable')) return 'not-reachable'
    if (lower.includes('expired')) return 'expired'
    if (lower.includes('active')) return 'active'
    if (lower.includes('unknown') || lower.includes('disabled') || lower.includes('unplugged')) return 'unknown'
    if (lower.includes('init') || lower.includes('configuring') || lower.includes('testing')) return 'init'
    if (lower.includes('warning')) return 'warning'
    
    return 'default'
  }
  
  const normalizedStatus = normalizeStatus(status)
  const config = statusConfig[normalizedStatus] || statusConfig.default
  
  return (
    <span
      className={cn(
        'px-2 py-1 rounded text-xs font-semibold',
        isDark ? config.dark : config.light,
        className
      )}
    >
      {status || 'N/A'}
    </span>
  )
}

