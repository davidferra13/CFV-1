#!/usr/bin/env node

// Geofabrik Global Bulk Importer - Phase 1 acquisition.
// Downloads per-region OSM extracts from Geofabrik, streams each through
// filtering for food businesses, stores findings LOCALLY on the Pi.
// NO automatic sync to Supabase. Data moves only when you say so.
//
// After completion, auto-starts OpenClaw for long-tail crawling.
//
// Usage:
//   node geofabrik-import.mjs              # Full run: all regions, local only
//   node geofabrik-import.mjs --sync-only  # Manual push to Supabase (you trigger this)
//   DRY_RUN=1 node geofabrik-import.mjs   # Parse but don't write files

import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FINDINGS_DIR = join(__dirname, 'crawler_findings')
const DATA_DIR = join(__dirname, 'data')
const PROGRESS_FILE = join(DATA_DIR, 'geofabrik-progress.json')
const LOG_FILE = join(__dirname, 'geofabrik-import.log')

const DRY_RUN = process.env.DRY_RUN === '1'
const SYNC_ONLY = process.argv.includes('--sync-only')

const GEOFABRIK_BASE = 'https://download.geofabrik.de'

// Same food tags as OpenClaw's Overpass queries
const FOOD_AMENITIES = new Set([
  'restaurant', 'cafe', 'fast_food', 'ice_cream',
  'bar', 'pub', 'food_court', 'biergarten'
])
const FOOD_SHOPS = new Set([
  'bakery', 'pastry', 'confectionery', 'deli', 'butcher',
  'cheese', 'chocolate', 'coffee', 'tea', 'seafood', 'farm'
])

// ─── Global region registry ────────────────────────────────────────────────
// Each entry: { code, slug, name, path }
// code = directory name under crawler_findings/
// slug = Geofabrik filename slug
// path = URL path segment (continent/subregion)
// For US states: code = "US/MA", stored as crawler_findings/US/MA/
// For countries: code = "FR", stored as crawler_findings/FR/

