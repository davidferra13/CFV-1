/**
 * OpenClaw - Whole Foods Scraper (v3 - Amazon ALM Platform, Relaxed Filters)
 *
 * v3 changes from v2:
 * - Dramatically reduced PREPARED_FOOD_PATTERNS (was filtering out 300+ real ingredients)
 * - Kept: truly composite prepared meals (sushi, rotisserie, pizza, cakes)
 * - Removed from filter: broths, stocks, canned goods, smoked meats, cheeses,
 *   powdered spices, ham, starch, salads, peppercorns, tallow/lard, buttermilk
 * - Chefs buy ALL of these. Filtering them was cutting our catalog in half.
 * - Raised name length heuristic from 80 to 150 chars
 *
 * Multi-region: scrapes Haverhill MA and Portland ME for New England coverage.
 */

import { getDb, upsertPrice } from '../lib/db.mjs';
import { launchBrowser, newPage, sleep, rateLimitDelay } from '../lib/scrape-utils.mjs';
import { normalizeByRules, isFoodItem, loadCachedMappings, saveMapping } from '../lib/normalize-rules.mjs';

const WF_BRAND_ID = 'VUZHIFdob2xlIEZvb2Rz';
const BASE_URL = 'https://www.wholefoodsmarket.com';

const REGIONS = [
  // New England (existing)
  { zip: '01835', label: 'Haverhill, MA', sourceId: 'whole-foods-haverhill-ma', state: 'MA' },
  { zip: '04101', label: 'Portland, ME', sourceId: 'whole-foods-portland-me', state: 'ME' },
  // Southeast
  { zip: '29201', label: 'Columbia, SC', sourceId: 'whole-foods-columbia-sc', state: 'SC' },
  { zip: '28202', label: 'Charlotte, NC', sourceId: 'whole-foods-charlotte-nc', state: 'NC' },
  { zip: '30301', label: 'Atlanta, GA', sourceId: 'whole-foods-atlanta-ga', state: 'GA' },
  { zip: '33101', label: 'Miami, FL', sourceId: 'whole-foods-miami-fl', state: 'FL' },
  // Mid-Atlantic
  { zip: '10001', label: 'New York, NY', sourceId: 'whole-foods-new-york-ny', state: 'NY' },
  { zip: '20001', label: 'Washington, DC', sourceId: 'whole-foods-washington-dc', state: 'DC' },
  { zip: '19101', label: 'Philadelphia, PA', sourceId: 'whole-foods-philadelphia-pa', state: 'PA' },
  // Midwest
  { zip: '60601', label: 'Chicago, IL', sourceId: 'whole-foods-chicago-il', state: 'IL' },
  { zip: '55401', label: 'Minneapolis, MN', sourceId: 'whole-foods-minneapolis-mn', state: 'MN' },
  // South / Southwest
  { zip: '75201', label: 'Dallas, TX', sourceId: 'whole-foods-dallas-tx', state: 'TX' },
  { zip: '77001', label: 'Houston, TX', sourceId: 'whole-foods-houston-tx', state: 'TX' },
  { zip: '73301', label: 'Austin, TX', sourceId: 'whole-foods-austin-tx', state: 'TX' },
  { zip: '37201', label: 'Nashville, TN', sourceId: 'whole-foods-nashville-tn', state: 'TN' },
  // West
  { zip: '90001', label: 'Los Angeles, CA', sourceId: 'whole-foods-los-angeles-ca', state: 'CA' },
  { zip: '94102', label: 'San Francisco, CA', sourceId: 'whole-foods-san-francisco-ca', state: 'CA' },
  { zip: '98101', label: 'Seattle, WA', sourceId: 'whole-foods-seattle-wa', state: 'WA' },
  { zip: '97201', label: 'Portland, OR', sourceId: 'whole-foods-portland-or', state: 'OR' },
  { zip: '80201', label: 'Denver, CO', sourceId: 'whole-foods-denver-co', state: 'CO' },
  { zip: '85001', label: 'Phoenix, AZ', sourceId: 'whole-foods-phoenix-az', state: 'AZ' },
];

const CATEGORIES = [
  { name: 'Produce',              node: '6506977011' },
  { name: 'Meat & Seafood',       node: '371469011' },
  { name: 'Breads & Bakery',      node: '16318751' },
  { name: 'Deli & Prepared Foods', node: '18773724011' },
  { name: 'Dairy, Cheese & Eggs', node: '371460011' },
  { name: 'Frozen Foods',         node: '6459122011' },
  { name: 'Pantry',               node: '18787303011' },
];

