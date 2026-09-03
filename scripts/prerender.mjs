/**
 * Renders every route to real HTML after the build, with its own metadata baked in.
 *
 * Two problems this solves, both invisible until you look at what a crawler is actually served:
 *
 *  1. The app is client-rendered, so each route otherwise ships an empty <div id="root"> and
 *     only becomes readable once JavaScript executes. Most crawlers behind AI answers do not
 *     execute it at all.
 *  2. index.html carries one <title> and one description. Copying that file to every route
 *     shipped the *home page's* title on /about, /privacy, /terms and /legal, so the whole site
 *     looked like duplicates of one page, and no page had a canonical URL at all.
 *
 * Metadata comes from site-routes.json, the same file the nav and sitemap are built from, so a
 * page cannot end up described in one place and missing from another.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = resolve(ROOT, 'dist')
const SITE_NAME = 'MTG Print Proxy'
const OG_IMAGE = '/og-image.png'

// Vite loads .env for the client bundle; this is a plain Node process and would not otherwise
// see it. Real environment variables (a host's dashboard) still win.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(resolve(ROOT, file))
  } catch {
    // Missing file, or a Node build without loadEnvFile.
  }
}
const SITE_URL = (process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

const template = readFileSync(resolve(DIST, 'index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) {
  console.error('\n  x Prerender skipped: could not find the empty root div in dist/index.html.\n')
  process.exit(0)
}
if (!/<!--seo:start-->[\s\S]*<!--seo:end-->/.test(template)) {
  console.error('\n  x Prerender skipped: the <!--seo:start--> ... <!--seo:end--> block is missing from index.html.\n')
  process.exit(0)
}

const routes = JSON.parse(readFileSync(resolve(ROOT, 'site-routes.json'), 'utf8'))

// Build the render entry for Node with Vite's own SSR mode, so no extra bundler dependency is
// needed and CSS imports and import.meta.env are handled exactly as in the client build.
const SSR_DIR = resolve(ROOT, '.prerender')
execFileSync(
  'npx',
  ['vite', 'build', '--ssr', 'src/prerender-entry.tsx', '--outDir', SSR_DIR, '--logLevel', 'warn'],
  { cwd: ROOT, stdio: 'inherit' },
)

// The shared asset-naming config applies to this build too, so find the entry rather than
// assuming where it landed.
function findEntry(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, e.name)
    if (e.isDirectory()) {
      const hit = findEntry(full)
      if (hit) return hit
    } else if (/^prerender-entry.*\.(js|mjs)$/.test(e.name)) {
      return full
    }
  }
  return null
}
const entry = findEntry(SSR_DIR)
if (!entry) {
  console.error('\n  x Prerender skipped: the SSR build produced no prerender-entry bundle.\n')
  process.exit(0)
}
const { renderRoute } = await import(pathToFileURL(entry).href)

const escape = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The head for one route. Absolute URLs are omitted rather than faked when SITE_URL is unset. */
function headFor(route) {
  const url = SITE_URL ? `${SITE_URL}${route.path}` : null
  const image = SITE_URL ? `${SITE_URL}${OG_IMAGE}` : null
  const tags = [
    `<title>${escape(route.title)}</title>`,
    `<meta name="description" content="${escape(route.description)}" />`,
  ]
  if (url) tags.push(`<link rel="canonical" href="${escape(url)}" />`)
  // Confirmation pages and 404s are reachable but are not destinations to rank. "follow" still
  // lets link equity flow through them.
  if (route.noindex) tags.push(`<meta name="robots" content="noindex, follow" />`)
  tags.push(
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escape(route.title)}" />`,
    `<meta property="og:description" content="${escape(route.description)}" />`,
    `<meta property="og:locale" content="en_US" />`,
  )
  if (url) tags.push(`<meta property="og:url" content="${escape(url)}" />`)
  if (image) {
    tags.push(
      `<meta property="og:image" content="${escape(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:image:alt" content="${escape(SITE_NAME)}, print a Magic decklist at true card size" />`,
    )
  }
  tags.push(
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(route.title)}" />`,
    `<meta name="twitter:description" content="${escape(route.description)}" />`,
  )
  if (image) tags.push(`<meta name="twitter:image" content="${escape(image)}" />`)
  return tags.map((t) => `    ${t}`).join('\n')
}

let count = 0
for (const route of routes) {
  const markup = renderRoute(route.path)
  const html = template
    .replace(/<!--seo:start-->[\s\S]*<!--seo:end-->/, `<!--seo:start-->\n${headFor(route)}\n    <!--seo:end-->`)
    .replace('<div id="root"></div>', `<div id="root">${markup}</div>`)

  if (route.path === '/') {
    writeFileSync(resolve(DIST, 'index.html'), html)
  } else {
    const out = resolve(DIST, `${route.path.slice(1)}.html`)
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html)
    // Also emit directory-style output so hosts serving /about/ find it either way.
    const dirOut = resolve(DIST, route.path.slice(1), 'index.html')
    mkdirSync(dirname(dirOut), { recursive: true })
    writeFileSync(dirOut, html)
  }
  count++
}

rmSync(SSR_DIR, { recursive: true, force: true })
console.log(`  ✓ prerendered ${count} routes with per-route metadata`)
if (!SITE_URL) {
  console.warn('    ! SITE_URL is unset, so canonical, og:url and og:image were left out.')
}
