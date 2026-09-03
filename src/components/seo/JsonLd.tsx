import { FAQS } from '../../content/home'

/**
 * Schema.org structured data, rendered into the React tree rather than injected from a script.
 *
 * Putting it here means the prerenderer bakes it into the static HTML for free, so a crawler
 * that never executes JavaScript still sees it. That matters more than it used to: the crawlers
 * behind AI answers largely do not run scripts, and structured data is the most reliable way to
 * state plainly what this page is and what it answers.
 */

const SITE_NAME = 'MTG Print Proxy'

function siteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.replace(/\/+$/, '')
  if (configured) return configured
  return typeof window === 'undefined' ? '' : window.location.origin
}

function Graph({ nodes }: { nodes: unknown[] }) {
  return (
    <script
      type="application/ld+json"
      // React escapes text nodes, which would corrupt the JSON. The content is built from our
      // own constants, never from user input, so there is nothing here to inject.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }),
      }}
    />
  )
}

/** Describes the tool itself, and the questions the page answers. */
export function HomeJsonLd() {
  const base = siteUrl()
  return (
    <Graph
      nodes={[
        {
          '@type': 'WebSite',
          '@id': `${base}/#website`,
          url: `${base}/`,
          name: SITE_NAME,
          inLanguage: 'en',
          description:
            'A free tool that turns a Magic: The Gathering decklist into a print-ready proxy PDF at true card size.',
        },
        {
          '@type': 'WebApplication',
          '@id': `${base}/#app`,
          name: SITE_NAME,
          url: `${base}/`,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any, runs in a web browser',
          browserRequirements: 'Requires JavaScript',
          description:
            'Turns a Magic: The Gathering decklist into a print-ready PDF with the cards at true size, 63 × 88 mm, nine to a page.',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList: [
            'Paste an MTG Arena or Moxfield decklist',
            'Choose any printing or artwork for each card',
            'True 63 × 88 mm card size at 300 DPI',
            'Nine cards per page on US Letter and A4, sixteen on Tabloid and A3',
            'Double-faced cards print both faces',
            'Token support',
            'Crop marks, bleed edge and a printer calibration sheet',
          ],
          isPartOf: { '@id': `${base}/#website` },
        },
        {
          '@type': 'FAQPage',
          '@id': `${base}/#faq`,
          isPartOf: { '@id': `${base}/#website` },
          mainEntity: FAQS.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a },
          })),
        },
      ]}
    />
  )
}

/** A trail for the prose routes, so results show About rather than a bare URL. */
export function BreadcrumbJsonLd({ label, path }: { label: string; path: string }) {
  const base = siteUrl()
  return (
    <Graph
      nodes={[
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
            { '@type': 'ListItem', position: 2, name: label, item: `${base}${path}` },
          ],
        },
      ]}
    />
  )
}
