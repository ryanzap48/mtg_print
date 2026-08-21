import { useEffect } from 'react'

/**
 * Freezes the page behind an overlay.
 *
 * Setting `overflow: hidden` on <body> alone is not enough: in standards mode the scrolling
 * element is <html>, so the document keeps scrolling underneath. Both elements are locked, and
 * the scroll position is restored on release so reopening does not jump the page.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const { documentElement: html, body } = document
    const previous = { html: html.style.overflow, body: body.style.overflow }
    const y = window.scrollY

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      html.style.overflow = previous.html
      body.style.overflow = previous.body
      window.scrollTo(0, y)
    }
  }, [active])
}
