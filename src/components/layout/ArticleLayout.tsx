import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BreadcrumbJsonLd } from '../seo/JsonLd'

/** GDPR expects a reachable controller contact; this is shown on the legal pages. */
export const CONTACT_EMAIL = 'zapps4848@gmail.com'
export const LAST_UPDATED = '20 August 2026'

/**
 * Shell for the four prose pages. The column is centred on the page (`mx-auto`) while its
 * contents stay left-aligned, centred multi-line prose is hard to read.
 */
export function ArticleLayout({ title, children }: { title: string; children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <BreadcrumbJsonLd label={title} path={pathname} />
      {/* No sub-nav here. The header lists these same five pages on every page and the footer
          lists them again, so a third copy made five duplicated anchors on each prose page,
          which tells a search engine nothing and reads as repetition to a screen reader. */}
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
