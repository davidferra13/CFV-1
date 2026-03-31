# Spec: OpenClaw Directory Images Cartridge

> **Status:** verified (ChefFlow side complete; Pi-side cartridge pending)
> **Priority:** P2 (queued)
> **Depends on:** visual-representation-strategy.md (Phase 3A), openclaw-cartridge-infrastructure.md (verified)
> **Estimated complexity:** medium (Pi-side cartridge + ChefFlow sync handler)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-30

---

## What This Does (Plain English)

A new OpenClaw cartridge (`directory-images`) runs on the Pi and sources photos for the 200K+ food directory listings that currently have no images. It pulls business photos from publicly available sources (Google Places Photos API, business websites via og:image meta tags, and favicon/logo scraping), downloads them locally, and syncs the image URLs to ChefFlow's `directory_listings.photo_urls` column. The result: listing cards on `/discover` show actual business photos instead of letterform placeholders.

---

## Why It Matters

The food directory is ChefFlow's largest public-facing dataset (200K+ listings) and its biggest visual gap. Every listing card shows a colored square with the business's first initial. This makes the directory look empty, unfinished, and untrustworthy. Even a mediocre photo is better than a letter. A good photo makes the listing feel like a real, verified business. For a directory that competes with Google Maps and Yelp for attention, images are table stakes.

---

## Architecture Overview

```
Pi (OpenClaw)                          ChefFlow (PostgreSQL)
--------------                         --------------------
SQLite: queue of                       directory_listings
  listing_id + name                      photo_urls TEXT[]
  + city + state                         (currently empty)
       |                                      ^
       v                                      |
  Scraper workers:                     Sync handler:
  1. Google Places Photos API          directory-images-handler.ts
  2. og:image from website_url           |
  3. Favicon/logo as last resort         |
       |                                  |
       v                                  |
  Downloaded images stored             HTTP POST sync
  in Pi local storage                  via cron endpoint
  ~/openclaw-directory-images/           |
       |                                  |
       v                              Updates photo_urls
  HTTP API :8085                       per listing
  /api/images/unsynced
```

---

## Pi-Side: Cartridge Structure

### Vault Profile

```
F:\OpenClaw-Vault\profiles\directory-images\
  ├── package.json
  ├── server.mjs          # HTTP API on port 8085
  ├── scraper.mjs          # Image sourcing logic
  ├── sync-to-chefflow.mjs # Cron sync trigger
  ├── db.mjs               # SQLite schema + queries
  ├── .env                 # API keys (Google Places)
  └── storage/             # Downloaded images (temporary)
```

### Port: 8085

Following the cartridge port convention:

- price-intel: 8081
- market-intel: 8082
- lead-engine: 8083
- trend-watch: 8084
- **directory-images: 8085**

### SQLite Schema

```sql
CREATE TABLE image_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  website_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending | processing | found | not_found | error
  photo_urls TEXT,  -- JSON array of found URLs
  source TEXT,      -- google_places | og_image | favicon | website_scrape
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  synced_to_chefflow INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_queue_status ON image_queue(status);
CREATE INDEX idx_queue_synced ON image_queue(synced_to_chefflow);
```

### Scraper Logic (Priority Order)

The scraper tries sources in this order, stopping at the first success:

**Source 1: Google Places Photos API**

- Search: `name + city + state` via Places API text search
- If match found with photos: download up to 3 photos via Places Photos API
- Cost: $0.032 per photo request (budget-conscious; batch carefully)
- Rate limit: respect Google's QPS limits
- Best quality, most reliable, but costs money

**Source 2: og:image from business website**

- If `website_url` is populated: fetch the page, extract `<meta property="og:image">` content
- Download the image if found
- Free, fast, but not all sites have og:image
- Also try `<meta name="twitter:image">` as fallback

**Source 3: Favicon/Logo scraping**