/**
 * Prepared food filter v3 - MUCH more targeted.
 *
 * Only filters out truly composite prepared meals that are NOT raw ingredients.
 * Chefs absolutely buy: broth, stock, canned goods, smoked salmon, ham, cheeses,
 * garlic powder, cornstarch, salad mix, peppercorns, lard, buttermilk, etc.
 */
const PREPARED_FOOD_PATTERNS = [
  // Prepared meals and assembled dishes (not raw ingredients)
  /\b(sushi|rangoons?|dumplings?|wontons?|samosas?|burritos?|wraps?|tacos?|quesadillas?|pierog(i|ies))\b/i,
  /\b(pizzas?|lasagnas?|calzones?|pot pies?|casseroles?|meal kits?|quiche|entrees?)\b/i,
  /\b(sandwich(es)?|paninis?|sliders?)\b/i,
  // Baked goods (composite, not raw)
  /\b(cakes?|shortcakes?|cupcakes?|cheesecakes?|brownies?|cookies?|muffins?|scones?|donuts?|pastries|pastr?y|tarts?)\b/i,
  // Snacks (composite processed products)
  /\b(chips?|poppables|nuggets?|popcorn|pretzels?|puffs?|tots|fries|rings)\b/i,
  /\b(protein bar|energy bar|granola bar)\b/i,
  // Frozen desserts
  /\b(ice cream|gelato|sorbet|frozen yogurt|popsicles?)\b/i,
  // Mac and cheese
  /\b(mac and cheese|mac & cheese|mac shells|mac cheese)\b/i,
  // Baking mixes (not raw ingredients)
  /\b(baking mix|cake mix|pancake mix|muffin mix)\b/i,
  // Egg preparations (not raw eggs)
  /\b(egg bites|egg sandwich|egg rolls?|scotch eggs?)\b/i,
  // Spring rolls, pot stickers
  /\b(spring rolls?|pot stickers?|gyoza)\b/i,
  // Prepared proteins (rotisserie, pre-cooked, breaded)
  /\b(rotisserie)\b/i,
  /\b(cod cakes?|crab cakes?|fish cakes?|salmon cakes?|meatballs?|meat loaf|meatloaf)\b/i,
  /\b(battered|breaded)\b/i,
  // Nut butters (not dairy butter)
  /\b(peanut butter|almond butter|cashew butter|sunflower butter|seed butter|nut butter|cookie butter)\b/i,
  // Marshmallow, frosting, candy
  /\b(marshmallows?|frosting|icing)\b/i,
  // Jerky
  /\b(jerky|jerkies)\b/i,
  // Riced vegetables (prepared)
  /\b(riced cauliflower|riced broccoli)\b/i,
];

