import { Link, NavLink } from 'react-router-dom'
import { INFO_PAGES } from './navigation'

export function NavBar() {
  return (
    <nav style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-base font-semibold tracking-tight">
          MTG Print Proxy
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {INFO_PAGES.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100')}
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
