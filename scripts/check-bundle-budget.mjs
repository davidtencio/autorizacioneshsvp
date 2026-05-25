import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUDGET_KB = 770
const assetsDir = join(process.cwd(), 'dist', 'assets')
const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith('.js'))

const totalBytes = jsFiles.reduce((acc, file) => acc + statSync(join(assetsDir, file)).size, 0)
const totalKb = totalBytes / 1024

console.log(`[bundle-budget] Total JS: ${totalKb.toFixed(2)} KB (${jsFiles.length} files). Budget: ${BUDGET_KB} KB`)

if (totalKb > BUDGET_KB) {
  console.error(`[bundle-budget] FAILED: exceeded by ${(totalKb - BUDGET_KB).toFixed(2)} KB`)
  process.exit(1)
}

console.log('[bundle-budget] OK')

