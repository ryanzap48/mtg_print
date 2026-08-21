/**
 * Google Analytics 4, gated behind explicit opt-in consent.
 *
 * GA sets `_ga` / `_ga_<id>` cookies and is not "strictly necessary", so under ePrivacy
 * Article 5(3) it needs prior consent in the EU/UK. This module therefore does not load
 * gtag.js at all until the visitor accepts: rejecting means no Google script is ever fetched
 * and no analytics cookie is ever written, which is both the safest reading of the rules and
 * the easiest thing to describe honestly in a privacy policy.
 */

const CONSENT_KEY = 'mtg-print:consent'
/** Set VITE_GA_MEASUREMENT_ID (e.g. "G-XXXXXXXXXX") to enable analytics at all. */
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined

export type ConsentChoice = 'granted' | 'denied'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

/** Analytics only exists as a question to ask if a measurement ID was actually configured. */
export function analyticsAvailable(): boolean {
  return Boolean(GA_ID)
}

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, choice)
  } catch {
    // A blocked localStorage just means we ask again next visit; never throw at the user.
  }
  if (choice === 'granted') loadAnalytics()
  else window.gtag?.('consent', 'update', { analytics_storage: 'denied' })
}

let loaded = false

/** Injects gtag.js. Safe to call repeatedly; only the first call does anything. */
function loadAnalytics() {
  if (loaded || !GA_ID) return
  loaded = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag relies on `arguments` being pushed verbatim, so no rest-parameter rewrite here.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }

  // Consent Mode v2. Advertising signals stay denied permanently, this site does no ads.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  })
  window.gtag('consent', 'update', { analytics_storage: 'granted' })

  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(s)

  window.gtag('js', new Date())
  // GA4 always truncates IP addresses; there is no anonymize_ip flag to set (it is a no-op
  // carried over from Universal Analytics).
  //
  // send_page_view:false hands page-view control entirely to the app. Left on, gtag reports
  // the landing page itself AND reacts to each client-side route change, which, combined
  // with the app's own trackPageView call, recorded every navigated route twice.
  window.gtag('config', GA_ID, { send_page_view: false })
  sendPageView(window.location.pathname, document.title)
}

/**
 * Records a page view for a client-side route change.
 *
 * The automatic page view is switched off in `config`, so every view, including the landing
 * page, is sent from here. Callers must skip the initial render: loadAnalytics() already
 * reports the page that was open when consent was granted.
 */
export function trackPageView(path: string, title: string) {
  if (!loaded) return
  sendPageView(path, title)
}

/**
 * NOTE: GA4's Enhanced Measurement setting "Page changes based on browser history events"
 * ALSO emits a page_view on every client-side navigation, which would double-count each route.
 * It cannot be suppressed from here, it reacts to history.pushState itself, not to this
 * event. Turn it off in GA4: Admin -> Data streams -> your web stream -> Enhanced measurement
 * -> gear icon -> untick "Page changes based on browser history events". Relying on it alone
 * instead of this function was measured to be unreliable, dropping routes entirely.
 */
function sendPageView(path: string, title: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  })
}

/** Re-arms analytics on load for a visitor who already accepted on a previous visit. */
export function initAnalytics() {
  if (getConsent() === 'granted') loadAnalytics()
}
