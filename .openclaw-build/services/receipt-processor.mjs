/**
 * OpenClaw - Receipt Processor
 * OCR-based receipt scanning using Tesseract.
 * Provides both:
 *   1. HTTP upload endpoint (POST /upload with multipart image)
 *   2. File watcher on ~/openclaw-prices/receipts/ directory
 *
 * Receipt prices are the highest confidence tier (exact_receipt).
 * Processes receipt images -> extracts product names + prices -> normalizes -> stores.
 */

import { createServer } from 'http';
import { readFileSync, readdirSync, renameSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { getDb, upsertPrice } from '../lib/db.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const RECEIPTS_DIR = join(DATA_DIR, 'receipts');
const PROCESSED_DIR = join(DATA_DIR, 'receipts-processed');
const FAILED_DIR = join(DATA_DIR, 'receipts-failed');
const PORT = 8082;

// Ensure directories exist
for (const dir of [RECEIPTS_DIR, PROCESSED_DIR, FAILED_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Run Tesseract OCR on an image file.
 * Returns the raw text output.
 */
function ocrImage(imagePath) {
  try {
    // Use Tesseract with receipt-optimized settings
    const result = execSync(
      `tesseract "${imagePath}" stdout --psm 4 -l eng`,
      { encoding: 'utf8', timeout: 30000 }
    );
    return result;
  } catch (err) {
    console.error(`[OCR] Failed on ${imagePath}: ${err.message}`);
    return null;
  }
}

/**
 * Parse receipt text into line items with product names and prices.
 * Receipt formats vary wildly, but common patterns:
 *   - "Product Name    $X.XX"
 *   - "Product Name    X.XX  T" (T = taxable)
 *   - "PRODUCT NAME         3.49"
 *   - Weight-based: "1.23 lb @ $4.99/lb   $6.14"
 */
function parseReceiptText(text) {
  if (!text) return { items: [], storeName: null };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let storeName = null;

  // Try to detect store name from first few lines
  const storePatterns = [
    { pattern: /market\s*basket/i, name: 'Market Basket' },
    { pattern: /hannaford/i, name: 'Hannaford' },
    { pattern: /stop\s*&?\s*shop/i, name: 'Stop & Shop' },
    { pattern: /shaw'?s/i, name: "Shaw's" },
    { pattern: /aldi/i, name: 'Aldi' },
    { pattern: /trader\s*joe'?s/i, name: "Trader Joe's" },
    { pattern: /whole\s*foods/i, name: 'Whole Foods' },
    { pattern: /price\s*chopper/i, name: 'Price Chopper' },
    { pattern: /costco/i, name: 'Costco' },
    { pattern: /bj'?s/i, name: "BJ's" },
    { pattern: /walmart/i, name: 'Walmart' },
    { pattern: /target/i, name: 'Target' },
    { pattern: /restaurant\s*depot/i, name: 'Restaurant Depot' },
    { pattern: /sysco/i, name: 'Sysco' },
    { pattern: /us\s*foods/i, name: 'US Foods' },
  ];

  for (const line of lines.slice(0, 5)) {
    for (const sp of storePatterns) {
      if (sp.pattern.test(line)) {
        storeName = sp.name;
        break;
      }
    }
    if (storeName) break;
  }

  // Parse line items
  for (const line of lines) {
    // Skip header/footer lines
    if (line.match(/^(subtotal|total|tax|change|cash|credit|debit|visa|mastercard|balance|thank|saved|you|store|date|time|register|cashier|#|\*)/i)) continue;
    if (line.match(/^[\d\/\-]+$/) || line.match(/^\d{2}:\d{2}/)) continue; // Date/time lines

    // Pattern: "PRODUCT NAME    $X.XX" or "PRODUCT NAME    X.XX"
    const priceMatch = line.match(/^(.+?)\s{2,}\$?(\d+\.\d{2})\s*[A-Z]?$/);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);
      if (name.length > 2 && price > 0 && price < 1000) {
        items.push({ name, priceCents: Math.round(price * 100) });
        continue;
      }
    }

    // Pattern: weight-based "1.23 lb @ $4.99/lb   $6.14"
    const weightMatch = line.match(/^([\d.]+)\s*lb\s*@\s*\$?([\d.]+)\s*\/\s*lb\s+\$?([\d.]+)/i);
    if (weightMatch) {
      const perLbPrice = parseFloat(weightMatch[2]);
      // Look at the previous line for the product name
      const idx = lines.indexOf(line);
      if (idx > 0) {
        const prevLine = lines[idx - 1].trim();
        if (prevLine.length > 2 && !prevLine.match(/^\d/)) {
          items.push({ name: prevLine, priceCents: Math.round(perLbPrice * 100), unit: 'lb' });
          continue;
        }
      }
    }

    // Pattern: price at end of line with varying whitespace
    const endPriceMatch = line.match(/^([A-Za-z][\w\s&',.-]+?)\s+(\d+\.\d{2})$/);
    if (endPriceMatch) {
      const name = endPriceMatch[1].trim();
      const price = parseFloat(endPriceMatch[2]);
      if (name.length > 2 && price > 0 && price < 1000) {
        items.push({ name, priceCents: Math.round(price * 100) });
      }
    }
  }

  return { items, storeName };
}

/**
 * Determine the source_id for a receipt based on detected store name.
 */
function getSourceId(storeName) {
  if (!storeName) return 'receipt-unknown';
  const map = {
    'Market Basket': 'market-basket-receipt',
    'Hannaford': 'hannaford-receipt',
    'Stop & Shop': 'stop-and-shop-receipt',
    "Shaw's": 'shaws-receipt',
    'Aldi': 'aldi-receipt',
    "Trader Joe's": 'trader-joes-receipt',
    'Whole Foods': 'whole-foods-receipt',
    'Price Chopper': 'price-chopper-receipt',
    'Costco': 'costco-receipt',
    "BJ's": 'bjs-receipt',
    'Walmart': 'walmart-receipt',
    'Target': 'target-receipt',
    'Restaurant Depot': 'restaurant-depot-receipt',
    'Sysco': 'sysco-receipt',
    'US Foods': 'us-foods-receipt',
  };
  return map[storeName] || 'receipt-unknown';
}

function ensureReceiptSource(db, sourceId, storeName) {
  const tier = ['Sysco', 'US Foods', 'Restaurant Depot'].includes(storeName) ? 'wholesale' : 'retail';
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sourceId, `${storeName || 'Unknown'} (Receipt)`, 'receipt_ocr',
    storeName?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown',
    'MA', 'receipt_ocr', '', 0, tier, 'active', '',
    'Prices extracted from physical receipts via Tesseract OCR. Highest confidence tier.'
  );
}

/**
 * Process a single receipt image file.
 */
function processReceipt(imagePath, db, cachedMappings) {
  const filename = basename(imagePath);
  console.log(`\n  Processing: ${filename}`);

  const text = ocrImage(imagePath);
  if (!text) {
    console.error(`  [${filename}] OCR returned no text`);
    renameSync(imagePath, join(FAILED_DIR, filename));
    return { processed: 0, failed: 1 };
  }

  console.log(`  [${filename}] OCR text (${text.length} chars)`);
  const { items, storeName } = parseReceiptText(text);
  console.log(`  [${filename}] Detected store: ${storeName || 'Unknown'}, Items: ${items.length}`);

  if (items.length === 0) {
    // Save the OCR text for debugging
    writeFileSync(join(FAILED_DIR, `${filename}.txt`), text);
    renameSync(imagePath, join(FAILED_DIR, filename));
    return { processed: 0, failed: 1 };
  }

  const sourceId = getSourceId(storeName);
  ensureReceiptSource(db, sourceId, storeName);

  let newCount = 0, changedCount = 0, skippedCount = 0;

  for (const item of items) {
    if (!isFoodItem(item.name)) { skippedCount++; continue; }
    const normalized = normalizeByRules(item.name, cachedMappings);
    if (!normalized) { skippedCount++; continue; }
    if (item.priceCents <= 0 || item.priceCents > 100000) { skippedCount++; continue; }

    const unit = item.unit || 'each';
    saveMapping(db, item.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

    const result = upsertPrice(db, {
      sourceId,
      canonicalIngredientId: normalized.ingredientId,
      variantId: normalized.variantId,
      rawProductName: item.name,
      priceCents: item.priceCents,
      priceUnit: unit,
      pricePerStandardUnitCents: item.priceCents,
      standardUnit: unit,
      packageSize: null,
      priceType: 'regular',
      pricingTier: sourceId.includes('sysco') || sourceId.includes('us-foods') || sourceId.includes('restaurant-depot') ? 'wholesale' : 'retail',
      confidence: 'exact_receipt',
      sourceUrl: `receipt://${filename}`,
    });

    if (result === 'new') newCount++;
    else if (result === 'changed') changedCount++;
  }

  // Move to processed
  renameSync(imagePath, join(PROCESSED_DIR, filename));
  console.log(`  [${filename}] Done: New=${newCount}, Changed=${changedCount}, Skipped=${skippedCount}`);
  return { processed: 1, failed: 0, newCount, changedCount };
}

/**
 * Scan receipts directory and process any pending images.
 */
function processAllPending(db, cachedMappings) {
  const files = readdirSync(RECEIPTS_DIR).filter(f =>
    ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'].includes(extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log('No pending receipts to process.');
    return;
  }

  console.log(`Found ${files.length} receipt(s) to process`);
  let totalProcessed = 0, totalFailed = 0;

  for (const file of files) {
    const result = processReceipt(join(RECEIPTS_DIR, file), db, cachedMappings);
    totalProcessed += result.processed;
    totalFailed += result.failed;
  }

  console.log(`\nBatch complete: ${totalProcessed} processed, ${totalFailed} failed`);
}

/**
 * HTTP server for receipt upload.
 * POST /upload - multipart form with 'receipt' file field
 * GET /status - check processor health
 */
function startServer(db, cachedMappings) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/status') {
      const pending = readdirSync(RECEIPTS_DIR).filter(f =>
        ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'].includes(extname(f).toLowerCase())
      ).length;
      const processed = readdirSync(PROCESSED_DIR).length;
      const failed = readdirSync(FAILED_DIR).filter(f => !f.endsWith('.txt')).length;

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ status: 'ok', pending, processed, failed }));
    }

    if (url.pathname === '/upload' && req.method === 'POST') {
      // Simple multipart parser for receipt images
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);

      // Extract boundary from content-type
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);

      if (!boundaryMatch) {
        // Assume raw image data
        const filename = `receipt-${Date.now()}.jpg`;
        const filepath = join(RECEIPTS_DIR, filename);
        writeFileSync(filepath, body);
        const result = processReceipt(filepath, db, cachedMappings);

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: true, filename, ...result }));
      }

      // Parse multipart
      const boundary = boundaryMatch[1];
      const parts = body.toString('binary').split(`--${boundary}`);
      let saved = false;

      for (const part of parts) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;
        const headers = part.substring(0, headerEnd);
        const fileContent = part.substring(headerEnd + 4, part.length - 2);

        if (headers.includes('name="receipt"') || headers.includes('name="file"') || headers.includes('name="image"')) {
          const fnMatch = headers.match(/filename="([^"]+)"/);
          const ext = fnMatch ? extname(fnMatch[1]) : '.jpg';
          const filename = `receipt-${Date.now()}${ext}`;
          const filepath = join(RECEIPTS_DIR, filename);
          writeFileSync(filepath, fileContent, 'binary');

          const result = processReceipt(filepath, db, cachedMappings);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, filename, ...result }));
          saved = true;
          break;
        }
      }

      if (!saved) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'No receipt image found in upload' }));
      }
      return;
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /upload or GET /status' }));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt processor API on http://0.0.0.0:${PORT}`);
    console.log(`Upload: curl -F "receipt=@photo.jpg" http://10.0.0.177:${PORT}/upload`);
    console.log(`Status: http://10.0.0.177:${PORT}/status`);
  });
}

