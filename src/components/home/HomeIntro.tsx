/**
 * The page's one <h1> and a single line saying what it does.
 *
 * Kept deliberately small: the tool is the point of the page and the decklist box should still
 * be the first thing you reach for. But a page with no heading at all gives a search engine
 * nothing to title it by, and left every result to be summarised from the nav bar.
 */
export function HomeIntro() {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight">
        Print Magic proxies at true card size
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Paste a decklist, pick the printings you want, and download a print-ready PDF at 63 × 88 mm.
        Free, and it runs entirely in your browser.
      </p>
    </div>
  )
}
