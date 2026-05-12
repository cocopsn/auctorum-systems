// Best-effort dead-component finder. Iterates every .tsx under
// apps/medconcierge/src/components and looks for the basename in
// any other .ts/.tsx file under apps/medconcierge/src. Reports
// files with zero external references.
//
// Run with: node scripts/find-dead-components.mjs

import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.argv[2] || 'apps/medconcierge/src'
const COMPONENTS = `${ROOT}/components`

function walk(dir, exts) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...walk(full, exts))
    } else if (exts.some((e) => entry.endsWith(e))) {
      out.push(full.replace(/\\/g, '/'))
    }
  }
  return out
}

const components = walk(COMPONENTS, ['.tsx']).filter(
  (p) => !p.endsWith('index.tsx'),
)
const allSrc = walk(ROOT, ['.ts', '.tsx'])

// Build name → contents map once.
const contents = new Map()
for (const f of allSrc) contents.set(f, readFileSync(f, 'utf-8'))

const dead = []
for (const comp of components) {
  // Use the file basename (without extension) as the search token.
  const base = comp.split('/').pop().replace(/\.tsx$/, '')
  // Skip very generic names — too many false negatives.
  if (base.length < 4) continue
  let referenced = false
  for (const [path, body] of contents) {
    if (path === comp) continue
    if (body.includes(base)) {
      referenced = true
      break
    }
  }
  if (!referenced) dead.push(comp)
}

if (dead.length === 0) {
  console.log('NO DEAD COMPONENTS')
} else {
  console.log(`Found ${dead.length} potentially dead components:`)
  for (const d of dead) console.log(`  ${d}`)
}