- If `website_url` is populated: try common logo paths:
  - `/favicon.ico` (too small for hero, but usable as thumbnail)
  - `/apple-touch-icon.png` (usually 180x180, decent quality)
  - `/logo.png`, `/images/logo.png`, `/assets/logo.png`
  - Parse `<link rel="icon" sizes="192x192">` or similar from HTML
- Also try Google's favicon service: `https://www.google.com/s2/favicons?domain={domain}&sz=128`
- Lower quality than photos, but better than nothing
- Mark these as `source: 'favicon'` so ChefFlow can display them differently (e.g., centered logo vs. cover photo)

**Source 4: No image found**

- Mark as `status: 'not_found'`
- Don't retry for 30 days (avoid wasting API calls on businesses with no web presence)

### Image Storage on Pi

- Downloaded images go to `~/openclaw-directory-images/{listing_id}/`
- Max 3 images per listing
- Images are resized to max 800px wide via sharp before storage (save disk space on Pi)
- Original format preserved (JPEG/PNG/WebP)
- Total estimated storage: 200K listings x 3 images x 50KB avg = ~30GB (manageable on Pi SD card or USB drive)

### Cron Schedule

```cron
# Process 1000 pending listings per run (avoid API quota exhaustion)
0 2 * * * cd ~/openclaw-directory-images && node scraper.mjs --batch=1000

# Sync completed images to ChefFlow every 6 hours
0 */6 * * * cd ~/openclaw-directory-images && node sync-to-chefflow.mjs
```

At 1000/night, the full 200K backlog takes ~200 days. This is intentional:

- Google Places API costs money; slow burn is budget-friendly
- Pi has limited CPU/bandwidth; don't saturate it
- The highest-priority listings (see Priority Queue below) get processed first

### Priority Queue

Not all 200K listings are equal. Process in this order:

1. **Listings with page views** (if analytics exist): most-viewed first
2. **Listings with `website_url` populated**: higher chance of finding images via og:image (free)
3. **Listings in developer's region** (Massachusetts first, then neighboring states)
4. **Listings with `status = 'claimed'` or `'verified'`**: real businesses that care
5. **Everything else**: alphabetical by state, then by city population (larger cities first)

The queue is seeded by pulling listing IDs from ChefFlow's `directory_listings` table where `photo_urls = '{}'`.

### Queue Seeding

A one-time script pulls the queue from ChefFlow:

```bash
# Seed the queue from ChefFlow's directory_listings
node seed-queue.mjs --chefflow-url=http://localhost:3100
```

This calls a ChefFlow API endpoint that returns listing IDs + names + cities + states + website URLs for all listings with empty `photo_urls`. The endpoint is admin-only and rate-limited.

**ChefFlow endpoint needed:**

```
GET /api/admin/directory/image-queue?limit=10000&offset=0
```

Returns: `{ listings: [{ id, name, city, state, website_url }], total: number }`

---

## ChefFlow-Side: Sync Handler

### Cartridge Registration

Add to `lib/openclaw/sync-receiver.ts`:

```typescript
registerCartridge({
  codename: 'directory-images',
  name: 'Directory Images',
  port: 8085,
  pullEndpoint: '/api/images/unsynced',
  targetType: 'database',
  syncHandler: async (): Promise<CartridgeSyncResult> => {
    const { handleDirectoryImagesSync } = await import('./directory-images-handler')
    return handleDirectoryImagesSync(null)
  },
})
```

### Sync Handler

**New file:** `lib/openclaw/directory-images-handler.ts`

```typescript
// Receives batches of { listing_id, photo_urls, source } from Pi
// Updates directory_listings.photo_urls for each listing
// Returns CartridgeSyncResult with counts
```

**Sync payload from Pi:**

```json
{
  "images": [
    {
      "listing_id": "uuid-here",
      "photo_urls": ["https://chefflow-images.local/listing-123/1.jpg", "..."],
      "source": "google_places"
    }
  ]
}
```

**Handler behavior:**

