// Builds app icons and mascot assets from the source render in assets-src/.
import sharp from 'sharp'

const SRC = 'assets-src/penny-3d.png'
const BLINK = 'assets-src/penny-3d-blink.png'

// Mascot, sized for retina phones (rendered at ~220pt wide max). Kept small because it's
// the first thing on screen: index.html preloads both frames before any JS runs.
for (const [src, out] of [[SRC, 'penny.webp'], [BLINK, 'penny-blink.webp']]) {
  await sharp(src).resize({ width: 540 }).webp({ quality: 80, alphaQuality: 90, effort: 6 }).toFile(`public/${out}`)
}

// Icon: Penny's head on a warm meadow-sunrise tile.
const bg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE3A8"/><stop offset="1" stop-color="#FFC774"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
  <ellipse cx="50" cy="112" rx="80" ry="34" fill="#4CC38A"/>
  <ellipse cx="50" cy="118" rx="70" ry="30" fill="#2FA86F"/>
</svg>`)

async function icon(size, scale, out) {
  // crop to the head + upper wool
  const head = await sharp(SRC).extract({ left: 120, top: 0, width: 690, height: 600 }).toBuffer()
  const w = Math.round(size * scale)
  const headImg = await sharp(head).resize({ width: w }).toBuffer()
  const meta = await sharp(headImg).metadata()
  await sharp(bg(size))
    .composite([{ input: headImg, left: Math.round((size - w) / 2), top: Math.max(0, size - meta.height) }])
    .png()
    .toFile(`public/${out}`)
}

await icon(512, 0.92, 'icon-512.png')
await icon(192, 0.92, 'icon-192.png')
await icon(180, 0.92, 'apple-touch-icon.png')
await icon(64, 0.95, 'favicon.png')
await icon(512, 0.7, 'icon-maskable-512.png')
console.log('icons done')