async function main() {
  const mode = process.argv[2] || 'server'; // 'server', 'batch', or 'watch'

  console.log('=== OpenClaw Receipt Processor ===');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Mode: ${mode}`);

  // Verify Tesseract is available
  try {
    execSync('tesseract --version', { encoding: 'utf8' });
  } catch {
    console.error('ERROR: Tesseract not installed. Run: sudo apt-get install -y tesseract-ocr');
    process.exit(1);
  }

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  if (mode === 'batch') {
    processAllPending(db, cachedMappings);
  } else if (mode === 'watch') {
    // Process pending then watch for new files
    processAllPending(db, cachedMappings);
    console.log(`\nWatching ${RECEIPTS_DIR} for new receipts...`);
    const { watch } = await import('fs');
    watch(RECEIPTS_DIR, (eventType, filename) => {
      if (!filename || eventType !== 'rename') return;
      const ext = extname(filename).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.webp'].includes(ext)) return;
      const filepath = join(RECEIPTS_DIR, filename);
      if (!existsSync(filepath)) return;
      // Small delay to ensure file write is complete
      setTimeout(() => {
        processReceipt(filepath, db, cachedMappings);
      }, 1000);
    });
  } else {
    // Server mode: HTTP upload + process pending on startup
    processAllPending(db, cachedMappings);
    startServer(db, cachedMappings);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
