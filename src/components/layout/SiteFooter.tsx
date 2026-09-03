import { Link } from 'react-router-dom'
import { CookieSettingsLink } from './ConsentBanner'
import { FOOTER_PAGES } from './navigation'

/**
 * About, Privacy, Terms, and Legal each have their own route. The footer keeps only the Fan
 * Content attribution, which Wizards' policy asks be shown with the content itself.
 */
export function SiteFooter() {
  return (
    <footer
      className="mt-16"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-sunken)' }}
    >
      {/* The mobile Download bar is fixed to the viewport, so reserve room beneath it. */}
      <div className="mx-auto max-w-2xl px-4 pt-8 pb-28 text-center sm:pb-8">
        {/* Longer names than the nav bar uses, so the two sets of links to the same five pages
            are not five duplicated anchors on every page. */}
        <nav aria-label="Site information" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {FOOTER_PAGES.map(({ to, label }) => (
            <Link key={to} to={to} className="underline underline-offset-4 hover:opacity-60">
              {label}
            </Link>
          ))}
          <CookieSettingsLink className="underline underline-offset-4 hover:opacity-60" />
        </nav>
        <p className="mt-5 text-xs/5" style={{ color: 'var(--text-muted)' }}>
          {/* Wizards' policy fixes this wording, so not a word of it changes. Which words carry
              the link is ours, though, and spanning the longer phrase keeps this anchor distinct
              from the identical citation in the body of /legal. */}
          MTG Print Proxy is{' '}
          <a
            href="https://company.wizards.com/en/legal/fancontentpolicy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            unofficial Fan Content permitted under the Fan Content Policy
          </a>
          . Not approved/endorsed by Wizards. Portions of the materials used are property of
          Wizards of the Coast. ©Wizards of the Coast LLC. Card data and images from Scryfall.
        </p>
      </div>
    </footer>
  )
}
