import { useEffect } from 'react'

/**
 * Sets the document title, meta description, and canonical URL for the current route.
 *
 * Done imperatively rather than by rendering <title> in JSX: index.html ships static defaults
 * so crawlers that do not execute JavaScript still see sensible metadata, and mutating those
 * same tags guarantees exactly one of each rather than a second copy appended to <head>.
 */
export function useDocumentMeta({
  title,
  description,
  canonicalPath,
  noindex = false,
}: {
  title: string
  description: string
  canonicalPath: string
  noindex?: boolean
}) {
  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    // og:/twitter: mirrors keep link previews in step with the page you actually shared.
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', absoluteUrl(canonicalPath))
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setCanonical(absoluteUrl(canonicalPath))
    setRobots(noindex)
  }, [title, description, canonicalPath, noindex])
}

function absoluteUrl(path: string): string {
  const base = import.meta.env.VITE_SITE_URL?.replace(/\/+$/, '') || window.location.origin
  return `${base}${path}`
}

function setMeta(keyAttr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${keyAttr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(keyAttr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Added only where it is needed, and removed again on the way out of such a route. */
function setRobots(noindex: boolean) {
  const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (!noindex) {
    existing?.remove()
    return
  }
  const el = existing ?? document.createElement('meta')
  el.setAttribute('name', 'robots')
  el.setAttribute('content', 'noindex, follow')
  if (!existing) document.head.appendChild(el)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}
