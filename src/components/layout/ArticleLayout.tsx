import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { INFO_PAGES } from './navigation'

/** Fill this in before publishing — GDPR expects a reachable controller contact. */
export const CONTACT_EMAIL = 'zapps4848@gmail.com'
export const LAST_UPDATED = '20 August 2026'

/**
 * Shell for the four prose pages. The column is centred on the page (`mx-auto`) while its
 * contents stay left-aligned — centred multi-line prose is hard to read.
 */
export function ArticleLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <nav
        className="mb-8 flex flex-wrap gap-x-5 gap-y-2 pb-4 text-sm"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {INFO_PAGES.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'font-semibold' : 'underline underline-offset-4 hover:opacity-60'
            }
            style={({ isActive }) => (isActive ? { color: 'var(--text)' } : undefined)}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <h1 className="mb-5 text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="space-y-4 text-sm/7" style={{ color: 'var(--text-muted)' }}>
        {children}
      </div>

      <p className="mt-14 text-sm">
        <Link to="/" className="underline underline-offset-4 hover:opacity-60">
          ← Back to MTG Print Proxy
        </Link>
      </p>
    </main>
  )
}
