#!/usr/bin/env node
/**
 * Generate PWA icons from a source PNG using sharp.
 *
 * Output:
 *   apps/medconcierge/public/icons/
 *     icon-72.png ... icon-512.png         (purpose: any)
 *     icon-192-maskable.png, icon-512-maskable.png
 *
 * Maskable icons get extra padding so the safe zone (the 80% center circle
 * required by Android's adaptive icons spec) doesn't clip the logo.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(process.cwd())
const SRC = path.join(ROOT, 'apps/medconcierge/public/logo-transparent.png')
const OUT = path.join(ROOT, 'apps/medconcierge/public/icons')
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const MASKABLE_SIZES = [192, 512]

// Auctorum brand: warm paper bg + cyan accent
const BG = { r: 250, g: 247, b: 242, alpha: 1 }

await mkdir(OUT, { recursive: true })

async function makeIcon(size, maskable = false) {
  // Maskable: pad logo to ~70% of canvas so it survives Android's safe-zone clip
  const innerScale = maskable ? 0.55 : 0.85
  const inner = Math.round(size * innerScale)
  const offset = Math.round((size - inner) / 2)

  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskable ? { r: 8, g: 145, b: 178, alpha: 1 } : BG,
    },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png({ compressionLevel: 9 })

  const buf = await canvas.toBuffer()
  const filename = maskable ? `icon-${size}-maskable.png` : `icon-${size}.png`
  await writeFile(path.join(OUT, filename), buf)
  console.log(`${filename}: ${buf.length} bytes`)
}

for (const size of SIZES) {
  await makeIcon(size, false)
}
for (const size of MASKABLE_SIZES) {
  await makeIcon(size, true)
}

// apple-touch-icon (180x180) for iOS home screen
{
  const appleSize = 180
  const inner = Math.round(appleSize * 0.85)
  const offset = Math.round((appleSize - inner) / 2)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const canvas = sharp({
    create: { width: appleSize, height: appleSize, channels: 4, background: BG },
  })
    .composite([{ input: logo, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
  await writeFile(
    path.join(ROOT, 'apps/medconcierge/public/apple-touch-icon.png'),
    await canvas.toBuffer(),
  )
  console.log('apple-touch-icon.png regenerated')
}

console.log('Done.')
