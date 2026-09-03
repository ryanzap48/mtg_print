/**
 * Rasterises the icon sources into the PNGs browsers actually ask for.
 *
 * Run by hand (`npm run icons`) rather than as part of the build: it needs `rsvg-convert`, which
 * a deploy host will not have, and the icons change about once a year. The output is committed.
 *
 *   brew install librsvg
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'icons', 'icon-square.svg')
const ogSource = join(root, 'icons', 'og-image.svg')
const outDir = join(root, 'public')

/** Each size exists because something specific asks for it. */
const SIZES = [
  { file: 'apple-touch-icon.png', size: 180, why: 'iOS home screen, and Safari start page tiles' },
  { file: 'icon-192.png', size: 192, why: 'Android home screen' },
  { file: 'icon-512.png', size: 512, why: 'Android splash, PWA install' },
]
// Tab icons are covered by favicon.svg and favicon.ico below, so no separate PNGs are needed.

mkdirSync(outDir, { recursive: true })

for (const { file, size, why } of SIZES) {
  const out = join(outDir, file)
  execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', out, source])
  console.log(`  ✓ public/${file}  ${size}x${size}  (${why})`)
}

// 1200x630 is what Facebook, X, LinkedIn, iMessage and Slack all crop toward.
execFileSync('rsvg-convert', [
  '-w', '1200', '-h', '630',
  '-o', join(outDir, 'og-image.png'),
  ogSource,
])
console.log('  ✓ public/og-image.png  1200x630  (link previews when the site is shared)')

writeIco(
  join(outDir, 'favicon.ico'),
  [16, 32, 48].map((size) => {
    const tmp = join(outDir, `.ico-${size}.png`)
    execFileSync('rsvg-convert', ['-w', String(size), '-h', String(size), '-o', tmp, source])
    const png = readFileSync(tmp)
    rmSync(tmp)
    return { size, png }
  }),
)
console.log('  ✓ public/favicon.ico  16+32+48  (anything that requests /favicon.ico blindly)')

/**
 * Writes an .ico wrapping PNGs rather than the old BMP format. Every browser still in use reads
 * PNG-in-ICO, and it keeps the alpha channel that BMP-in-ICO mangles.
 */
function writeIco(path, images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries = []
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width, 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // palette size, 0 for truecolour
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }

  writeFileSync(path, Buffer.concat([header, ...entries, ...images.map((i) => i.png)]))
}
