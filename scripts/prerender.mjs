/**
 * Renders the static prose routes to real HTML after the build.
 *
 * The app is client-rendered, so /about and friends otherwise ship an empty <div id="root">
 * and only become readable once JavaScript executes. Baking their markup into the HTML means
 * crawlers, link previews and no-JS visitors see the actual text, and the sitemap points at
 * pages with content rather than shells.
 *
 * Only the prose routes are prerendered. The home route reads localStorage while rendering,
 * which has no meaning on a server, and its value is entirely interactive anyway.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = resolve(ROOT, 'dist')
const ROUTES = ['/about', '/privacy', '/terms', '/legal']

const template = readFileSync(resolve(DIST, 'index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) {
  console.error('\n  x Prerender skipped: could not find the empty root div in dist/index.html.\n')
  process.exit(0)
}

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

let count = 0
for (const route of ROUTES) {
  const markup = renderRoute(route)
  const html = template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
  const out = resolve(DIST, `${route.slice(1)}.html`)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, html)
  // Also emit directory-style output so hosts serving /about/ find it either way.
  const dirOut = resolve(DIST, route.slice(1), 'index.html')
  mkdirSync(dirname(dirOut), { recursive: true })
  writeFileSync(dirOut, html)
  count++
}

rmSync(SSR_DIR, { recursive: true, force: true })
console.log(`  ✓ prerendered ${count} routes to static HTML`)