// Products that ARE raw ingredients, even if they match a prepared pattern
const PREPARED_FOOD_EXCEPTIONS = [
  // Fresh produce
  /^(organic |conventional )?(green |red |yellow |sweet )?(onion|garlic|potato|tomato|pepper|bean|pea|carrot|celery|cucumber|squash|zucchini|asparagus|fennel|leek|beet|turnip|radish|corn\b)/i,
  /^(organic |conventional )?(large |small |hass )?(avocado|banana|apple|orange|lemon|lime|mango|peach|pear|plum|grape|berry|melon|pineapple|kiwi|grapefruit|nectarine)\b/i,
  // Raw meat cuts
  /\b(ground beef|ground turkey|ground pork|ground chicken|ground lamb|ground bison)\b/i,
  /\b(breast|thigh|drumstick|wing|tenderloin|sirloin|ribeye|chuck|flank|brisket)\b/i,
  /\b(fillet|filet|steak|chop|roast|loin|rack|shank)\b/i,
  /\b(pork shoulder|pork butt|pork belly)\b/i,
  /\b(whole chicken|whole turkey)\b/i,
  // Greens & herbs
  /\b(baby spinach|mixed greens|arugula|kale|lettuce|romaine|spring mix|salad mix|salad greens|salad kit)\b/i,
  /^(organic )?(dill|parsley|cilantro|basil|rosemary|thyme|oregano|mint|chive|sage|tarragon)\b/i,
  // Raw seafood
  /\b(salmon fillet|cod fillet|halibut fillet|swordfish steak|tuna steak)\b/i,
  /\b(shrimp .*(count|peeled|deveined|raw|shell))\b/i,
  // Cheeses (all real ingredients chefs buy)
  /\b(cheddar|mozzarella|parmesan|parmigiano|swiss|provolone|gouda|brie|camembert|gruyere|manchego|havarti|fontina|muenster|feta|goat cheese|ricotta|cream cheese|cottage cheese|colby|monterey|pepper jack)\b/i,
  // Pantry staples that were incorrectly filtered
  /\b(broth|stock|bouillon)\b/i,
  /\b(canned|jarred|pickled|preserved)\b/i,
  /\b(sardines?|anchovies|tuna)\b/i,
  /\b(smoked salmon|smoked paprika|smoked salt)\b/i,
  /\b(ham|prosciutto|pancetta)\b/i,
  /\b(cornstarch|starch|arrowroot)\b/i,
  /\b(garlic powder|onion powder|chili powder|cocoa powder|baking powder)\b/i,
  /\b(peppercorns?|black pepper|white pepper)\b/i,
  /\b(lard|tallow|shortening)\b/i,
  /\b(buttermilk)\b/i,
  /\b(granola|oatmeal|oats)\b/i,
  /\b(cereal)\b/i,
  /\b(bread|bagel|tortilla|pita|naan|ciabatta|baguette|croissant)\b/i,
  /\b(crackers?)\b/i,
  /\b(chocolate chips?|baking chips?|morsels)\b/i,
  /\b(salad mix|salad greens|mixed greens|spring mix)\b/i,
];

function isPreparedFood(name) {
  const lower = name.toLowerCase();

  // Check exceptions FIRST - if it's a known raw ingredient, keep it
  if (PREPARED_FOOD_EXCEPTIONS.some(e => e.test(lower))) return false;

  // Then check prepared patterns
  if (PREPARED_FOOD_PATTERNS.some(p => p.test(lower))) return true;

  // Very long names are usually SEO-stuffed packaged products, but raise the bar
  if (name.length > 150) return true;

  return false;
}

