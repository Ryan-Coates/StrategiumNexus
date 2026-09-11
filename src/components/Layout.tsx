import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import AuthWidget from './AuthWidget'

const NAV_ITEMS = [
  { to: '/games', label: 'War Codex' },
  { to: '/rosters', label: 'Warband Forge' },
  { to: '/horde', label: 'Horde Mode' },
  { to: '/campaign', label: 'Tides of Meridian Campaign' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-void-950">
      {/* Top ornament line */}
      <div className="h-0.5 bg-gold-gradient opacity-60" />

      <header className="border-b border-gold-muted/25 bg-void-900/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          {/* Wordmark */}
          <NavLink
            to="/"
            onClick={() => setMenuOpen(false)}
            className="font-display text-gold text-lg md:text-xl tracking-[0.2em] uppercase hover:text-gold-light transition-colors"
          >
            Strategium Nexus
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-heading text-xs tracking-[0.18em] uppercase transition-colors duration-150 ${
                    isActive
                      ? 'text-gold border-b border-gold pb-0.5'
                      : 'text-parchment-muted hover:text-gold'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden lg:block">
            <AuthWidget />
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="lg:hidden shrink-0 p-2 border border-gold-muted/30 text-gold hover:border-gold transition-colors"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gold-muted/20 bg-void-900/95 px-4 sm:px-6 py-4 flex flex-col gap-4">
            <nav className="flex flex-col gap-3">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `font-heading text-xs tracking-[0.18em] uppercase transition-colors duration-150 ${
                      isActive ? 'text-gold' : 'text-parchment-muted hover:text-gold'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 border-t border-gold-muted/10">
              <AuthWidget />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-gold-muted/15 py-4 text-center">
        <p className="font-heading text-xs tracking-widest uppercase text-parchment-faint">
          Strategium Nexus &mdash; For the glory of the Imperium
        </p>
        <p className="mt-1.5 font-heading text-[10px] tracking-widest uppercase">
          <a
            href="https://github.com/Ryan-Coates/StrategiumNexus/issues"
            target="_blank"
            rel="noreferrer"
            className="text-parchment-faint hover:text-gold transition-colors"
          >
            Report an Issue &rarr;
          </a>
        </p>
      </footer>
    </div>
  )
}