1. For each item in the batch:
   - Look up `directory_listings` by `id`
   - If found and `photo_urls` is currently empty: set `photo_urls` to the provided array
   - If found and `photo_urls` already has entries: skip (don't overwrite manually added photos)
   - If not found: skip (listing may have been deleted)
2. Return `{ synced: N, skipped: M, errors: E }`
3. Revalidate `/discover` path after sync (so new images appear on next page load)

### Image Hosting Decision

**Option A: Pi serves images directly** (simpler, but Pi becomes a dependency for public page loads)

- Pi stores images at `~/openclaw-directory-images/`
- Pi HTTP API serves images at `http://10.0.0.177:8085/images/{listing_id}/{filename}`
- ChefFlow proxies or redirects to Pi URLs
- Problem: Pi goes down = broken images on public directory

**Option B: Upload images to ChefFlow storage** (recommended)

- During sync, the handler downloads images from Pi and stores them in ChefFlow's local storage (`./storage/directory-images/`)
- Photo URLs point to ChefFlow's own storage API (`/api/storage/public/directory-images/{listing_id}/{filename}`)
- Pi is only needed during sync, not during page loads
- Images survive Pi outages
- Additional disk usage on ChefFlow server: ~30GB over time

**Recommendation: Option B.** The public directory must not depend on the Pi being online. Images are downloaded during sync and stored in ChefFlow's own storage. The sync handler:

1. Receives image metadata from Pi (including a download URL)
2. Downloads each image from Pi
3. Stores in `./storage/directory-images/{listing_id}/`
4. Generates public URL via `getPublicUrl()`
5. Updates `directory_listings.photo_urls` with ChefFlow storage URLs

---

## Files to Create

| File                                           | Purpose                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| `lib/openclaw/directory-images-handler.ts`     | ChefFlow sync handler for directory images               |
| `app/api/admin/directory/image-queue/route.ts` | Admin endpoint to seed Pi's queue with unimaged listings |

---

## Files to Modify

| File                            | Change                                |
| ------------------------------- | ------------------------------------- |
| `lib/openclaw/sync-receiver.ts` | Register `directory-images` cartridge |

---

## Database Changes

None on ChefFlow side. The `directory_listings.photo_urls TEXT[]` column already exists and defaults to `'{}'`.

---

## Server Actions

| Action                                 | Auth       | Input               | Output                               | Side Effects     |
| -------------------------------------- | ---------- | ------------------- | ------------------------------------ | ---------------- |
| `GET /api/admin/directory/image-queue` | Admin only | `?limit=N&offset=M` | `{ listings: [...], total: number }` | None (read-only) |

---

## Edge Cases and Error Handling

| Scenario                                                               | Correct Behavior                                                                                               |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Google Places returns no results for a business                        | Mark as `not_found`, try og:image from website                                                                 |
| Google Places returns a result but it's the wrong business             | Accept it; false matches are rare and still better than no image. Manual override possible via ChefFlow admin. |
| Website has og:image but it's a generic banner (not business-specific) | Accept it. A generic banner is still better than a letter placeholder.                                         |
| Pi runs out of disk space                                              | Scraper checks available space before each batch. If <1GB free, pause and alert.                               |
| Google Places API quota exceeded                                       | Scraper tracks daily quota. Stops when 90% consumed. Resumes next day.                                         |
| Listing was deleted from ChefFlow between queue seed and sync          | Sync handler skips non-existent listings. No error.                                                            |
| Image download from Pi fails during sync                               | Skip that image, log warning, continue with next. Include in `errors` count.                                   |
| Listing already has photos (manually added)                            | Sync handler skips. Never overwrite existing photos.                                                           |
| Image URL is broken after initial download                             | Images are downloaded and stored locally (Option B). URL won't break unless ChefFlow storage is corrupted.     |
| Pi is offline during sync cron                                         | Sync fails gracefully. Retries on next 6-hour cycle. No data loss.                                             |

---

## Cost Estimate

| API                       | Cost           | Monthly Estimate (1000/day)    |
| ------------------------- | -------------- | ------------------------------ |
| Google Places Text Search | $0.032/request | ~$960/month at full speed      |
| Google Places Photos      | $0.007/photo   | ~$630/month (3 photos/listing) |
| og:image scraping         | Free           | $0                             |
| Favicon scraping          | Free           | $0                             |

**Cost optimization strategy:**

1. Try free sources (og:image, favicon) FIRST for all listings with `website_url`
2. Only use Google Places for listings where free sources failed
3. Estimate: ~40% of listings have websites with og:image. That's 80K free.
4. Remaining 120K need Google Places: ~$5,700 total over 120 days
5. Can reduce by lowering batch size (500/night = $2,850 over 240 days)

**Alternative: Skip Google Places entirely for now.**

- og:image + favicon covers ~40% of listings for free
- Revisit Google Places later if coverage isn't sufficient
- This makes the cartridge $0/month to operate

---

## Verification Steps

### Pi-Side

1. Start the cartridge: `node server.mjs` on port 8085
2. Seed the queue: `node seed-queue.mjs --limit=10`
3. Run the scraper: `node scraper.mjs --batch=10`
4. Verify images downloaded to `~/openclaw-directory-images/`
5. Check `http://localhost:8085/api/stats` shows processed count
6. Check `http://localhost:8085/api/images/unsynced` returns the batch

### ChefFlow-Side

7. Run sync: `curl -X POST http://localhost:3100/api/cron/openclaw-sync?cartridge=directory-images -H "Authorization: Bearer $CRON_SECRET"`
8. Verify `directory_listings.photo_urls` updated for synced listings
9. Navigate to `/discover`. Verify listing cards show actual photos for synced listings.
10. Verify listings that already had photos were NOT overwritten.

---

## Out of Scope

- **Yelp API integration** (requires business account, complex ToS; can add later as an additional source)
- **Manual image upload for individual listings** (already possible via admin tools)
- **Image quality scoring** (accept what we get; a photo is a photo)
- **Face detection/blurring** (business photos rarely contain faces)
- **CDN/Cloudinary optimization for directory images** (ChefFlow already has Cloudinary; listing cards can use `getOptimizedGalleryImage()` on the stored URLs)
- **Reverse image search** (matching listings to photos found elsewhere)
- **User-submitted photos** (community photo contributions are a separate feature)

---

## Notes for Builder Agent

1. **Follow the price-intel cartridge pattern exactly.** The Pi-side structure, HTTP API, cron sync, and ChefFlow handler all mirror `price-intel`. Copy its patterns.

2. **The `_shared/lib/` on the vault provides SQLite, HTTP server, and sync utilities.** Don't reinvent. Symlink to `~/openclaw-shared/` on Pi.

3. **Start with og:image only (free).** Get the pipeline working end-to-end before adding Google Places. The paid API can be plugged in later as an additional source in `scraper.mjs`.

4. **Option B (ChefFlow storage) is mandatory.** Public pages must never depend on the Pi being online. Download images during sync, store locally, serve from ChefFlow.

5. **The queue seed endpoint is admin-only.** Use `requireAdmin()` or bearer token auth. It returns potentially 200K+ rows, so pagination is required.

6. **Don't touch `listing-card.tsx`.** The card already displays `photo_urls[0]` when available. Once the sync populates `photo_urls`, the cards automatically show images. No UI changes needed on the ChefFlow side.

7. **Disk space planning:** 200K listings x 3 images x 50KB = ~30GB. Confirm the ChefFlow server and Pi both have sufficient storage. The Pi may need a USB drive if the SD card is small.

8. **Respect the OpenClaw/ChefFlow separation.** OpenClaw (Pi) does the scraping and image sourcing. ChefFlow receives and stores the results. No scraping logic in ChefFlow. No client data sent to Pi.

9. **The $0 path is viable.** og:image + favicon scraping covers a meaningful percentage of listings for free. Recommend launching with free sources only, measuring coverage, then deciding on Google Places spend.
