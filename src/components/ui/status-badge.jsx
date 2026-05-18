import { cn } from '@/lib/utils'

// Maps status → semantic Keysight token classes
const statusMap = {
  ready:           'badge-green',
  up:              'badge-green',
  active:          'badge-green',
  down:            'badge-crimson',
  'not-reachable': 'badge-crimson',
  'not-available': 'badge-crimson',
  expired:         'badge-crimson',
  warning:         'badge-amber',
  unknown:         'badge-amber',
  disabled:        'badge-amber',
  unplugged:       'badge-amber',
  init:            'badge-amber',
  configuring:     'badge-amber',
  testing:         'badge-amber',
}

function normalizeStatus(status) {
  if (!status) return null
  const lower = status.toLowerCase().trim()
  if (statusMap[lower]) return statusMap[lower]
  if (lower.includes('ready') || lower === 'up') return 'badge-green'
  if (lower.includes('active')) return 'badge-green'
  if (lower.includes('down') || lower.includes('not-reachable') || lower.includes('unreachable') || lower.includes('not-available') || lower.includes('expired')) return 'badge-crimson'
  if (lower.includes('warn') || lower.includes('unknown') || lower.includes('disabled') || lower.includes('init') || lower.includes('config') || lower.includes('test')) return 'badge-amber'
  return null
}

export function StatusBadge({ status, className }) {
  const variant = normalizeStatus(status) || 'badge-dim'

  return (
    <span className={cn('ks-badge', variant, className)}>
      {status || 'N/A'}
    </span>
  )
}
