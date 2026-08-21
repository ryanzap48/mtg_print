import { useEffect, useState } from 'react'
import { analyticsAvailable, getConsent, setConsent } from '../../lib/analytics'

/**
 * Consent gate for Google Analytics. Shown only when a measurement ID is configured and the
 * visitor has not chosen yet. "Reject" is given equal visual weight to "Accept", regulators
 * treat a hard-to-find or de-emphasised reject option as invalid consent.
 */
export function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (analyticsAvailable() && getConsent() === null) setVisible(true)
    // Allow the footer's "Cookie settings" link to reopen this.
    const reopen = () => setVisible(true)
    window.addEventListener('mtg-print:open-consent', reopen)
    return () => window.removeEventListener('mtg-print:open-consent', reopen)
  }, [])

  if (!visible) return null

  const choose = (choice: 'granted' | 'denied') => {
    setConsent(choice)
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ background: 'var(--nav)', color: 'var(--nav-text)' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs/5">
          We’d like to use Google Analytics cookies to see which parts of the site get used.
          They’re optional, the site works exactly the same if you decline, and your decklists
          never leave your browser either way.{' '}
          <a href="/privacy.html" className="underline underline-offset-2">
            Privacy policy
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="btn flex-1 px-4 py-2 text-xs sm:flex-none"
            style={{ border: '1px solid rgb(255 255 255 / 0.35)', color: 'var(--nav-text)' }}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="btn flex-1 px-4 py-2 text-xs sm:flex-none"
            style={{ background: 'var(--nav-text)', color: 'var(--nav)' }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}

/** Lets any page reopen the banner so consent can be withdrawn as easily as it was given. */
export function CookieSettingsLink({ className }: { className?: string }) {
  if (!analyticsAvailable()) return null
  return (
    <button
      type="button"
      className={className ?? 'underline underline-offset-2'}
      onClick={() => window.dispatchEvent(new Event('mtg-print:open-consent'))}
    >
      Cookie settings
    </button>
  )
}
