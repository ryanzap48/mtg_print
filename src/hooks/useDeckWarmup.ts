import { useEffect } from 'react'
import { prefetchPrintings } from '../lib/scryfall/client'
import { displayImage } from '../lib/deck/slots'
import type { ScryfallCard } from '../lib/scryfall/types'

/** Start loading a card's art this far before it reaches the viewport. */
const LOOKAHEAD_PX = 1600
/** Spacing between printing lookups, comfortably under Scryfall's ten per second. */
const PACE_MS = 200
/** Wait for the visible art to settle before spending bandwidth on anything speculative. */
const START_DELAY_MS = 800

/**
 * Total printing lists to warm for one deck, however far you scroll.
 *
 * Warming a whole 97 card deck was measured and rejected: even paced at six requests a second,
 * around seventy-five of those searches came back stripped of their CORS headers, which is
 * Scryfall refusing a client it considers abusive. The count is the problem, not the rate.
 * This budget covers far more than anyone opens in a sitting, and hovering still warms
 * anything beyond it a moment before the click.
 */
const PRINTINGS_BUDGET = 40

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/**
 * Loads what you are about to look at, before you look at it.
 *
 * Two kinds of work, both driven by how close a card is to the viewport:
 *
 *  - its artwork, fetched early so scrolling never lands on an empty frame. This costs no
 *    extra requests, it only moves them earlier, and the image is identical to the one the
 *    tile will render, so it is a cache hit rather than a second download.
 *  - its printing list, so the version dropdown opens on data already in hand.
 *
 * Everything runs during idle time and stops the moment the deck changes.
 */
export function useDeckWarmup(cards: ScryfallCard[]) {
  // Only a genuinely different deck should restart the walk. Re-rendering for a printing swap
  // or a filter keystroke must not.
  const signature = cards.map((c) => c.oracle_id ?? c.id).join(',')

  useEffect(() => {
    if (!signature) return
    const byIndex = cards
    let cancelled = false
    let spent = 0
    const warmedImages = new Set<string>()
    const queue: ScryfallCard[] = []
    let draining = false
    const win = window as IdleWindow
    let idleHandle: number | undefined
    let cleanupObserver: (() => void) | undefined

    const whenIdle = (fn: () => void) => {
      if (win.requestIdleCallback) idleHandle = win.requestIdleCallback(fn, { timeout: 2000 })
      else idleHandle = window.setTimeout(fn, 0)
    }

    /** Pull the image into the browser cache so the tile paints from memory. */
    const warmImage = (card: ScryfallCard) => {
      const url = displayImage(card)
      if (!url || warmedImages.has(url)) return
      warmedImages.add(url)
      const img = new Image()
      // Must match the rendered tag, or this lands in a separate cache entry and the tile
      // downloads the very same bytes a second time.
      img.crossOrigin = 'anonymous'
      img.decoding = 'async'
      img.src = url
    }

    const drain = () => {
      if (cancelled || draining) return
      const card = queue.shift()
      if (!card) return
      if (spent >= PRINTINGS_BUDGET) return
      draining = true
      spent++
      void prefetchPrintings(card).then((result) => {
        draining = false
        if (cancelled) return
        // A cached card cost nothing, so it should not have cost budget either.
        if (result === 'cached') spent--
        const next = () => whenIdle(drain)
        if (result === 'cached') next()
        else window.setTimeout(next, PACE_MS)
      })
    }

    const start = window.setTimeout(() => {
      const grid = document.querySelector('[data-deck-grid]')
      if (!grid || cancelled) return
      const tiles = [...grid.children]

      const observer = new IntersectionObserver(
        (entries) => {
          if (cancelled) return
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const index = tiles.indexOf(entry.target)
            const card = byIndex[index]
            if (!card) continue
            warmImage(card)
            queue.push(card)
            observer.unobserve(entry.target)
          }
          whenIdle(drain)
        },
        { rootMargin: `${LOOKAHEAD_PX}px 0px` },
      )
      tiles.forEach((t) => observer.observe(t))
      cleanupObserver = () => observer.disconnect()
    }, START_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(start)
      cleanupObserver?.()
      if (idleHandle !== undefined) {
        if (win.cancelIdleCallback) win.cancelIdleCallback(idleHandle)
        else window.clearTimeout(idleHandle)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
}
