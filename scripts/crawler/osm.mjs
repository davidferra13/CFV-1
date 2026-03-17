// OpenStreetMap Overpass API crawler
// Queries OSM for food businesses within a bounding box.
// Returns structured data: name, city, cuisine tags, website, coordinates.
// Rate-limited to respect Overpass API fair use policy.

import config from './config.json' with { type: 'json' }

// Primary and fallback Overpass endpoints
const OVERPASS_ENDPOINTS = [
  config.overpass.endpoint,
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
let currentEndpoint = 0
const RATE_LIMIT_MS = config.overpass.rateLimitMs
const TIMEOUT = config.overpass.timeout

let lastRequestTime = 0

async function rateLimitedFetch(url, options) {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed))
  }
  lastRequestTime = Date.now()
  return fetch(url, options)
}

// Build Overpass QL query for food businesses in a bounding box
function buildQuery(bbox) {
  const [south, west, north, east] = bbox
  const bboxStr = `${south},${west},${north},${east}`

  // Use node-only query (faster, avoids timeout on large areas)
  // and limit results to avoid Overpass 504s
  return `
[out:json][timeout:${TIMEOUT}];
(
  node["amenity"~"restaurant|cafe|fast_food|ice_cream"]["name"](${bboxStr});
  node["shop"~"bakery|pastry|confectionery"]["name"](${bboxStr});
);
out tags 500;
`
}

// Parse OSM element into a flat object
function parseElement(el) {
  const tags = el.tags || {}

  // Get coordinates (node has lat/lon directly, way/relation has center)
  const lat = el.lat || el.center?.lat
  const lon = el.lon || el.center?.lon

  return {
    osmId: `${el.type}/${el.id}`,
    name: tags.name?.trim(),
    amenity: tags.amenity,
    shop: tags.shop,
    cuisine: tags.cuisine,
    city: tags['addr:city'] || tags['addr:suburb'],
    state: tags['addr:state'],
    street: tags['addr:street'],
    housenumber: tags['addr:housenumber'],
    postcode: tags['addr:postcode'],
    phone: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'] || tags.url,
    email: null, // Never scrape emails from OSM, consent boundary
    openingHours: tags.opening_hours,
    lat,
    lon,
  }
}

// Query Overpass API for a region
export async function crawlRegion(region) {
  const query = buildQuery(region.bbox)

  console.log(`[osm] Crawling "${region.name}"...`)

  try {
    const endpoint = OVERPASS_ENDPOINTS[currentEndpoint % OVERPASS_ENDPOINTS.length]
    console.log(`[osm] Using endpoint: ${endpoint}`)

    const res = await rateLimitedFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`[osm] Overpass API error ${res.status}: ${text.slice(0, 200)}`)

      // Try next endpoint on failure
      if (currentEndpoint < OVERPASS_ENDPOINTS.length - 1) {
        currentEndpoint++
        console.log(`[osm] Retrying with next endpoint...`)
        return crawlRegion(region)
      }
      return []
    }

    const data = await res.json()
    const elements = data.elements || []

    console.log(`[osm] Found ${elements.length} raw elements in "${region.name}"`)

    const parsed = elements
      .map(parseElement)
      .filter((e) => e.name && e.name.length >= config.crawl.minNameLength)

    // Deduplicate by name within this region (OSM sometimes has duplicates)
    const seen = new Set()
    const deduped = parsed.filter((e) => {
      const key = e.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    console.log(`[osm] ${deduped.length} unique businesses after filtering in "${region.name}"`)

    return deduped.slice(0, config.crawl.maxPerRegion)
  } catch (err) {
    console.error(`[osm] Failed to crawl "${region.name}":`, err.message)
    return []
  }
}
