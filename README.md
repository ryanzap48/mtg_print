# MTG Print Proxy

Paste a Magic decklist, pick the printing you want for each card, and download a print-ready PDF
at **true card size, 63 × 88 mm**, as many per page as the paper allows.

An independent project, built from scratch against the public
[Scryfall API](https://scryfall.com/docs/api). Not affiliated with, endorsed by, or derived from
any other proxy-printing service.

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

## SEO and AI search

Set your domain once:

```
SITE_URL=https://your-real-domain.com
```

in `.env` (or your host's environment variables — a real env var overrides `.env`). It drives
the sitemap, `robots.txt`, `llms.txt`, and every absolute URL in the HTML: canonicals, `og:url`,
`og:image` and the `@id`s in the structured data. `vite.config.ts` mirrors it into
`VITE_SITE_URL` so the app bundle sees the same value; it is the only place the domain is set.

```bash
npm run build
#   ✓ prerendered 7 routes with per-route metadata
#   ✓ dist/sitemap.xml  6 URLs, lastmod 2026-09-03
#   ✓ dist/robots.txt   16 AI crawlers allowed explicitly
#   ✓ dist/llms.txt     10 Q&As for language models
```

If `SITE_URL` is unset or still the placeholder the build says so and writes no SEO files — a
sitemap full of `your-domain.com` URLs is worse than no sitemap. A malformed value fails the
build.

### Every route ships as real HTML, with its own metadata

`scripts/prerender.mjs` renders each route to static HTML and rewrites the block between
`<!--seo:start-->` and `<!--seo:end-->` in `index.html` with that route's title, description,
canonical, og/twitter tags and `robots`. **Editing those tags in `index.html` only affects
`npm run dev`** — the build replaces the whole block.

This existed to fix two things that are invisible unless you look at what a crawler is served:
copying `index.html` to every route shipped the *home page's* title on `/about`, `/privacy`,
`/terms` and `/legal`, so the site looked like five duplicates of one page; and no page had a
canonical URL at all. The home route is prerendered too, so the most important page is no longer
an empty `<div id="root">`.

Metadata comes from `site-routes.json`, the same file the nav and sitemap are built from. To add
a page, add it there and to `src/App.tsx`: nav, footer, sitemap, prerender and metadata all
follow.

### Structured data

`src/components/seo/JsonLd.tsx` renders JSON-LD **into the React tree**, so the prerenderer bakes
it into the static HTML for free. The home page declares `WebSite`, `WebApplication` (free, with
its feature list) and `FAQPage`; prose pages declare a `BreadcrumbList`.

The FAQ text lives in `src/content/home.json` and is the single source for the visible page, the
`FAQPage` markup and `llms.txt`. That is deliberate: marking up answers a visitor cannot see is
cloaking, and drift between the two is the usual way FAQ markup gets a site penalised.

### Written for AI answers too

- **Prerendered HTML.** The crawlers behind AI answers largely do not execute JavaScript, so a
  client-rendered page is invisible to them. This is the single biggest factor.
- **`robots.txt` names 16 AI crawlers explicitly.** `User-agent: *` already allows them, so the
  named blocks are not what grants access — robots.txt gives a named block priority over the
  wildcard, so anyone later adding a `Disallow` under `*` will not silently cut off AI search as
  a side effect. `Google-Extended` and `Applebot-Extended` grant nothing on their own; they only
  govern training and grounding use, and omitting them reads as opting out.
- **`llms.txt`**, a plain-Markdown summary of the site and its Q&As. A proposed convention rather
  than a ratified standard, but it costs one generated file.
- **Answers written to stand alone.** Each FAQ answer is quotable without the surrounding page,
  and states specifics (63 × 88 mm, 744 × 1040 px, 300 DPI, nine per page) rather than adjectives.

## Icons

The favicon used to be an inline `data:` URI, which browser tabs accept but nothing else does:
Safari's start page, the iOS home screen and Android all ignored it and fell back to a grey
letter tile. They want real files at real URLs, so `icons/icon-square.svg` is rasterised into:

| File | Used by |
| --- | --- |
| `favicon.ico` (16+32+48) | anything that requests `/favicon.ico` blindly |
| `favicon.svg` | browser tabs, scales to any density |
| `apple-touch-icon.png` (180) | iOS home screen, **Safari start page tiles** |
| `icon-192.png`, `icon-512.png` | Android home screen and PWA install, via `site.webmanifest` |
| `og-image.png` (1200×630) | link previews in Messages, Slack, X, Facebook, LinkedIn |

The source is deliberately full bleed with square corners: every platform applies its own
rounding, and an icon that rounds itself first ends up with a dark notch inside each corner.

```bash
brew install librsvg   # once
npm run icons          # after editing icons/icon-square.svg
```

Not part of `npm run build`: it needs `rsvg-convert`, which a deploy host will not have. The
generated files are committed.

`theme-color` is `#1c1917` to match the nav bar, which is what sits under Safari's toolbar.

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

`CONTACT_EMAIL` in `src/components/layout/ArticleLayout.tsx` is the address shown on the legal
pages, and GDPR expects it to be a reachable data-controller contact. Review the `LAST_UPDATED`
date there too.

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

### Tokens

Tokens can be listed by name, with or without the word people naturally add:

```
1 Treasure
2 Bird Token
4 Soldier
```

Tokens are "extras" to Scryfall and are missing from every search result unless
`include_extras=true` is passed, which is why a plain lookup for `Treasure` finds nothing at all.
`POST /cards/collection` does not match them by name either, so any line with no set and
collector number that the batch cannot resolve gets a second pass through `lib/scryfall/tokens.ts`.
That pass also prefers a plain one-sided token over a two-sided one carrying the same name on its
back: asked for `Treasure`, Scryfall's own name match returns `Dinosaur // Treasure`.

Lines that *do* give a set and collector number, such as `1 Treasure (THOB) 12`, already resolve
through the ordinary batch and are left alone. Tokens have a `prints_search_uri` like any card,
so the version dropdown works on them too.

Misspelt token names cannot be recovered through the API: `/cards/named?fuzzy=` ignores extras
entirely, and a substring search has nothing to match. So the ~810 distinct token names are paged
out of search once, kept in `localStorage` for a week, and matched locally. The distance measure
counts a swap of two neighbouring letters as one mistake, which is what recovers `Brid` → `Bird`,
and a candidate has to be genuinely close to appear at all, so a misspelt *card* like `Sol Rng`
offers no tokens rather than the least-distant of eight hundred unrelated ones.

In the search results for a line that would not resolve, cards and tokens are kept in separate
tabs: `Bird` is both several real cards and a token, and merging them buries whichever was meant.

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
- Every search goes through `lib/scryfall/pace.ts`, which spaces requests **across all callers**
  rather than within each one. A card search and a token search run concurrently and know nothing
  about each other, so two individually polite chains still interleave into an impolite burst.
  Only each request's *start* is held back, so calls still overlap in flight. Measured against the
  live API, a sustained 8 req/s earns a 429 and the penalty is a flat minute-long ban rather than
  a brief pause, so the gap is 300 ms rather than the documented 50–100 ms; a search is one or two
  requests, so this is invisible in use. A 429 is retried once if `Retry-After` is short, and it
  pushes back everything still queued behind it.
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
    scryfall/                  client.ts, tokens.ts, pace.ts, cache.ts, types.ts
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
