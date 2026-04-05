/**
 * Rasterize public/logo.svg and public/favicon.svg to PNGs for favicons / social / fallbacks.
 * Run: npm run assets:brand
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

const logoSvg = readFileSync(join(publicDir, 'logo.svg'))
const faviconSvg = readFileSync(join(publicDir, 'favicon.svg'))

await sharp(logoSvg).resize(1200, 600).png().toFile(join(publicDir, 'logo.png'))

await sharp(faviconSvg).resize(32, 32).png().toFile(join(publicDir, 'favicon-32x32.png'))
await sharp(faviconSvg).resize(16, 16).png().toFile(join(publicDir, 'favicon-16x16.png'))
await sharp(faviconSvg).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'))
await sharp(faviconSvg).resize(512, 512).png().toFile(join(publicDir, 'logo-square-512.png'))

console.log('Wrote public/logo.png, favicon-*.png, apple-touch-icon.png, logo-square-512.png')
