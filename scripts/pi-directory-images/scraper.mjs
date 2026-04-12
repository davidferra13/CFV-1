#!/usr/bin/env node

/**
 * Directory Images Scraper
 * Fetches OG images, JSON-LD images, and hero images from business websites.
 * Stores downloaded images locally, updates SQLite queue.
 *
 * Usage:
 *   node scraper.mjs                    # default batch of 500
 *   node scraper.mjs --batch=1000       # custom batch
 *   node scraper.mjs --state=MA         # filter by state
 *   node scraper.mjs --dry-run          # preview without downloading
 */

import { queries } from './db.mjs'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = path.join(__dirname, 'storage')

// Parse CLI args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, v] = a.slice(2).split('=')
      return [k, v ?? 'true']
    })
)
const BATCH_SIZE = parseInt(args.batch) || 500
const STATE_FILTER = args.state || null
const DRY_RUN = 'dry-run' in args

// Domains to skip
const SKIP_DOMAINS = [
  'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'yelp.com', 'doordash.com', 'grubhub.com', 'ubereats.com',
  'maps.google.com', 'linkedin.com',
]

function shouldSkip(url) {
  try {
    const h = new URL(url).hostname.toLowerCase()
    return SKIP_DOMAINS.some(d => h.includes(d))
  } catch { return true }
}

// ─── Image extraction (same logic as ChefFlow scraper) ─────────────────────

function extractImageUrl(html, baseUrl) {
  let match, url

  // 1. og:image
  match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
  if (match && (url = resolve(match[1], baseUrl))) return { url, source: 'og_image' }

  // 2. twitter:image
  match = html.match(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/i)
  if (match && (url = resolve(match[1], baseUrl))) return { url, source: 'og_image' }

  // 3. schema.org itemprop="image"
  match = html.match(/<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i)
  if (match && (url = resolve(match[1], baseUrl))) return { url, source: 'json_ld' }

  // 4. JSON-LD
  const jsonLdBlocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1])
      const img = extractJsonLdImage(data)
      if (img && (url = resolve(img, baseUrl))) return { url, source: 'json_ld' }
    } catch {}
  }

  // 5. <link rel="image_src">
  match = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i)
  if (match && (url = resolve(match[1], baseUrl))) return { url, source: 'hero_img' }

  // 6. First plausible hero image
  const imgMatches = [...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
  for (const imgMatch of imgMatches.slice(0, 15)) {
    const src = imgMatch[1]
    if (!src || src.startsWith('data:')) continue
    if (src.match(/\.svg(\?|$)/i)) continue
    if (src.match(/logo|icon|favicon|spinner|loader|pixel|spacer|badge|button/i)) continue
    if (src.match(/1x1|transparent|blank/i)) continue
    if (src.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) || src.match(/image|photo|upload|media|cdn|wp-content/i)) {
      url = resolve(src, baseUrl)
      if (url) return { url, source: 'hero_img' }
    }
  }

  return null
}

function extractJsonLdImage(data) {
  if (!data) return null
  if (data.image) {
    if (typeof data.image === 'string') return data.image
    if (Array.isArray(data.image) && data.image.length > 0)
      return typeof data.image[0] === 'string' ? data.image[0] : data.image[0]?.url
    if (data.image.url) return data.image.url
  }
  if (Array.isArray(data['@graph'])) {
    for (const node of data['@graph']) {
      const img = extractJsonLdImage(node)
      if (img) return img
    }
  }
  return null
}

function resolve(url, base) {
  try { return new URL(url, base).href } catch { return null }
}

// ─── Download & save ───────────────────────────────────────────────────────

async function fetchPage(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow Directory Bot; +https://cheflowhq.com)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
  finally { clearTimeout(timer) }
}

async function downloadImage(imageUrl) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(imageUrl, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChefFlow Directory Bot; +https://cheflowhq.com)',
        'Accept': 'image/*',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 5000) return null  // skip tiny images
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg'
    return { buffer, ext }
  } catch { return null }
  finally { clearTimeout(timer) }
}

async function saveImage(listingId, buffer, ext) {
  // Try to resize with sharp if available (saves disk space)
  let finalBuffer = buffer
  try {
    const sharp = (await import('sharp')).default
    finalBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    ext = 'jpg'
  } catch {
    // sharp not available or image can't be processed, use original
  }

  const dir = path.join(STORAGE_DIR, listingId)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `photo.${ext}`)
  await fs.writeFile(filePath, finalBuffer)
  return filePath
}

// ─── Process one listing ───────────────────────────────────────────────────

async function processListing(item) {
  if (shouldSkip(item.website_url)) {
    queries.markNotFound.run(item.listing_id)
    return 'skipped'
  }

  try {
    const html = await fetchPage(item.website_url)
    if (!html) {
      queries.markError.run('Website unreachable', item.listing_id)
      return 'failed'
    }

    const result = extractImageUrl(html, item.website_url)
    if (!result) {
      queries.markNotFound.run(item.listing_id)
      return 'no_image'
    }

    if (DRY_RUN) {
      console.log(`  [dry] ${item.name} -> ${result.url} (${result.source})`)
      return 'found'
    }

    const img = await downloadImage(result.url)
    if (!img) {
      queries.markNotFound.run(item.listing_id)
      return 'no_image'
    }

    const filePath = await saveImage(item.listing_id, img.buffer, img.ext)
    queries.markFound.run(filePath, result.source, item.listing_id)
    return 'found'
  } catch (err) {
    queries.markError.run(err.message || 'Unknown', item.listing_id)
    return 'failed'
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nDirectory Images Scraper`)
  console.log(`Batch: ${BATCH_SIZE} | State: ${STATE_FILTER || 'all'} | Dry run: ${DRY_RUN}\n`)

  const items = STATE_FILTER
    ? queries.getPendingByState.all(STATE_FILTER, BATCH_SIZE)
    : queries.getPending.all(BATCH_SIZE)

  console.log(`Found ${items.length} pending items\n`)
  if (items.length === 0) {
    console.log('Nothing to do. Seed the queue first: node seed-queue.mjs')
    return
  }

  let found = 0, noImage = 0, failed = 0, skipped = 0

  // Process in parallel batches of 10
  const CONCURRENCY = 10
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map(processListing))

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value === 'found') found++
        else if (r.value === 'no_image') noImage++
        else if (r.value === 'failed') failed++
        else if (r.value === 'skipped') skipped++
      } else {
        failed++
      }
    }

    const progress = Math.min(i + CONCURRENCY, items.length)
    const pct = Math.round((progress / items.length) * 100)
    process.stdout.write(`\r  [${pct}%] ${progress}/${items.length} | found: ${found} | no-image: ${noImage} | failed: ${failed} | skipped: ${skipped}`)
  }

  console.log(`\n\nDone!`)
  console.log(`  Found: ${found}`)
  console.log(`  No image: ${noImage}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Skipped: ${skipped}`)

  const stats = queries.getStats.get()
  console.log(`\nQueue totals: ${JSON.stringify(stats)}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