const REGIONS = [
  // ── US States (highest priority) ──────────────────────────────────────
  ...buildUSStates(),
  // ── Rest of North America ─────────────────────────────────────────────
  { code: 'CA_COUNTRY', slug: 'canada', name: 'Canada', path: 'north-america' },
  { code: 'MX', slug: 'mexico', name: 'Mexico', path: 'north-america' },
  { code: 'GL', slug: 'greenland', name: 'Greenland', path: 'north-america' },
  // ── Central America ───────────────────────────────────────────────────
  { code: 'BZ', slug: 'belize', name: 'Belize', path: 'central-america' },
  { code: 'CR', slug: 'costa-rica', name: 'Costa Rica', path: 'central-america' },
  { code: 'CU', slug: 'cuba', name: 'Cuba', path: 'central-america' },
  { code: 'SV', slug: 'el-salvador', name: 'El Salvador', path: 'central-america' },
  { code: 'GT', slug: 'guatemala', name: 'Guatemala', path: 'central-america' },
  { code: 'HT_DO', slug: 'haiti-and-domrep', name: 'Haiti & Dominican Republic', path: 'central-america' },
  { code: 'HN', slug: 'honduras', name: 'Honduras', path: 'central-america' },
  { code: 'JM', slug: 'jamaica', name: 'Jamaica', path: 'central-america' },
  { code: 'NI', slug: 'nicaragua', name: 'Nicaragua', path: 'central-america' },
  { code: 'PA', slug: 'panama', name: 'Panama', path: 'central-america' },
  { code: 'BS', slug: 'bahamas', name: 'Bahamas', path: 'central-america' },
  // ── South America ─────────────────────────────────────────────────────
  { code: 'AR', slug: 'argentina', name: 'Argentina', path: 'south-america' },
  { code: 'BO', slug: 'bolivia', name: 'Bolivia', path: 'south-america' },
  { code: 'BR', slug: 'brazil', name: 'Brazil', path: 'south-america' },
  { code: 'CL', slug: 'chile', name: 'Chile', path: 'south-america' },
  { code: 'CO', slug: 'colombia', name: 'Colombia', path: 'south-america' },
  { code: 'EC', slug: 'ecuador', name: 'Ecuador', path: 'south-america' },
  { code: 'GY', slug: 'guyana', name: 'Guyana', path: 'south-america' },
  { code: 'PY', slug: 'paraguay', name: 'Paraguay', path: 'south-america' },
  { code: 'PE', slug: 'peru', name: 'Peru', path: 'south-america' },
  { code: 'SR', slug: 'suriname', name: 'Suriname', path: 'south-america' },
  { code: 'UY', slug: 'uruguay', name: 'Uruguay', path: 'south-america' },
  { code: 'VE', slug: 'venezuela', name: 'Venezuela', path: 'south-america' },
  // ── Europe ────────────────────────────────────────────────────────────
  { code: 'AL', slug: 'albania', name: 'Albania', path: 'europe' },
  { code: 'AD', slug: 'andorra', name: 'Andorra', path: 'europe' },
  { code: 'AT', slug: 'austria', name: 'Austria', path: 'europe' },
  { code: 'BY', slug: 'belarus', name: 'Belarus', path: 'europe' },
  { code: 'BE', slug: 'belgium', name: 'Belgium', path: 'europe' },
  { code: 'BA', slug: 'bosnia-herzegovina', name: 'Bosnia-Herzegovina', path: 'europe' },
  { code: 'BG', slug: 'bulgaria', name: 'Bulgaria', path: 'europe' },
  { code: 'HR', slug: 'croatia', name: 'Croatia', path: 'europe' },
  { code: 'CY', slug: 'cyprus', name: 'Cyprus', path: 'europe' },
  { code: 'CZ', slug: 'czech-republic', name: 'Czech Republic', path: 'europe' },
  { code: 'DK', slug: 'denmark', name: 'Denmark', path: 'europe' },
  { code: 'EE', slug: 'estonia', name: 'Estonia', path: 'europe' },
  { code: 'FI', slug: 'finland', name: 'Finland', path: 'europe' },
  { code: 'FR', slug: 'france', name: 'France', path: 'europe' },
  { code: 'GE', slug: 'georgia', name: 'Georgia', path: 'europe' },
  { code: 'DE', slug: 'germany', name: 'Germany', path: 'europe' },
  { code: 'GR', slug: 'greece', name: 'Greece', path: 'europe' },
  { code: 'HU', slug: 'hungary', name: 'Hungary', path: 'europe' },
  { code: 'IS', slug: 'iceland', name: 'Iceland', path: 'europe' },
  { code: 'IE_GB_NI', slug: 'ireland-and-northern-ireland', name: 'Ireland & N. Ireland', path: 'europe' },
  { code: 'IT', slug: 'italy', name: 'Italy', path: 'europe' },
  { code: 'XK', slug: 'kosovo', name: 'Kosovo', path: 'europe' },
  { code: 'LV', slug: 'latvia', name: 'Latvia', path: 'europe' },
  { code: 'LI', slug: 'liechtenstein', name: 'Liechtenstein', path: 'europe' },
  { code: 'LT', slug: 'lithuania', name: 'Lithuania', path: 'europe' },
  { code: 'LU', slug: 'luxembourg', name: 'Luxembourg', path: 'europe' },
  { code: 'MK', slug: 'macedonia', name: 'North Macedonia', path: 'europe' },
  { code: 'MT', slug: 'malta', name: 'Malta', path: 'europe' },
  { code: 'MD', slug: 'moldova', name: 'Moldova', path: 'europe' },
  { code: 'MC', slug: 'monaco', name: 'Monaco', path: 'europe' },
  { code: 'ME', slug: 'montenegro', name: 'Montenegro', path: 'europe' },
  { code: 'NL', slug: 'netherlands', name: 'Netherlands', path: 'europe' },
  { code: 'NO', slug: 'norway', name: 'Norway', path: 'europe' },
  { code: 'PL', slug: 'poland', name: 'Poland', path: 'europe' },
  { code: 'PT', slug: 'portugal', name: 'Portugal', path: 'europe' },
  { code: 'RO', slug: 'romania', name: 'Romania', path: 'europe' },
  { code: 'RS', slug: 'serbia', name: 'Serbia', path: 'europe' },
  { code: 'SK', slug: 'slovakia', name: 'Slovakia', path: 'europe' },
  { code: 'SI', slug: 'slovenia', name: 'Slovenia', path: 'europe' },
  { code: 'ES', slug: 'spain', name: 'Spain', path: 'europe' },
  { code: 'SE', slug: 'sweden', name: 'Sweden', path: 'europe' },
  { code: 'CH', slug: 'switzerland', name: 'Switzerland', path: 'europe' },
  { code: 'TR', slug: 'turkey', name: 'Turkey', path: 'europe' },
  { code: 'UA', slug: 'ukraine', name: 'Ukraine', path: 'europe' },
  { code: 'GB', slug: 'great-britain', name: 'Great Britain', path: 'europe' },
  // ── Russia (root-level on Geofabrik) ──────────────────────────────────
  { code: 'RU', slug: 'russia', name: 'Russia', path: '' },
  // ── Asia ──────────────────────────────────────────────────────────────
  { code: 'AF', slug: 'afghanistan', name: 'Afghanistan', path: 'asia' },
  { code: 'AM', slug: 'armenia', name: 'Armenia', path: 'asia' },
  { code: 'AZ', slug: 'azerbaijan', name: 'Azerbaijan', path: 'asia' },
  { code: 'BD', slug: 'bangladesh', name: 'Bangladesh', path: 'asia' },
  { code: 'BT', slug: 'bhutan', name: 'Bhutan', path: 'asia' },
  { code: 'KH', slug: 'cambodia', name: 'Cambodia', path: 'asia' },
  { code: 'CN', slug: 'china', name: 'China', path: 'asia' },
  { code: 'GCC', slug: 'gcc-states', name: 'GCC States', path: 'asia' },
  { code: 'IN', slug: 'india', name: 'India', path: 'asia' },
  { code: 'ID', slug: 'indonesia', name: 'Indonesia', path: 'asia' },
  { code: 'IR', slug: 'iran', name: 'Iran', path: 'asia' },
  { code: 'IQ', slug: 'iraq', name: 'Iraq', path: 'asia' },
  { code: 'IL_PS', slug: 'israel-and-palestine', name: 'Israel & Palestine', path: 'asia' },
  { code: 'JP', slug: 'japan', name: 'Japan', path: 'asia' },
  { code: 'JO', slug: 'jordan', name: 'Jordan', path: 'asia' },
  { code: 'KZ', slug: 'kazakhstan', name: 'Kazakhstan', path: 'asia' },
  { code: 'KG', slug: 'kyrgyzstan', name: 'Kyrgyzstan', path: 'asia' },
  { code: 'LA', slug: 'laos', name: 'Laos', path: 'asia' },
  { code: 'LB', slug: 'lebanon', name: 'Lebanon', path: 'asia' },
  { code: 'MY_SG_BN', slug: 'malaysia-singapore-brunei', name: 'Malaysia, Singapore & Brunei', path: 'asia' },
  { code: 'MV', slug: 'maldives', name: 'Maldives', path: 'asia' },
  { code: 'MN', slug: 'mongolia', name: 'Mongolia', path: 'asia' },
  { code: 'MM', slug: 'myanmar', name: 'Myanmar', path: 'asia' },
  { code: 'NP', slug: 'nepal', name: 'Nepal', path: 'asia' },
  { code: 'KP', slug: 'north-korea', name: 'North Korea', path: 'asia' },
  { code: 'PK', slug: 'pakistan', name: 'Pakistan', path: 'asia' },
  { code: 'PH', slug: 'philippines', name: 'Philippines', path: 'asia' },
  { code: 'KR', slug: 'south-korea', name: 'South Korea', path: 'asia' },
  { code: 'LK', slug: 'sri-lanka', name: 'Sri Lanka', path: 'asia' },
  { code: 'SY', slug: 'syria', name: 'Syria', path: 'asia' },
  { code: 'TW', slug: 'taiwan', name: 'Taiwan', path: 'asia' },
  { code: 'TJ', slug: 'tajikistan', name: 'Tajikistan', path: 'asia' },
  { code: 'TH', slug: 'thailand', name: 'Thailand', path: 'asia' },
  { code: 'TL', slug: 'east-timor', name: 'East Timor', path: 'asia' },
  { code: 'TM', slug: 'turkmenistan', name: 'Turkmenistan', path: 'asia' },
  { code: 'UZ', slug: 'uzbekistan', name: 'Uzbekistan', path: 'asia' },
  { code: 'VN', slug: 'vietnam', name: 'Vietnam', path: 'asia' },
  { code: 'YE', slug: 'yemen', name: 'Yemen', path: 'asia' },
  // ── Africa ────────────────────────────────────────────────────────────
  { code: 'DZ', slug: 'algeria', name: 'Algeria', path: 'africa' },
  { code: 'AO', slug: 'angola', name: 'Angola', path: 'africa' },
  { code: 'BJ', slug: 'benin', name: 'Benin', path: 'africa' },
  { code: 'BW', slug: 'botswana', name: 'Botswana', path: 'africa' },
  { code: 'BF', slug: 'burkina-faso', name: 'Burkina Faso', path: 'africa' },
  { code: 'BI', slug: 'burundi', name: 'Burundi', path: 'africa' },
  { code: 'CM', slug: 'cameroon', name: 'Cameroon', path: 'africa' },
  { code: 'CV', slug: 'cape-verde', name: 'Cape Verde', path: 'africa' },
  { code: 'CF', slug: 'central-african-republic', name: 'Central African Republic', path: 'africa' },
  { code: 'TD', slug: 'chad', name: 'Chad', path: 'africa' },
  { code: 'CG', slug: 'congo-brazzaville', name: 'Congo-Brazzaville', path: 'africa' },
  { code: 'CD', slug: 'congo-democratic-republic', name: 'Congo (DRC)', path: 'africa' },
  { code: 'DJ', slug: 'djibouti', name: 'Djibouti', path: 'africa' },
  { code: 'EG', slug: 'egypt', name: 'Egypt', path: 'africa' },
  { code: 'GQ', slug: 'equatorial-guinea', name: 'Equatorial Guinea', path: 'africa' },
  { code: 'ER', slug: 'eritrea', name: 'Eritrea', path: 'africa' },
  { code: 'ET', slug: 'ethiopia', name: 'Ethiopia', path: 'africa' },
  { code: 'GA', slug: 'gabon', name: 'Gabon', path: 'africa' },
  { code: 'GH', slug: 'ghana', name: 'Ghana', path: 'africa' },
  { code: 'GN', slug: 'guinea', name: 'Guinea', path: 'africa' },
  { code: 'GW', slug: 'guinea-bissau', name: 'Guinea-Bissau', path: 'africa' },
  { code: 'CI', slug: 'ivory-coast', name: 'Ivory Coast', path: 'africa' },
  { code: 'KE', slug: 'kenya', name: 'Kenya', path: 'africa' },
  { code: 'LS', slug: 'lesotho', name: 'Lesotho', path: 'africa' },
  { code: 'LR', slug: 'liberia', name: 'Liberia', path: 'africa' },
  { code: 'LY', slug: 'libya', name: 'Libya', path: 'africa' },
  { code: 'MG', slug: 'madagascar', name: 'Madagascar', path: 'africa' },
  { code: 'MW', slug: 'malawi', name: 'Malawi', path: 'africa' },
  { code: 'ML', slug: 'mali', name: 'Mali', path: 'africa' },
  { code: 'MR', slug: 'mauritania', name: 'Mauritania', path: 'africa' },
  { code: 'MU', slug: 'mauritius', name: 'Mauritius', path: 'africa' },
  { code: 'MA_COUNTRY', slug: 'morocco', name: 'Morocco', path: 'africa' },
  { code: 'MZ', slug: 'mozambique', name: 'Mozambique', path: 'africa' },
  { code: 'NA', slug: 'namibia', name: 'Namibia', path: 'africa' },
  { code: 'NE', slug: 'niger', name: 'Niger', path: 'africa' },
  { code: 'NG', slug: 'nigeria', name: 'Nigeria', path: 'africa' },
  { code: 'RW', slug: 'rwanda', name: 'Rwanda', path: 'africa' },
  { code: 'SN_GM', slug: 'senegal-and-gambia', name: 'Senegal & Gambia', path: 'africa' },
  { code: 'SL', slug: 'sierra-leone', name: 'Sierra Leone', path: 'africa' },
  { code: 'SO', slug: 'somalia', name: 'Somalia', path: 'africa' },
  { code: 'ZA', slug: 'south-africa', name: 'South Africa', path: 'africa' },
  { code: 'SS', slug: 'south-sudan', name: 'South Sudan', path: 'africa' },
  { code: 'SD', slug: 'sudan', name: 'Sudan', path: 'africa' },
  { code: 'SZ', slug: 'swaziland', name: 'Eswatini', path: 'africa' },
  { code: 'TZ', slug: 'tanzania', name: 'Tanzania', path: 'africa' },
  { code: 'TG', slug: 'togo', name: 'Togo', path: 'africa' },
  { code: 'TN', slug: 'tunisia', name: 'Tunisia', path: 'africa' },
  { code: 'UG', slug: 'uganda', name: 'Uganda', path: 'africa' },
  { code: 'ZM', slug: 'zambia', name: 'Zambia', path: 'africa' },
  { code: 'ZW', slug: 'zimbabwe', name: 'Zimbabwe', path: 'africa' },
  // ── Oceania ───────────────────────────────────────────────────────────
  { code: 'AU', slug: 'australia', name: 'Australia', path: 'australia-oceania' },
  { code: 'NZ', slug: 'new-zealand', name: 'New Zealand', path: 'australia-oceania' },
  { code: 'FJ', slug: 'fiji', name: 'Fiji', path: 'australia-oceania' },
  { code: 'PG', slug: 'papua-new-guinea', name: 'Papua New Guinea', path: 'australia-oceania' },
]

