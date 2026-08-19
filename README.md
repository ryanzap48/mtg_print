# MTG Print

A mock of [mtgprint.net](https://mtgprint.net). Paste a Magic decklist, pick the printing you want
for each card, and download a PDF laid out 9 to a page at **true card size — 63 × 88 mm**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

There is no backend. Both `api.scryfall.com` and the image CDN `cards.scryfall.io` send
`access-control-allow-origin: *`, so everything — lookup, art, and PDF assembly — happens in the
browser. `dist/` is plain static files and can be hosted anywhere.

## Decklist format

MTG Arena / Moxfield exports, one card per line:

```
1 Deserted Temple (MH3) 301 *F*
4 Snow-Covered Plains (MH1) 250
1 Esper Sentinel (PLST) MH2-12
1 Emeria's Call / Emeria, Shattered Skyclave (ZNR) 12
1 Sol Ring
```

- `(SET) number` is the authoritative key. Names are only used for display, or as a fallback
  identifier when a line has no set — which is why names containing commas and slashes need no
  special handling.
- Odd collector numbers work as-is: `MH2-12`, `jf135`, `11p`, `1p`.
- `*F*` marks a foil. Foiling does not change the artwork, so it never changes the image; it only
  preselects a foil printing where one exists.
- `Deck` / `Sideboard` / `Commander` headers, `//` comments, and Arena's `About` block are skipped.

## How cards become pages

`src/lib/slots.ts` flattens the deck into the list of images actually printed: `qty` copies of
each card, with a double-faced card's back placed immediately after its front so the pair lands
side by side.

A card is treated as double-faced **only when its second face has its own image**
(`card_faces[1].image_uris`). Testing for the image rather than for a slash in the name or a
layout whitelist is what keeps these straight:

| Card | Layout | Result |
| --- | --- | --- |
| `Emeria's Call // Emeria, Shattered Skyclave` | `modal_dfc` | two slots |
| `Ishgard, the Holy See / Faith & Grief` | `adventure` | **one** slot |
| `Urza's Saga` | `saga` | **one** slot |

## Print geometry

A Magic card is 63 × 88 mm. The commonly quoted 2.5″ × 3.5″ is a rounding — 63 mm is 2.480″, and
printing at 2.5″ makes cards visibly too wide for a sleeve.

Scryfall's `png` image is 744 × 1040 px, which is exactly 300 DPI at that size (744 ÷ 2.480″ =
300), so art maps 1:1 with no upscaling.

|  | Page | Margins around the 3×3 grid |
| --- | --- | --- |
| US Letter | 215.9 × 279.4 mm | 13.4 × 7.7 mm |
| A4 | 210 × 297 mm | 10.5 × 16.5 mm |

> **Print at “Actual size” / 100%, never “Fit to page.”** Fitting silently shrinks the sheet and
> the cards will not fit sleeves.

## Print options

- **Paper** — US Letter or A4. Both fit 3×3 with room to spare.
- **Cut guides** — crop marks in the margins (no ink lands on a card), full grid lines, or none.
- **Image quality** — *Compact* re-encodes to JPEG q92; *Maximum* embeds the original PNGs. For a
  100-card deck that is roughly 26 MB vs 109 MB, with no visible difference at 300 DPI.
- **Bleed edge** — scales each card 2% so a slightly off-centre cut leaves no white edge.

## Notes on the Scryfall integration

- Lookups go through `POST /cards/collection`, **75 identifiers max per request**, so a 97-card
  deck costs two requests. Identical cards are deduplicated first, so `4 Snow-Covered Plains` takes
  one slot in the batch rather than four.
- Printings for the version dropdown are fetched **lazily on first interaction** with a card's
  dropdown. Prefetching would mean ~100 extra requests for a control most cards never open.
- Card JSON and printing lists are cached in IndexedDB, so resubmitting a deck resolves with no
  network traffic.
- The app deliberately does **not** set a `User-Agent` header — browsers forbid it, and Scryfall's
  CORS policy is fully open. (Calling the API from Node *does* require one; Scryfall rejects
  undici's default UA with a 400.)
- The PDF is assembled in a Web Worker (`src/workers/pdf.worker.ts`) so a ~100 MB download-decode-
  re-encode pass never blocks the UI. Each unique image is embedded once and drawn N times, so
  file size scales with distinct art rather than card count.

## Layout

```
src/
  lib/
    parseDeck.ts   Arena/Moxfield parser
    scryfall.ts    batch resolve, lazy printings, rate limiting
    cache.ts       IndexedDB via idb-keyval
    slots.ts       deck -> printable slots (double-faced handling)
    geometry.ts    card/page maths in PDF points
    sheet.ts       3x3 placement + cut marks (no I/O, so it is testable)
    pdf.ts         worker wrapper + download
  components/      DeckInput, CardGrid tiles, VersionPicker, PrintOptionsDialog, UnresolvedList
  workers/         pdf.worker.ts
```

Proxies are for playtesting, cubes, and Commander pods that allow them — not for sanctioned play
or resale.
