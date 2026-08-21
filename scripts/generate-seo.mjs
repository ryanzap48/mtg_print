/**
 * Writes dist/sitemap.xml and dist/robots.txt after a build.
 *
 * Both need absolute URLs, so they are generated rather than committed: the domain comes from
 * SITE_URL (or VITE_SITE_URL), and the routes come from site-routes.json — the same file the
 * nav is built from, so the sitemap cannot list a page that no longer exists.
 */
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const DIST = resolve(ROOT, 'dist')

// Vite loads .env for the client bundle, but this runs as a plain Node process and would not
// otherwise see it. Real environment variables (as set by a host's dashboard) still win.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(resolve(ROOT, file))
  } catch {
    // Missing file, or a Node build without loadEnvFile — env vars alone are then the source.
  }
}

const rawSiteUrl = process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? ''
const siteUrl = rawSiteUrl.trim().replace(/\/+$/, '')

if (!siteUrl) {
  console.error(
    '\n  ✗ SEO files not written: SITE_URL is not set.\n' +
      '    Add SITE_URL=https://your-domain.com to .env (or your host\'s env vars)\n' +
      '    and rebuild. Without it a sitemap would contain the wrong domain.\n',
  )
  process.exit(0)
}
// Guard the shipped placeholder: silently publishing a sitemap full of your-domain.com
// URLs is worse than not publishing one at all.
if (/your-domain\.com|example\.com|YOUR_/i.test(siteUrl)) {
  console.error(
    `\n  ✗ SEO files not written: SITE_URL is still the placeholder ("${rawSiteUrl}").\n` +
      '    Set it to your real domain, e.g. SITE_URL=https://mtgprintproxy.com\n',
  )
  process.exit(0)
}
if (!/^https?:\/\/[^/\s]+$/.test(siteUrl)) {
  console.error(`\n  ✗ SITE_URL looks wrong: "${rawSiteUrl}"\n    Expected something like https://mtgprintproxy.com\n`)
  process.exit(1)
}

/** Last commit date is a more honest lastmod than "whenever this build ran". */
function lastModified() {
  try {
    return execSync('git log -1 --format=%cI', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .slice(0, 10)
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

const routes = JSON.parse(readFileSync(resolve(ROOT, 'site-routes.json'), 'utf8')).filter(
  // Confirmation pages and the like are reachable but are not destinations to rank.
  (r) => r.inSitemap !== false,
)
const lastmod = lastModified()

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap)
writeFileSync(resolve(DIST, 'robots.txt'), robots)

console.log(`\n  ✓ dist/sitemap.xml  ${routes.length} URLs, lastmod ${lastmod}`)
console.log(`  ✓ dist/robots.txt`)
console.log(`  → Submit to Google Search Console: ${siteUrl}/sitemap.xml\n`)
