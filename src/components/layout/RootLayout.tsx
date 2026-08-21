import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { SITE_ROUTES } from './navigation'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'
import { trackPageView } from '../../lib/analytics'
import { SiteFooter } from './SiteFooter'
import { ConsentBanner } from './ConsentBanner'
import { DeckSessionProvider } from '../../state/DeckSession'

/** Chrome shared by every route: nav, footer, and the analytics consent gate. */
export function RootLayout() {
  const title = useRouteMeta()
  useAnalyticsPageViews(title)
  return (
    <DeckSessionProvider>
      <ScrollToTop />
      <NavBar />
      <Outlet />
      <SiteFooter />
      <ConsentBanner />
    </DeckSessionProvider>
  )
}

/** Drives document metadata from the same manifest the nav and sitemap are built from. */
function useRouteMeta() {
  const { pathname } = useLocation()
  const route = SITE_ROUTES.find((r) => r.path === pathname)
  const title = route?.title ?? 'Page not found | MTG Print Proxy'
  useDocumentMeta({
    title,
    description: route?.description ?? 'That page does not exist on MTG Print Proxy.',
    canonicalPath: route?.path ?? pathname,
    // Unknown paths are 404s, which should not be indexed either.
    noindex: route ? route.noindex === true : true,
  })
  return title
}

/**
 * Sends a page_view on each route change. The first render is skipped: gtag('config') already
 * reports the landing page, and counting it again would inflate every session by one.
 */
function useAnalyticsPageViews(title: string) {
  const { pathname } = useLocation()
  const isInitial = useRef(true)
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
      return
    }
    trackPageView(pathname, title)
  }, [pathname, title])
}

/**
 * A client-side navigation keeps the previous scroll position, which lands you halfway down a
 * legal page. Reset on path change, but leave hash links alone so #anchors still work.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
