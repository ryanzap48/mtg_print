# MTG Print Proxy

A mock of [mtgprint.net](https://mtgprint.net). Paste a Magic decklist, pick the printing you want
for each card, and download a PDF laid out 9 to a page at **true card size — 63 × 88 mm**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview  # serve the built output
```

A single-page app with real client-side routes: `/`, `/about`, `/privacy`, `/terms`, `/legal`.

Because those are routes rather than files, the host must serve `index.html` for any unknown
path. Both configs are committed: `vercel.json` (Vercel) and `public/_redirects`
(Netlify / Cloudflare Pages / Render static sites). Without one of them, deep links 404.

Build output is foldered and named: `assets/js/vendor-react-<hash>.js`,
`assets/css/index-<hash>.css`, and so on. The `<hash>` is deliberate — it is what lets these
files be cached indefinitely while still updating the instant their contents change.

## SEO: robots.txt and sitemap.xml

Both are **generated at build time** into `dist/`, from `site-routes.json` — the same file the
nav is built from, so the sitemap can never list a page that no longer exists. Set your domain:

```
SITE_URL=https://your-real-domain.com
```

in `.env` (or your host's environment variables — a real env var overrides `.env`). Then:

```bash
npm run build
#   ✓ dist/sitemap.xml  5 URLs, lastmod 2026-08-19
#   ✓ dist/robots.txt
#   → Submit to Google Search Console: https://your-real-domain.com/sitemap.xml
```

If `SITE_URL` is unset or still the placeholder, the build prints a warning and writes neither
file — a sitemap full of `your-domain.com` URLs is worse than no sitemap. A malformed value
fails the build.

To add a page, add it to `site-routes.json` and `src/App.tsx`; it appears in the nav, the footer,
and the sitemap automatically.

## Analytics (optional, off by default)

Copy `.env.example` to `.env` and set your GA4 measurement ID:

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

With no ID set, no consent banner appears and no Google script is ever loaded. With an ID set,
`gtag.js` is fetched **only after the visitor clicks Accept** — declining means no Google request
and no cookie, ever. Consent Mode v2 defaults are `denied`, advertising signals
(`ad_storage`, `ad_user_data`, `ad_personalization`) stay denied permanently, and the choice is
stored in `localStorage` under `mtg-print:consent`. Visitors can change it via **Cookie settings**
in the footer.

### One GA4 setting you must change

GA4's Enhanced Measurement includes **"Page changes based on browser history events"**, which
emits its own `page_view` on every client-side navigation. The app already sends one per route,
so leaving it on double-counts every page except the landing page (measured: 2 hits per route,
distinct sequence numbers).

Turn it off: **Admin → Data streams → your web stream → Enhanced measurement → gear icon →
untick "Page changes based on browser history events"**.

Relying on that setting *instead* of the app's own tracking was measured and rejected — it
dropped routes entirely (0–1 of 3 navigations recorded).

### Per-route metadata

Title, description, canonical, and og/twitter tags come from `site-routes.json` and are applied
centrally in `RootLayout`. `index.html` keeps static defaults so crawlers that do not execute
JavaScript still see sensible metadata. Adding a route is one entry in that file plus one line
in `src/App.tsx`.

### Before you publish

Replace `YOUR_CONTACT_EMAIL` in `src/components/layout/ArticleLayout.tsx` with a real address — GDPR
expects a reachable data-controller contact — and review the `LAST_UPDATED` date.

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
  main.tsx                     entry: mounts <App/>, arms analytics
  App.tsx                      routes
  routes/                      one component per route
    HomeRoute.tsx              the deck -> PDF tool
    About / Privacy / Terms / Legal / NotFound
  components/
    layout/                    NavBar, SiteFooter, RootLayout, ArticleLayout,
                               ConsentBanner, navigation.ts
    deck/                      DeckInput, DeckSummary, DeckGrid, CardTile,
                               VersionPicker, UnresolvedCards
    print/                     PrintOptionsDialog, PrintActionBar
    ui/                        Prose.tsx - shared typographic primitives
  hooks/
    useDeckResolution.ts       parse + resolve + per-card edits
    usePdfExport.ts            worker handoff and progress
    usePersistentState.ts      useState mirrored into localStorage
  lib/
    deck/                      parseDeck.ts, slots.ts
    scryfall/                  client.ts, cache.ts, types.ts
    print/                     geometry.ts, sheet.ts, exportPdf.ts, types.ts
    analytics.ts
  workers/pdf.worker.ts
  styles/index.css
```

## Legal

**Not for sanctioned play.** The Magic Tournament Rules require Authorized Game Cards to be
"regulation-sized, genuine Magic cards publicly released by Wizards of the Coast" (MTR 3.3).
Printed proxies are not Authorized Game Cards and are prohibited in all sanctioned events. Only a
Head Judge may issue a proxy, and only for a card damaged during that tournament (MTR 3.4). Casual
playtesting, cubes, and Commander pods are up to the group — ask first.

**Personal use only.** Do not sell, trade, or distribute printed proxies, and do not present them
as genuine cards. Selling counterfeit Magic cards infringes Wizards of the Coast's copyrights and
trademarks.

**Image handling.** [Scryfall's data and image guidelines](https://scryfall.com/docs/api) require
that card images are not cropped, distorted, colour-shifted, or overlaid with your own marks, and
that the copyright and artist lines stay visible. Card art is therefore rendered whole and
unmodified, and every UI control sits outside the image rather than on top of it. The app also
leaves the browser's `User-Agent` intact, which is what Scryfall asks of on-page JavaScript.

> MTG Print Proxy is unofficial Fan Content permitted under the
> [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not
> approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the
> Coast. ©Wizards of the Coast LLC.

Magic: The Gathering and all card images are copyright Wizards of the Coast, LLC. Artwork is
copyright its respective artists. This project is not produced by, endorsed by, or affiliated with
Wizards of the Coast, Scryfall, or mtgprint.net.
