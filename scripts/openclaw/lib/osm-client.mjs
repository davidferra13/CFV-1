// Overpass API client with retry, rate limiting, and endpoint failover.
// Extracts comprehensive food business data from OpenStreetMap.

import config from '../config.json' with { type: 'json' }

const ENDPOINTS = config.overpass.endpoints
const RATE_LIMIT_MS = config.overpass.rateLimitMs
const TIMEOUT = config.overpass.timeout
const MAX_RETRIES = config.overpass.maxRetries
const RETRY_BACKOFF = config.overpass.retryBackoffMs
const QUERY_LIMIT = config.grid.queryLimit

let currentEndpoint = 0
let lastRequestTime = 0

async function rateLimitedFetch(url, options) {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed))
  }
  lastRequestTime = Date.now()
  return fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT * 1000) })
}

function buildQuery(bbox) {
  const [south, west, north, east] = bbox
  const b = `${south},${west},${north},${east}`

  // Node-only queries are faster and avoid Overpass 504 timeouts
  return `
[out:json][timeout:${TIMEOUT}];
(
  node["amenity"~"restaurant|cafe|fast_food|ice_cream|bar|pub|food_court|biergarten"]["name"](${b});
  node["shop"~"bakery|pastry|confectionery|deli|butcher|cheese|chocolate|coffee|tea|seafood|farm"]["name"](${b});
);
out tags ${QUERY_LIMIT};
`
}

function parseElement(el) {
  const tags = el.tags || {}
  const lat = el.lat || el.center?.lat
  const lon = el.lon || el.center?.lon

  return {
    osm_id: `${el.type}/${el.id}`,
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
    lat,
    lon,
    raw_tags: tags,
  }
}

/**
 * Query a single grid cell. Retries with endpoint failover.
 */
export async function queryCell(bbox) {
  const query = buildQuery(bbox)

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const endpoint = ENDPOINTS[currentEndpoint % ENDPOINTS.length]

    try {
      const res = await rateLimitedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })

      if (res.status === 429 || res.status === 504) {
        // Rate limited or timeout - try next endpoint after backoff
        currentEndpoint++
        const backoff = RETRY_BACKOFF * (attempt + 1)
        console.log(`[osm] ${res.status} from ${endpoint}, backing off ${backoff / 1000}s...`)
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => 'unknown')
        console.error(`[osm] Error ${res.status} from ${endpoint}: ${text.slice(0, 100)}`)
        currentEndpoint++
        continue
      }

      const data = await res.json()
      const elements = data.elements || []

      const parsed = elements
        .map(parseElement)
        .filter((e) => e.name && e.name.length >= 2)

      // Deduplicate by name within cell
      const seen = new Set()
      return parsed.filter((e) => {
        const key = e.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.error(`[osm] Timeout on ${endpoint}, trying next...`)
        currentEndpoint++
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF))
        continue
      }
      console.error(`[osm] Network error on ${endpoint}:`, err.message)
      currentEndpoint++
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF))
      }
    }
  }

  // All retries exhausted
  return null // null means "failed, should retry later"
}
