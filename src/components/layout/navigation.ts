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
  /**
   * Anchor text for the footer's copy of this link.
   *
   * The nav and the footer link to the same five pages, and using the same word for both means
   * every page carries five duplicated anchors. Distinct text is better for search engines,
   * which read anchor text as a description of the destination, and better for anyone on a
   * screen reader, who otherwise hears "About" twice with nothing to tell the two apart.
   */
  footerLabel?: string
  /** Omit from sitemap.xml (defaults to included). */
  inSitemap?: boolean
  /** Ask search engines not to index this route (defaults to indexable). */
  noindex?: boolean
}

/** Every public route. Also the source the sitemap is generated from at build time. */
export const SITE_ROUTES = siteRoutes as SiteRoute[]

/** The info pages, in the order they appear in the nav bar. */
export const INFO_PAGES = SITE_ROUTES.filter((r) => r.inNav).map(({ path, label }) => ({
  to: path,
  label,
}))

/** The same pages for the footer, under their longer names. */
export const FOOTER_PAGES = SITE_ROUTES.filter((r) => r.inNav).map(({ path, label, footerLabel }) => ({
  to: path,
  label: footerLabel ?? label,
}))
