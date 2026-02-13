/**
 * PWA Icon Generator Script
 *
 * This script generates PNG icons from the SVG source for PWA manifest.
 * Run with: npx tsx scripts/generate-pwa-icons.ts
 *
 * Prerequisites:
 * - sharp: npm install -D sharp @types/sharp
 *
 * Or use an online tool like:
 * - https://www.pwabuilder.com/imageGenerator
 * - https://realfavicongenerator.net/
 *
 * Required icon sizes for PWA:
 * - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
 * - Plus a maskable icon at 512x512
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const PUBLIC_DIR = join(process.cwd(), 'public')
const ICONS_DIR = join(PUBLIC_DIR, 'icons')

// Simple SVG icon generator for the app
function generateSVGIcon(size: number, maskable = false): string {
  const padding = maskable ? size * 0.1 : 0
  const contentSize = size - padding * 2
  const fontSize = contentSize * 0.14

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <g transform="translate(${padding}, ${padding})">
    <text x="${contentSize / 2}" y="${contentSize * 0.35}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#22c55e">WORK</text>
    <text x="${contentSize / 2}" y="${contentSize * 0.55}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#ef4444">DIE</text>
    <text x="${contentSize / 2}" y="${contentSize * 0.75}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#3b82f6">RETIRE</text>
  </g>
</svg>`
}

async function main() {
  console.log('Generating PWA icons...')

  // Ensure icons directory exists
  if (!existsSync(ICONS_DIR)) {
    mkdirSync(ICONS_DIR, { recursive: true })
  }

  // Check if sharp is available
  let useSharp = false
  try {
    require.resolve('sharp')
    useSharp = true
  } catch {
    console.log('Sharp not found. Generating SVG icons only.')
    console.log('Install sharp for PNG generation: npm install -D sharp @types/sharp')
  }

  if (useSharp) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp')

    for (const size of ICON_SIZES) {
      const svg = generateSVGIcon(size)
      const pngPath = join(ICONS_DIR, `icon-${size}x${size}.png`)

      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(pngPath)

      console.log(`Generated: icon-${size}x${size}.png`)
    }

    // Generate maskable icon
    const maskableSvg = generateSVGIcon(512, true)
    await sharp(Buffer.from(maskableSvg))
      .resize(512, 512)
      .png()
      .toFile(join(ICONS_DIR, 'maskable-icon-512x512.png'))

    console.log('Generated: maskable-icon-512x512.png')

    // Generate shortcut icon
    const shortcutSvg = generateSVGIcon(96)
    await sharp(Buffer.from(shortcutSvg))
      .resize(96, 96)
      .png()
      .toFile(join(ICONS_DIR, 'shortcut-calc.png'))

    console.log('Generated: shortcut-calc.png')

  } else {
    // Generate SVG files as fallback
    for (const size of ICON_SIZES) {
      const svg = generateSVGIcon(size)
      const svgPath = join(ICONS_DIR, `icon-${size}x${size}.svg`)
      writeFileSync(svgPath, svg)
      console.log(`Generated: icon-${size}x${size}.svg (SVG fallback)`)
    }

    // Maskable
    const maskableSvg = generateSVGIcon(512, true)
    writeFileSync(join(ICONS_DIR, 'maskable-icon-512x512.svg'), maskableSvg)
    console.log('Generated: maskable-icon-512x512.svg (SVG fallback)')

    console.log('\nNote: For production, convert these SVGs to PNG using:')
    console.log('1. Install sharp: npm install -D sharp @types/sharp')
    console.log('2. Run this script again')
    console.log('Or use https://www.pwabuilder.com/imageGenerator')
  }

  console.log('\nDone!')
}

main().catch(console.error)
