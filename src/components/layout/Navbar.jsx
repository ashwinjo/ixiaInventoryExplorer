import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

const navigation = [
  { name: 'Chassis', href: '/chassis' },
  { name: 'IxNetwork API Servers', href: '/ixnetwork' },
  { name: 'Cards', href: '/cards' },
  { name: 'Ports', href: '/ports' },
  { name: 'Licenses', href: '/licenses' },
  { name: 'Sensors', href: '/sensors' },
]

const configNavItem = { name: '[ADD | DELETE] Chassis / IxN API Servers', href: '/config' }

export default function Navbar() {
  const location = useLocation()
  const [logoError, setLogoError] = useState(false)
  const { toggleTheme, isDark } = useTheme()

  const isActive = (href) =>
    location.pathname === href || (href === '/chassis' && location.pathname === '/')

  return (
    <header style={{
      background: '#291B44',
      borderBottom: '1px solid #3d2860',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 24px',
        gap: '24px',
      }}>
        {/* Logo + Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: 0 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            {logoError ? (
              <span style={{ fontSize: '1.3rem', color: '#E90029', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                Ix
              </span>
            ) : (
              <img
                src="/logo.svg"
                alt="Ixia"
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                onError={() => setLogoError(true)}
              />
            )}
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.90)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
            }}>
              Ixia Inventory Explorer
            </span>
          </Link>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

          {/* Nav items */}
          <nav style={{ display: 'flex', gap: '2px', overflowX: 'auto' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: '1px solid',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'background 150ms ease, border-color 150ms ease',
                  ...(isActive(item.href) ? {
                    color: '#E90029',
                    borderColor: 'rgba(233,0,41,0.50)',
                    background: 'rgba(233,0,41,0.12)',
                  } : {
                    color: 'rgba(255,255,255,0.80)',
                    borderColor: 'rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.06)',
                  }),
                }}
                onMouseEnter={e => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = '#ffffff'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.80)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                  }
                }}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Config link */}
          <Link
            to={configNavItem.href}
            style={{
              padding: '5px 11px',
              borderRadius: '6px',
              border: '1px solid',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.70rem',
              fontWeight: 500,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'background 150ms ease, border-color 150ms ease',
              ...(isActive(configNavItem.href) ? {
                color: '#E90029',
                borderColor: 'rgba(233,0,41,0.50)',
                background: 'rgba(233,0,41,0.12)',
              } : {
                color: 'rgba(255,255,255,0.80)',
                borderColor: 'rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.06)',
              }),
            }}
            onMouseEnter={e => {
              if (!isActive(configNavItem.href)) {
                e.currentTarget.style.color = '#ffffff'
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive(configNavItem.href)) {
                e.currentTarget.style.color = 'rgba(255,255,255,0.80)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
              }
            }}
          >
            {configNavItem.name}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to day mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to day mode' : 'Switch to dark mode'}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.80)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.80)'
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </header>
  )
}
