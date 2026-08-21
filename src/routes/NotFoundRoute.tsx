import { Link } from 'react-router-dom'

export function NotFoundRoute() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        That page doesn’t exist.
      </p>
      <p className="mt-6 text-sm">
        <Link to="/" className="underline underline-offset-4 hover:opacity-60">
          ← Back to MTG Print Proxy
        </Link>
      </p>
    </main>
  )
}
