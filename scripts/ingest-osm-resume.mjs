/**
 * Resume OSM ingestion - runs missing states only.
 * Usage: node scripts/ingest-osm-resume.mjs
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import { config } from 'dotenv'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env.local') })

const sql = postgres(process.env.DATABASE_URL, { max: 1 })
const done = await sql`SELECT DISTINCT state FROM national_vendors`
await sql.end()

const doneStates = new Set(done.map(r => r.state))

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

const missing = ALL_STATES.filter(s => !doneStates.has(s))
console.log(`Already done: ${[...doneStates].join(', ')}`)
console.log(`Remaining: ${missing.length} states`)
console.log()

// Run states one at a time to avoid rate limits
for (const state of missing) {
  await new Promise((resolve) => {
    const proc = spawn('node', ['scripts/ingest-osm-specialty-vendors.mjs', '--state', state], {
      stdio: 'inherit',
      env: process.env,
    })
    proc.on('close', resolve)
  })
  // Wait 8 seconds between states
  await new Promise(r => setTimeout(r, 8000))
}

console.log('\nAll states complete.')
