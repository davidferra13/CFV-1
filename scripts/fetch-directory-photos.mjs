#!/usr/bin/env node

/**
 * Fetch OG images from business websites for directory listings that lack photos.
 *
 * Usage:
 *   node scripts/fetch-directory-photos.mjs              # default batch of 500
 *   node scripts/fetch-directory-photos.mjs --limit 100  # custom batch size
 *   node scripts/fetch-directory-photos.mjs --state MA   # filter by state
 *   node scripts/fetch-directory-photos.mjs --dry-run    # preview without saving
 *
 * For each listing without photos that has a website_url:
 *   1. Fetches the website HTML
 *   2. Extracts og:image, twitter:image, or first large <img> src
 *   3. Downloads the image
 *   4. Stores it in local storage (storage/directory-photos/{slug}/og.{ext})
 *   5. Updates directory_listings.photo_urls in the database
 */

import postgres from 'postgres'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage')
const BUCKET = 'directory-photos'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

// Parse CLI args
const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const stateIdx = args.indexOf('--state')
const BATCH_LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 500
const STATE_FILTER = stateIdx !== -1 ? args[stateIdx + 1] : null
const DRY_RUN = args.includes('--dry-run')

// Counters
let fetched = 0
let saved = 0
let skipped = 0
let failed = 0
let noImage = 0

// Domains to skip (CDNs that block, known dead ends)
const SKIP_DOMAINS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'yelp.com',
  'doordash.com',
  'grubhub.com',
  'ubereats.com',
  'maps.google.com',
]

function shouldSkipUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return SKIP_DOMAINS.some(d => hostname.includes(d))
  } catch {
    return true
  }
}

/**
 * Extract the best image URL from HTML, trying multiple strategies in priority order.
 */
function extractImageUrl(html, baseUrl) {
  let match, url

  // 1. og:image (most reliable, specifically designed for sharing)
  match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (match && (url = resolveUrl(match[1], baseUrl))) return url

  // 2. twitter:image
  match = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i)
  if (match && (url = resolveUrl(match[1], baseUrl))) return url

  // 3. schema.org itemprop="image"
  match = html.match(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i)
  if (match && (url = resolveUrl(match[1], baseUrl))) return url

  // 4. JSON-LD schema (Restaurant, FoodEstablishment, LocalBusiness often have "image")
  const jsonLdBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1])
      const img = extractJsonLdImage(data)
      if (img && (url = resolveUrl(img, baseUrl))) return url
    } catch { /* malformed JSON-LD, skip */ }
  }

  // 5. <link rel="image_src"> (older convention, still used by some CMS)
  match = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i)
  if (match && (url = resolveUrl(match[1], baseUrl))) return url

  // 6. First large hero image (common restaurant pattern: full-width img near top of page)
  //    Only consider images that look like real photos (not icons, logos, tracking pixels)
  const imgMatches = [...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
  for (const imgMatch of imgMatches.slice(0, 15)) {
    const src = imgMatch[1]
    if (!src) continue
    // Skip data URIs, SVGs, tiny images, tracking pixels, common icon patterns
    if (src.startsWith('data:')) continue
    if (src.match(/\.svg(\?|$)/i)) continue
    if (src.match(/logo|icon|favicon|spinner|loader|pixel|spacer|badge|button/i)) continue
    if (src.match(/1x1|transparent|blank/i)) continue
    // Must look like a photo URL (has image extension or is from a CDN/image service)
    if (src.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) || src.match(/image|photo|upload|media|cdn|wp-content/i)) {
      url = resolveUrl(src, baseUrl)
      if (url) return url
    }
  }

  return null
}

/**
 * Extract image URL from JSON-LD structured data (handles nested @graph arrays)
 */
function extractJsonLdImage(data) {
  if (!data) return null
  // Direct image property
  if (data.image) {
    if (typeof data.image === 'string') return data.image
    if (Array.isArray(data.image) && data.image.length > 0) {
      return typeof data.image[0] === 'string' ? data.image[0] : data.image[0]?.url
    }
    if (data.image.url) return data.image.url
  }
  // @graph array (common in Yoast SEO, WooCommerce, etc.)
  if (Array.isArray(data['@graph'])) {
    for (const node of data['@graph']) {
      const img = extractJsonLdImage(node)
      if (img) return img
    }
  }
  return null
}

