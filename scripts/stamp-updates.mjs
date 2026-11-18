// Writes public/trips/updated.json: when each person's CSV last changed (the date of the last git
// commit that touched it; file time if git history is not available). The app shows it under the title.
// Needs full git history on CI (actions/checkout fetch-depth: 0).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { USERS, csvPath } from '../src/data/users.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = path.join(root, 'public')

function lastChange(rel) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', `public/${rel}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (out) return out
  } catch {
    /* no git: fall through */
  }
  return fs.statSync(path.join(pub, rel)).mtime.toISOString()
}

const stamps = Object.fromEntries(USERS.map((u) => [u.id, lastChange(csvPath(u))]))
fs.writeFileSync(path.join(pub, 'trips', 'updated.json'), JSON.stringify(stamps, null, 2) + '\n')
console.log('updated.json', stamps)