function buildUSStates() {
  const states = [
    ['US/MA', 'massachusetts', 'Massachusetts'],
    ['US/NH', 'new-hampshire', 'New Hampshire'],
    ['US/VT', 'vermont', 'Vermont'],
    ['US/ME', 'maine', 'Maine'],
    ['US/CT', 'connecticut', 'Connecticut'],
    ['US/RI', 'rhode-island', 'Rhode Island'],
    ['US/NY', 'new-york', 'New York'],
    ['US/NJ', 'new-jersey', 'New Jersey'],
    ['US/PA', 'pennsylvania', 'Pennsylvania'],
    ['US/DE', 'delaware', 'Delaware'],
    ['US/MD', 'maryland', 'Maryland'],
    ['US/VA', 'virginia', 'Virginia'],
    ['US/WV', 'west-virginia', 'West Virginia'],
    ['US/NC', 'north-carolina', 'North Carolina'],
    ['US/SC', 'south-carolina', 'South Carolina'],
    ['US/GA', 'georgia-us', 'Georgia (US)'],
    ['US/FL', 'florida', 'Florida'],
    ['US/AL', 'alabama', 'Alabama'],
    ['US/MS', 'mississippi', 'Mississippi'],
    ['US/TN', 'tennessee', 'Tennessee'],
    ['US/KY', 'kentucky', 'Kentucky'],
    ['US/OH', 'ohio', 'Ohio'],
    ['US/IN', 'indiana', 'Indiana'],
    ['US/MI', 'michigan', 'Michigan'],
    ['US/IL', 'illinois', 'Illinois'],
    ['US/WI', 'wisconsin', 'Wisconsin'],
    ['US/MN', 'minnesota', 'Minnesota'],
    ['US/IA', 'iowa', 'Iowa'],
    ['US/MO', 'missouri', 'Missouri'],
    ['US/AR', 'arkansas', 'Arkansas'],
    ['US/LA', 'louisiana', 'Louisiana'],
    ['US/TX', 'texas', 'Texas'],
    ['US/OK', 'oklahoma', 'Oklahoma'],
    ['US/KS', 'kansas', 'Kansas'],
    ['US/NE', 'nebraska', 'Nebraska'],
    ['US/SD', 'south-dakota', 'South Dakota'],
    ['US/ND', 'north-dakota', 'North Dakota'],
    ['US/MT', 'montana', 'Montana'],
    ['US/WY', 'wyoming', 'Wyoming'],
    ['US/CO', 'colorado', 'Colorado'],
    ['US/NM', 'new-mexico', 'New Mexico'],
    ['US/AZ', 'arizona', 'Arizona'],
    ['US/UT', 'utah', 'Utah'],
    ['US/NV', 'nevada', 'Nevada'],
    ['US/ID', 'idaho', 'Idaho'],
    ['US/OR', 'oregon', 'Oregon'],
    ['US/WA', 'washington', 'Washington'],
    ['US/CA', 'california', 'California'],
    ['US/AK', 'alaska', 'Alaska'],
    ['US/HI', 'hawaii', 'Hawaii'],
    ['US/DC', 'district-of-columbia', 'District of Columbia'],
  ]
  return states.map(([code, slug, name]) => ({
    code, slug, name, path: 'north-america/us'
  }))
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { writeFileSync(LOG_FILE, line + '\n', { flag: 'a' }) } catch {}
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

// ─── Progress tracking ──────────────────────────────────────────────────────

function loadProgress() {
  try {
    if (existsSync(PROGRESS_FILE)) {
      return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    }
  } catch {}
  return {
    startedAt: new Date().toISOString(),
    completedRegions: [],
    regionResults: {},
    totalBusinesses: 0,
    lastUpdated: new Date().toISOString(),
  }
}

function saveProgress(progress) {
  progress.lastUpdated = new Date().toISOString()
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

// ─── Download ───────────────────────────────────────────────────────────────

function downloadRegion(region) {
  const urlPath = region.path ? `${region.path}/${region.slug}` : region.slug
  const url = `${GEOFABRIK_BASE}/${urlPath}-latest.osm.pbf`
  const pbfFile = join(__dirname, `${region.slug}-latest.osm.pbf`)

  log(`  Downloading from ${url}`)

  const isWindows = process.platform === 'win32'
  const cmd = isWindows
    ? `curl -L -C - -o "${pbfFile}" "${url}"`
    : `wget -c -q --show-progress -O "${pbfFile}" "${url}"`

  try {
    execSync(cmd, { stdio: 'inherit', timeout: 3600000 })
  } catch (err) {
    if (existsSync(pbfFile) && statSync(pbfFile).size > 1000) {
      log(`  Download tool exited with error but file exists, continuing`)
    } else {
      throw new Error(`Download failed: ${err.message}`)
    }
  }

  const size = statSync(pbfFile).size
  log(`  Downloaded: ${formatBytes(size)}`)
  return pbfFile
}

// ─── Parse PBF ──────────────────────────────────────────────────────────────

function isFoodBusiness(tags) {
  if (!tags || !tags.name || tags.name.trim().length < 2) return false
  if (tags.amenity && FOOD_AMENITIES.has(tags.amenity)) return true
  if (tags.shop && FOOD_SHOPS.has(tags.shop)) return true
  return false
}

function parseOSMElement(type, id, tags, lat, lon) {
  return {
    osm_id: `${type}/${id}`,
    name: tags.name?.trim(),
    amenity: tags.amenity || null,
    shop: tags.shop || null,
    cuisine: tags.cuisine || null,
    address: {
      street: tags['addr:street'] || null,
      housenumber: tags['addr:housenumber'] || null,
      city: tags['addr:city'] || tags['addr:suburb'] || null,
      state: tags['addr:state'] || null,
      postcode: tags['addr:postcode'] || null,
      country: tags['addr:country'] || null,
    },
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || tags.url || null,
    email: tags['contact:email'] || tags.email || null,
    opening_hours: tags.opening_hours || null,
    wheelchair: tags.wheelchair || null,
    outdoor_seating: tags.outdoor_seating || null,
    takeaway: tags.takeaway || null,
    delivery: tags.delivery || null,
    diet_vegan: tags['diet:vegan'] || null,
    diet_vegetarian: tags['diet:vegetarian'] || null,
    diet_gluten_free: tags['diet:gluten_free'] || null,
    stars: tags.stars || null,
    capacity: tags.capacity || null,
    description: tags.description || null,
    lat: lat || null,
    lon: lon || null,
  }
}

async function parsePBF(pbfFile, regionCode) {
  let createParser
  try {
    const mod = await import('osm-pbf-parser')
    createParser = mod.default || mod
  } catch (err) {
    log(`ERROR: osm-pbf-parser not installed. Run: npm install osm-pbf-parser`)
    throw err
  }

  const parser = createParser()
  const fileStream = createReadStream(pbfFile)

  const byCityMap = {}
  let totalFound = 0
  let totalNodes = 0
  let lastLogTime = Date.now()

  return new Promise((resolve, reject) => {
    fileStream
      .pipe(parser)
      .on('data', (items) => {
        for (const item of items) {
          if (item.type === 'node') {
            totalNodes++
            const tags = item.tags || {}

            if (isFoodBusiness(tags)) {
              const biz = parseOSMElement('node', item.id, tags, item.lat, item.lon)
              biz.address.state = biz.address.state || regionCode
              const city = biz.address.city || '_unknown'
              if (!byCityMap[city]) byCityMap[city] = []
              byCityMap[city].push(biz)
              totalFound++
            }
          }

          const now = Date.now()
          if (now - lastLogTime > 30000) {
            log(`  ...${(totalNodes / 1e6).toFixed(1)}M nodes, ${totalFound.toLocaleString()} food businesses`)
            lastLogTime = now
          }
        }
      })
      .on('end', () => {
        log(`  Parsed ${(totalNodes / 1e6).toFixed(1)}M nodes, found ${totalFound.toLocaleString()} food businesses`)
        resolve({ byCityMap, totalFound, totalNodes })
      })
      .on('error', (err) => {
        log(`  Parse error: ${err.message}`)
        reject(err)
      })
  })
}

// ─── Save findings locally ──────────────────────────────────────────────────

function saveRegionFindings(regionCode, byCityMap) {
  if (DRY_RUN) {
    const count = Object.values(byCityMap).reduce((sum, arr) => sum + arr.length, 0)
    log(`  [DRY RUN] Would save ${count} businesses for ${regionCode}`)
    return 0
  }

  // regionCode can be "US/MA" (nested) or "FR" (flat)
  const stateDir = join(FINDINGS_DIR, regionCode)
  mkdirSync(stateDir, { recursive: true })

  let totalNew = 0

  for (const [city, businesses] of Object.entries(byCityMap)) {
    const safeCity = city.replace(/[^a-zA-Z0-9 .-]/g, '').replace(/\s+/g, '_').toLowerCase()
    const filePath = join(stateDir, `${safeCity}.json`)

    let existing = []
    try {
      if (existsSync(filePath)) {
        existing = JSON.parse(readFileSync(filePath, 'utf-8'))
      }
    } catch { existing = [] }

    const existingIds = new Set(existing.map((b) => b.osm_id))
    const newBiz = businesses.filter((b) => !existingIds.has(b.osm_id))

    if (newBiz.length > 0) {
      const merged = [...existing, ...newBiz]
      writeFileSync(filePath, JSON.stringify(merged, null, 2))
      totalNew += newBiz.length
    }
  }

  log(`  Saved ${totalNew.toLocaleString()} new businesses to disk`)
  return totalNew
}

// ─── Manual sync (--sync-only) ──────────────────────────────────────────────

async function syncFindings() {
  log('Syncing all local findings to Supabase...')
  const { syncToSupabase } = await import('./lib/sync.mjs')
  const result = await syncToSupabase()
  log(`Sync complete: ${result.synced} synced, ${result.skipped} skipped, ${result.failed} failed`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now()

  log('='.repeat(60))
  log('OpenClaw Geofabrik Global Import - Phase 1')
  log(`${REGIONS.length} regions worldwide`)
  log('ALL DATA STAYS LOCAL. No auto-sync.')
  log('='.repeat(60))
  if (DRY_RUN) log('*** DRY RUN MODE ***')
  if (SYNC_ONLY) log('*** SYNC ONLY (manual push to Supabase) ***')
  log('')

  try {
    // Manual sync mode
    if (SYNC_ONLY) {
      await syncFindings()
      return
    }

    // Crawl mode: download, parse, save locally
    const progress = loadProgress()
    const completedSet = new Set(progress.completedRegions)

    log(`${completedSet.size}/${REGIONS.length} regions already done`)

    let consecutiveFailures = 0

    for (const region of REGIONS) {
      if (completedSet.has(region.code)) continue

      log('')
      log(`--- ${region.name} (${region.code}) ---`)
      const regionStart = Date.now()

      let pbfFile
      try {
        pbfFile = downloadRegion(region)
        const { byCityMap, totalFound } = await parsePBF(pbfFile, region.code)
        const saved = saveRegionFindings(region.code, byCityMap)

        progress.completedRegions.push(region.code)
        progress.regionResults[region.code] = {
          completedAt: new Date().toISOString(),
          businessesFound: totalFound,
          newBusinessesSaved: saved,
          duration: formatDuration(Date.now() - regionStart),
        }
        progress.totalBusinesses += saved
        saveProgress(progress)

        try { unlinkSync(pbfFile) } catch {}

        consecutiveFailures = 0
        log(`  Done in ${formatDuration(Date.now() - regionStart)} [${progress.completedRegions.length}/${REGIONS.length}]`)

      } catch (err) {
        consecutiveFailures++
        log(`  ERROR on ${region.name}: ${err.message}`)

        if (consecutiveFailures >= 5) {
          log(`  5 consecutive failures, pausing 10 minutes...`)
          await new Promise(r => setTimeout(r, 600000))
          consecutiveFailures = 0
        } else {
          log(`  Skipping to next region...`)
        }

        if (pbfFile) try { unlinkSync(pbfFile) } catch {}
        saveProgress(progress)
        continue
      }
    }

    const elapsed = Date.now() - startTime
    log('')
    log('='.repeat(60))
    log(`Global import complete in ${formatDuration(elapsed)}`)
    log(`${progress.completedRegions.length}/${REGIONS.length} regions succeeded`)
    log(`${progress.totalBusinesses.toLocaleString()} total businesses saved locally`)
    log('')
    log('ALL DATA IS LOCAL. To push to Supabase:')
    log('  node geofabrik-import.mjs --sync-only')
    log('='.repeat(60))

    // Write completion marker
    writeFileSync(join(DATA_DIR, 'geofabrik-complete.json'), JSON.stringify({
      completedAt: new Date().toISOString(),
      totalRegions: progress.completedRegions.length,
      totalBusinesses: progress.totalBusinesses,
      duration: formatDuration(elapsed),
    }, null, 2))

    // Auto-start OpenClaw for long-tail crawling (Pi only)
    if (process.platform !== 'win32') {
      log('')
      log('Starting OpenClaw for long-tail refresh...')
      try {
        execSync('sudo systemctl start openclaw', { stdio: 'inherit', timeout: 10000 })
        log('OpenClaw started.')
      } catch {
        log('Could not auto-start OpenClaw. Start manually: sudo systemctl start openclaw')
      }
    } else {
      log('')
      log('PC import done. Rsync findings to Pi when ready:')
      log('  rsync -av scripts/openclaw/crawler_findings/ davidferra@raspberrypi.local:~/openclaw/crawler_findings/')
    }

  } catch (err) {
    log(`FATAL: ${err.message}`)
    console.error(err)
    process.exit(1)
  }
}

main()