function resolveUrl(url, baseUrl) {
  if (!url) return null
  try {
    return new URL(url, baseUrl).href
  } catch {
    return null
  }
}

/**
 * Fetch with timeout and redirect following
 */
async function safeFetch(url, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow Directory Bot; +https://cheflowhq.com)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Download image and return buffer + content type
 */
async function downloadImage(imageUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow Directory Bot; +https://cheflowhq.com)',
        'Accept': 'image/*',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    // Skip tiny images (icons, 1x1 tracking pixels)
    if (buffer.length < 5000) return null
    return { buffer, contentType }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Save image to local storage
 */
async function saveImage(slug, buffer, contentType) {
  const ext = contentType.includes('png') ? 'png'
    : contentType.includes('webp') ? 'webp'
    : contentType.includes('svg') ? null  // skip SVGs
    : 'jpg'
  if (!ext) return null

  const filePath = path.join(STORAGE_ROOT, BUCKET, slug, `og.${ext}`)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, buffer)
  return `/api/storage/public/${BUCKET}/${slug}/og.${ext}`
}

/**
 * Process a single listing
 */
async function processListing(listing) {
  const { id, slug, website_url, name } = listing

  if (shouldSkipUrl(website_url)) {
    skipped++
    return
  }

  try {
    // Step 1: Fetch the website HTML
    const res = await safeFetch(website_url)
    if (!res.ok) {
      failed++
      return
    }
    const html = await res.text()
    fetched++

    // Step 2: Extract OG image URL
    const imageUrl = extractImageUrl(html, website_url)
    if (!imageUrl) {
      noImage++
      return
    }

    if (DRY_RUN) {
      console.log(`  [dry] ${name} -> ${imageUrl}`)
      saved++
      return
    }

    // Step 3: Download the image
    const img = await downloadImage(imageUrl)
    if (!img) {
      noImage++
      return
    }

    // Step 4: Save to storage
    const publicUrl = await saveImage(slug, img.buffer, img.contentType)
    if (!publicUrl) {
      noImage++
      return
    }

    // Step 5: Update database
    await sql`
      UPDATE directory_listings
      SET photo_urls = ARRAY[${publicUrl}]::text[],
          updated_at = now()
      WHERE id = ${id}
    `
    saved++

  } catch (err) {
    failed++
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nDirectory Photo Fetcher`)
  console.log(`Batch: ${BATCH_LIMIT} | State: ${STATE_FILTER || 'all'} | Dry run: ${DRY_RUN}\n`)

  // Get listings without photos that have a website
  const query = STATE_FILTER
    ? sql`
        SELECT id, slug, website_url, name
        FROM directory_listings
        WHERE (photo_urls IS NULL OR photo_urls = '{}')
          AND website_url IS NOT NULL
          AND website_url != ''
          AND state = ${STATE_FILTER}
        ORDER BY lead_score DESC NULLS LAST
        LIMIT ${BATCH_LIMIT}
      `
    : sql`
        SELECT id, slug, website_url, name
        FROM directory_listings
        WHERE (photo_urls IS NULL OR photo_urls = '{}')
          AND website_url IS NOT NULL
          AND website_url != ''
        ORDER BY lead_score DESC NULLS LAST
        LIMIT ${BATCH_LIMIT}
      `

  const listings = await query
  console.log(`Found ${listings.length} listings to process\n`)

  if (listings.length === 0) {
    console.log('Nothing to do.')
    await sql.end()
    return
  }

  // Process in parallel batches of 10 (be polite to websites)
  const CONCURRENCY = 10
  for (let i = 0; i < listings.length; i += CONCURRENCY) {
    const batch = listings.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(l => processListing(l)))

    const progress = Math.min(i + CONCURRENCY, listings.length)
    const pct = Math.round((progress / listings.length) * 100)
    process.stdout.write(`\r  [${pct}%] ${progress}/${listings.length} | saved: ${saved} | no-image: ${noImage} | failed: ${failed} | skipped: ${skipped}`)
  }

  console.log(`\n\nDone!`)
  console.log(`  Fetched: ${fetched}`)
  console.log(`  Saved:   ${saved}`)
  console.log(`  No image found: ${noImage}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Skipped: ${skipped}`)

  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  sql.end()
  process.exit(1)
})
