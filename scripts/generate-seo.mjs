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

/**
 * Crawlers that read pages to answer questions, and the two tokens that govern whether a site
 * may be used to ground AI answers at all.
 *
 * `User-agent: *` already allows every one of these, so the named blocks are not what grants
 * access. They are here because robots.txt gives a named block priority over the wildcard: once
 * one exists, that crawler reads only its own rules, so anyone later adding a `Disallow` under
 * `*` will not silently cut off AI search as a side effect. Google-Extended and
 * Applebot-Extended grant nothing on their own, they only control training and grounding use,
 * and omitting them is read as opting out.
 */
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'DuckAssistBot',
  'meta-externalagent',
  'Amazonbot',
  'cohere-ai',
  'CCBot',
]

const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Assistants and AI search are welcome to read and cite this site.
${AI_AGENTS.map((a) => `User-agent: ${a}`).join('\n')}
Allow: /

# A plain-text summary written for language models: ${siteUrl}/llms.txt

Sitemap: ${siteUrl}/sitemap.xml
`

/**
 * llms.txt, a plain-Markdown summary of the site for language models.
 *
 * A proposed convention rather than a ratified standard, but it costs one generated file and it
 * is the only artefact here that states, in prose an assistant can quote directly, what the tool
 * does and what its answers are. Built from the same sources as the page and the sitemap.
 */
const home = JSON.parse(readFileSync(resolve(ROOT, 'src/content/home.json'), 'utf8'))
const llms = `# MTG Print Proxy

> ${home.tagline}

MTG Print Proxy is a free, browser-based tool that turns a Magic: The Gathering decklist into a
print-ready PDF. Cards are laid out at their true physical size of 63 × 88 mm, nine to a page on
US Letter or A4 and sixteen on Tabloid or A3. Card data and artwork come from the Scryfall API.
There is no server and no account: decklists stay in the browser and the PDF is assembled on the
visitor's own device.

Not affiliated with, endorsed by, or derived from Wizards of the Coast, Scryfall, or any other
proxy-printing service. Printed proxies are for casual playtesting only and are not legal in
sanctioned tournaments.

## Pages

${routes.map((r) => `- [${r.label}](${siteUrl}${r.path}): ${r.description}`).join('\n')}

## How it works

${home.steps.map((s, i) => `${i + 1}. **${s.title}** ${s.body}`).join('\n')}

## Frequently asked questions

${home.faqs.map((f) => `### ${f.q}\n\n${f.a}`).join('\n\n')}
`

writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap)
writeFileSync(resolve(DIST, 'robots.txt'), robots)
writeFileSync(resolve(DIST, 'llms.txt'), llms)

console.log(`\n  ✓ dist/sitemap.xml  ${routes.length} URLs, lastmod ${lastmod}`)
console.log(`  ✓ dist/robots.txt   ${AI_AGENTS.length} AI crawlers allowed explicitly`)
console.log(`  ✓ dist/llms.txt     ${home.faqs.length} Q&As for language models`)
console.log(`  → Submit to Google Search Console: ${siteUrl}/sitemap.xml\n`)
