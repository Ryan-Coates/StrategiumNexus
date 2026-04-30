import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/games', label: 'War Codex' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-void-950">
      {/* Top ornament line */}
      <div className="h-0.5 bg-gold-gradient opacity-60" />

      <header className="border-b border-gold-muted/25 bg-void-900/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-8">
          {/* Wordmark */}
          <NavLink
            to="/"
            className="font-display text-gold text-lg md:text-xl tracking-[0.2em] uppercase hover:text-gold-light transition-colors"
          >
            Strategium Nexus
          </NavLink>

          {/* Nav */}
          <nav className="flex items-center gap-6">
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
        </div>
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