function ensureSourceExists(db, region) {
  db.prepare(`
    INSERT OR IGNORE INTO source_registry (source_id, name, type, chain_id, state, scrape_method, scrape_url, has_online_pricing, pricing_tier, status, website, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    region.sourceId,
    'Whole Foods (' + region.label + ')',
    'retail_chain', 'whole-foods', region.state,
    'direct_website', BASE_URL, 1, 'retail', 'active',
    BASE_URL, 'Amazon ALM platform. Zip: ' + region.zip
  );
}

async function setZipCode(page, zip) {
  try {
    const locationBtn = await page.$('button.cursor-pointer');
    if (!locationBtn) {
      console.log('  [zip] No location button found, proceeding with default');
      return false;
    }
    await locationBtn.click();
    await sleep(2000);

    const clicked = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="radio"]');
      for (const tab of tabs) {
        if (tab.textContent.trim() === 'Delivery') { tab.click(); return true; }
      }
      return false;
    });

    if (!clicked) {
      await page.keyboard.press('Escape');
      return false;
    }
    await sleep(2000);

    const zipInput = await page.$('input[name="zipCode"], input[name="zipcode"], input[placeholder*="zip" i]');
    if (!zipInput) {
      await page.keyboard.press('Escape');
      return false;
    }

    await zipInput.click({ clickCount: 3 });
    await zipInput.type(zip, { delay: 50 });
    await sleep(500);

    const applied = await page.evaluate(() => {
      for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent.trim() === 'Apply') { btn.click(); return true; }
      }
      return false;
    });
    if (!applied) await page.keyboard.press('Enter');
    await sleep(3000);

    const continued = await page.evaluate(() => {
      for (const btn of document.querySelectorAll('button')) {
        if (btn.textContent.trim() === 'Continue') { btn.click(); return true; }
      }
      return false;
    });
    await sleep(2000);
    console.log('  [zip] Set delivery zip to ' + zip);
    return true;
  } catch (err) {
    console.log('  [zip] Could not set zip: ' + err.message);
    return false;
  }
}

async function extractProducts(page) {
  return page.evaluate(() => {
    const items = [];
    const seen = new Set();
    const cards = document.querySelectorAll('.a-carousel-card:not(.a-carousel-card-empty)');

    for (const card of cards) {
      try {
        const imgEl = card.querySelector('img[alt]');
        let name = imgEl ? imgEl.alt.trim() : '';
        if (!name) {
          const linkEl = card.querySelector('a[href*="/dp/"]');
          if (linkEl) name = linkEl.textContent.trim();
        }
        if (!name || name.length < 3) continue;

        const priceEl = card.querySelector('.a-price .a-offscreen');
        const priceText = priceEl ? priceEl.textContent.trim() : '';
        if (!priceText) continue;

        const priceRow = card.querySelector('[class*="priceRow"]');
        const priceRowText = priceRow ? priceRow.textContent.trim() : '';

        let size = '';
        for (const s of card.querySelectorAll('span')) {
          const t = s.textContent.trim();
          if (/^\d+\.?\d*\s*(oz|ounce|lb|pound|gallon|gal|ct|count|pack|fl oz)/i.test(t) && t.length < 30) {
            size = t;
            break;
          }
        }

        const strikeEl = card.querySelector('[class*="strikeThroughPrice"] .a-offscreen, .a-text-price .a-offscreen');
        const strikePrice = strikeEl ? strikeEl.textContent.trim() : '';

        const key = name + '|' + priceText;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({ name, priceText, priceRowText, size, strikePrice });
      } catch {}
    }
    return items;
  });
}

function parsePriceCents(priceText) {
  if (!priceText) return null;
  const match = priceText.match(/\$?([\d,]+\.[\d]{2})/);
  if (!match) return null;
  const price = parseFloat(match[1].replace(',', ''));
  if (price <= 0 || price > 1000) return null;
  return Math.round(price * 100);
}

function detectUnit(name, size, priceRowText) {
  const combined = (name + ' ' + size + ' ' + priceRowText).toLowerCase();
  if (combined.includes('/lb') || combined.includes('per lb') || combined.includes('per pound')) return 'lb';
  if (combined.includes('/oz') || combined.includes('per oz') || combined.includes('per ounce')) return 'oz';
  if (combined.includes('/gal') || combined.includes('per gallon')) return 'gallon';
  if (/\b(chicken breast|beef|pork|turkey|salmon|cod|shrimp|steak|roast|chop|fillet|filet|lamb|veal|sea bass|tilapia|halibut|swordfish|tuna steak|crab|lobster)\b/.test(combined)) return 'lb';
  if (/\b(deli|charcuterie|sliced|in house)\b/.test(combined) && /\b(turkey|ham|roast beef|salami|bologna)\b/.test(combined)) return 'lb';
  if (/\b(milk|cream)\b/.test(combined) && /\b(gallon|gal|half gallon)\b/.test(combined)) return 'gallon';
  if (/\b(egg)\b/.test(combined) && /\b(dozen|12|18)\b/.test(combined)) return 'dozen';
  const sizeMatch = size.match(/([\d.]+)\s*(oz|ounce|lb|pound|gallon|gal|fl oz)/i);
  if (sizeMatch) {
    const u = sizeMatch[2].toLowerCase();
    if (u.includes('lb') || u.includes('pound')) return 'lb';
    if (u.includes('gal')) return 'gallon';
    if (u.includes('oz')) return 'oz';
  }
  return 'each';
}

async function scrapeCategory(page, category, retries = 1) {
  const url = BASE_URL + '/alm/category/?almBrandId=' + WF_BRAND_ID + '&node=' + category.node;
  console.log('  [' + category.name + '] Loading ' + url);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (err) {
    console.error('  [' + category.name + '] Failed to load: ' + err.message);
    return [];
  }

  await sleep(5000);

  try {
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await sleep(1500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(1000);
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await sleep(800);
    }

    const products = await extractProducts(page);
    console.log('  [' + category.name + '] Found ' + products.length + ' products');
    return products;
  } catch (err) {
    if (err.message.includes('detached Frame') && retries > 0) {
      await sleep(3000);
      return scrapeCategory(page, category, retries - 1);
    }
    console.error('  [' + category.name + '] Error: ' + err.message);
    return [];
  }
}

async function scrapeRegion(browser, region, db, cachedMappings) {
  console.log('\n========================================');
  console.log('Region: ' + region.label + ' (' + region.zip + ')');
  console.log('========================================');

  ensureSourceExists(db, region);

  {
    const setupPage = await newPage(browser);
    console.log('\n--- Setting delivery location ---');
    await setupPage.goto(BASE_URL + '?almBrandId=' + WF_BRAND_ID, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);
    await setZipCode(setupPage, region.zip);
    try { await setupPage.close(); } catch {}
  }

  let totalNew = 0, totalChanged = 0, totalUnchanged = 0;
  let totalSkippedPrepared = 0, totalSkippedNonFood = 0;
  let totalSkippedNoNorm = 0, totalSkippedNoPrice = 0;

  for (const category of CATEGORIES) {
    console.log('\n--- ' + category.name + ' ---');
    const page = await newPage(browser);
    let products;
    try {
      products = await scrapeCategory(page, category);
    } finally {
      try { await page.close(); } catch {}
    }

    for (const product of products) {
      if (!isFoodItem(product.name)) { totalSkippedNonFood++; continue; }
      if (isPreparedFood(product.name)) { totalSkippedPrepared++; continue; }

      const normalized = normalizeByRules(product.name, cachedMappings);
      if (!normalized) { totalSkippedNoNorm++; continue; }

      const priceCents = parsePriceCents(product.priceText);
      if (!priceCents) { totalSkippedNoPrice++; continue; }

      const unit = detectUnit(product.name, product.size, product.priceRowText);
      saveMapping(db, product.name, normalized.ingredientId, normalized.variantId, normalized.method, normalized.confidence);

      const result = upsertPrice(db, {
        sourceId: region.sourceId,
        canonicalIngredientId: normalized.ingredientId,
        variantId: normalized.variantId,
        rawProductName: product.name,
        priceCents,
        priceUnit: unit,
        pricePerStandardUnitCents: priceCents,
        standardUnit: unit,
        packageSize: product.size || null,
        priceType: product.strikePrice ? 'sale' : 'regular',
        pricingTier: 'retail',
        confidence: 'direct_scrape',
        sourceUrl: BASE_URL + '/alm/category/?almBrandId=' + WF_BRAND_ID,
        imageUrl: null,
        brand: null,
        aisleCat: category.name,
      });

      if (result === 'new') totalNew++;
      else if (result === 'changed') totalChanged++;
      else totalUnchanged++;
    }

    await rateLimitDelay();
  }

  db.prepare("UPDATE source_registry SET last_scraped_at = datetime('now') WHERE source_id = ?").run(region.sourceId);

  console.log('\n=== ' + region.label + ' Results ===');
  console.log('  New: ' + totalNew);
  console.log('  Changed: ' + totalChanged);
  console.log('  Unchanged: ' + totalUnchanged);
  console.log('  Skipped (non-food): ' + totalSkippedNonFood);
  console.log('  Skipped (prepared): ' + totalSkippedPrepared);
  console.log('  Skipped (no normalization): ' + totalSkippedNoNorm);
  console.log('  Skipped (no price): ' + totalSkippedNoPrice);

  return { new: totalNew, changed: totalChanged, unchanged: totalUnchanged };
}

async function main() {
  const regionArg = process.argv.find(a => a.startsWith('--region='));
  let regionsToScrape = REGIONS;
  if (regionArg) {
    const name = regionArg.split('=')[1].toLowerCase();
    regionsToScrape = REGIONS.filter(r => r.label.toLowerCase().includes(name));
  }

  console.log('=== OpenClaw Whole Foods Scraper (v3 - Relaxed Filters) ===');
  console.log('Time: ' + new Date().toISOString());
  console.log('Regions: ' + regionsToScrape.map(r => r.label).join(', '));

  const db = getDb();
  const cachedMappings = loadCachedMappings(db);

  let browser;
  try {
    browser = await launchBrowser();

    for (let i = 0; i < regionsToScrape.length; i++) {
      try {
        await scrapeRegion(browser, regionsToScrape[i], db, cachedMappings);
      } catch (err) {
        console.error('ERROR: Region ' + regionsToScrape[i].label + ': ' + err.message);
        try { await browser.close(); } catch {}
        browser = await launchBrowser();
      }

      if (i < regionsToScrape.length - 1) {
        console.log('\n--- 10s pause before next region ---');
        await sleep(10000);
      }
    }
  } catch (err) {
    console.error('FATAL: ' + err.message);
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n=== Done (' + new Date().toISOString() + ') ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
