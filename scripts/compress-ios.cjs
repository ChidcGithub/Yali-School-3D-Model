// scripts/compress-ios.cjs
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const TILES = [
  'Tile_+000_+001', 'Tile_+000_+002', 'Tile_+000_+003',
  'Tile_+001_+000', 'Tile_+001_+001', 'Tile_+001_+002',
  'Tile_+001_+003', 'Tile_+001_+004', 'Tile_+002_+000',
  'Tile_+002_+001', 'Tile_+002_+002', 'Tile_+002_+003',
  'Tile_+002_+004', 'Tile_+003_+000', 'Tile_+003_+001',
  'Tile_+003_+002', 'Tile_+003_+003', 'Tile_+003_+004',
]

const SRC_DIR = path.resolve('Models/OBJ/Data')
const OUT_DIR = path.resolve('public/ios')

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

let totalOrig = 0, totalNew = 0

for (const [i, tile] of TILES.entries()) {
  const srcDir = path.join(SRC_DIR, tile)
  const obj = path.join(srcDir, `${tile}.obj`)
  const tmpGlb = path.join(OUT_DIR, `${tile}.tmp.glb`)
  const outGlb = path.join(OUT_DIR, `${tile}.glb`)

  if (!fs.existsSync(obj)) { console.warn(`SKIP ${tile}`); continue }

  process.stdout.write(`[${String(i + 1).padStart(2)}/18] ${tile} ... `)

  try {
    execSync(`npx obj2gltf -i "${obj}" -o "${tmpGlb}"`, { stdio: 'pipe', timeout: 300000 })
    execSync(`npx gltf-transform draco "${tmpGlb}" "${outGlb}" --encode-speed 0 --decode-speed 0`, { stdio: 'pipe', timeout: 120000 })
    fs.unlinkSync(tmpGlb)

    const origSize = fs.statSync(obj).size
    const newSize = fs.statSync(outGlb).size
    totalOrig += origSize; totalNew += newSize
    process.stdout.write(`${(origSize/1024/1024).toFixed(1)}MB → ${(newSize/1024/1024).toFixed(1)}MB\n`)
  } catch (e) {
    process.stdout.write(`FAILED\n`)
  }
}

console.log(`\nTotal: ${(totalOrig/1024/1024).toFixed(0)}MB → ${(totalNew/1024/1024).toFixed(0)}MB`)
