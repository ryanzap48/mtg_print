import siteRoutes from '../../../site-routes.json'

export interface SiteRoute {
  path: string
  label: string
  inNav: boolean
  /** Sitemap fields. */
  priority: string
  changefreq: string
  /** Per-route document metadata. */
  title: string
  description: string
  /** Omit from sitemap.xml (defaults to included). */
  inSitemap?: boolean
  /** Ask search engines not to index this route (defaults to indexable). */
  noindex?: boolean
}

/** Every public route. Also the source the sitemap is generated from at build time. */
export const SITE_ROUTES = siteRoutes as SiteRoute[]

/** The info pages, in the order they appear in the nav bar and footer. */
export const INFO_PAGES = SITE_ROUTES.filter((r) => r.inNav).map(({ path, label }) => ({
  to: path,
  label,
}))
