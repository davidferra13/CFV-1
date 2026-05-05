import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const DEFAULT_DELAY_MS = 1500
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const FOOD_WORDS =
  /\b(apple|banana|orange|berry|berries|grape|avocado|lemon|lime|mango|melon|tomato|potato|onion|garlic|pepper|lettuce|spinach|broccoli|carrot|celery|cucumber|corn|bean|asparagus|zucchini|cabbage|kale|chicken|beef|pork|turkey|steak|bacon|sausage|ham|salmon|shrimp|fish|tilapia|cod|tuna|egg|tofu|milk|butter|cheese|cream|yogurt|bread|flour|sugar|oil|rice|pasta|spaghetti|broth|soup|peanut|honey|syrup|vinegar|sauce|salt|pepper|spice|cereal|oatmeal|tortilla|chips|cracker|coffee|tea|juice|water|soda|ramen|frozen|waffle|pizza|snack|chocolate|candy|cookie|nuts?)\b/i

const NON_FOOD_WORDS =
  /\b(paper towel|toilet paper|napkin|battery|batteries|detergent|soap|shampoo|conditioner|deodorant|toothpaste|toothbrush|razor|diaper|wipes?|cleaner|bleach|foil|trash bag|storage bag|fabric|litter|cat food|dog food|pet food|toy|notebook|marker|pen|plate|cup|bowl|fork|spoon|candle|laundry|dish pod|dish soap|sunscreen|makeup|medicine|vitamin)\b/i

export const CHAIN_CONFIGS = {
  publix: {
    label: 'Publix',
    tier: 1,
    chainSlugs: ['publix', 'publix_greenwise_market'],
    instacartSlugs: ['publix'],
    priceType: 'retail',
  },
  heb: {
    label: 'H-E-B',
    tier: 1,
    chainSlugs: ['heb', 'h_e_b'],
    instacartSlugs: ['h-e-b'],
    priceType: 'retail',
  },
  meijer: {
    label: 'Meijer',
    tier: 1,
    chainSlugs: ['meijer'],
    instacartSlugs: ['meijer'],
    priceType: 'retail',
  },
  'food-lion': {
    label: 'Food Lion',
    tier: 1,
    chainSlugs: ['food_lion'],
    instacartSlugs: ['food-lion'],
    priceType: 'retail',
  },
  'giant-eagle': {
    label: 'Giant Eagle',
    tier: 1,
    chainSlugs: ['giant_eagle'],
    instacartSlugs: ['giant-eagle'],
    priceType: 'retail',
  },
  'giant-food': {
    label: 'Giant Food',
    tier: 1,
    chainSlugs: ['giant_food', 'giant'],
    instacartSlugs: ['giant'],
    priceType: 'retail',
  },
  'stop-and-shop': {
    label: 'Stop & Shop',
    tier: 1,
    chainSlugs: ['stop_and_shop'],
    instacartSlugs: ['stop-shop'],
    priceType: 'retail',
  },
  hannaford: {
    label: 'Hannaford',
    tier: 1,
    chainSlugs: ['hannaford'],
    instacartSlugs: ['hannaford'],
    priceType: 'retail',
  },
  'trader-joes': {
    label: "Trader Joe's",
    tier: 1,
    chainSlugs: ['trader_joes'],
    instacartSlugs: [],
    skipReason:
      "Trader Joe's does not expose a current Instacart storefront; use Flipp/manual circular ingestion when available.",
    priceType: 'retail',
  },
  sprouts: {
    label: 'Sprouts Farmers Market',
    tier: 1,
    chainSlugs: ['sprouts', 'sprouts_farmers_market', 'sprouts_farmer_market'],
    instacartSlugs: ['sprouts'],
    priceType: 'retail',
  },
  winco: {
    label: 'WinCo Foods',
    tier: 1,
    chainSlugs: ['winco', 'winco_foods'],
    instacartSlugs: ['winco-foods'],
    priceType: 'retail',
  },
  'hy-vee': {
    label: 'Hy-Vee',
    tier: 1,
    chainSlugs: ['hy_vee'],
    instacartSlugs: ['hy-vee', 'hy-vee-rapid-grocery'],
    priceType: 'retail',
  },
  'harris-teeter': {
    label: 'Harris Teeter',
    tier: 1,
    chainSlugs: ['harris_teeter'],
    instacartSlugs: ['harristeeter'],
    priceType: 'retail',
  },
  safeway: {
    label: 'Safeway',
    tier: 1,
    chainSlugs: ['safeway'],
    instacartSlugs: ['safeway'],
    priceType: 'retail',
  },
  albertsons: {
    label: 'Albertsons',
    tier: 1,
    chainSlugs: ['albertsons', 'albertsons_market'],
    instacartSlugs: ['albertsons'],
    priceType: 'retail',
  },
  'safeway-albertsons': {
    label: 'Safeway/Albertsons',
    tier: 1,
    chainSlugs: ['safeway', 'albertsons', 'albertsons_market'],
    instacartSlugs: ['safeway', 'albertsons'],
    priceType: 'retail',
  },
  'piggly-wiggly': {
    label: 'Piggly Wiggly',
    tier: 2,
    chainSlugs: ['piggly_wiggly'],
    instacartSlugs: [
      'piggly-wiggly-southeast',
      'shopthepig',
      'piggly-wiggly-2030694922264244346',
    ],
    priceType: 'retail',
  },
  'winn-dixie': {
    label: 'Winn-Dixie',
    tier: 2,
    chainSlugs: ['winn_dixie'],
    instacartSlugs: ['winn-dixie'],
    priceType: 'retail',
  },
  'grocery-outlet': {
    label: 'Grocery Outlet',
    tier: 2,
    chainSlugs: ['grocery_outlet'],
    instacartSlugs: ['grocery-outlet'],
    priceType: 'retail',
  },
  'save-a-lot': {
    label: 'Save-A-Lot',
    tier: 2,
    chainSlugs: ['save_a_lot'],
    instacartSlugs: ['savealot'],
    priceType: 'retail',
  },
  'aldi-sud': {
    label: 'Aldi Sud / ALDI U.S.',
    tier: 2,
    chainSlugs: ['aldi'],
    instacartSlugs: [],
    skipReason:
      'ALDI U.S. is already in the existing priced-chain list; mission rules say not to re-scrape it.',
    priceType: 'retail',
  },
  'dollar-general': {
    label: 'Dollar General',
    tier: 2,
    chainSlugs: ['dollar_general', 'dollar_general_market'],
    instacartSlugs: ['dollar-general'],
    foodOnly: true,
    priceType: 'convenience',
  },
  'dollar-tree': {
    label: 'Dollar Tree',
    tier: 2,
    chainSlugs: ['dollar_tree'],
    instacartSlugs: ['dollar-tree'],
    foodOnly: true,
    priceType: 'convenience',
  },
  bjs: {
    label: "BJ's Wholesale Club",
    tier: 2,
    chainSlugs: ['bjs', 'bj_s_wholesale_club'],
    instacartSlugs: ['bjs'],
    priceType: 'club',
  },
  'sams-club': {
    label: "Sam's Club",
    tier: 2,
    chainSlugs: ['sams_club', 'sam_s_club'],
    instacartSlugs: ['sams-club'],
    priceType: 'club',
  },
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    chain: null,
    state: null,
    dryRun: false,
    resume: false,
    maxStores: null,
    limitProducts: null,
    delayMs: DEFAULT_DELAY_MS,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const [key, inlineValue] = arg.split('=')
    const nextValue = () => inlineValue ?? argv[++i]

    if (key === '--chain') args.chain = nextValue()
    else if (key === '--state') args.state = nextValue()?.toUpperCase()
    else if (key === '--dry-run') args.dryRun = true
    else if (key === '--resume') args.resume = true
    else if (key === '--max-stores') args.maxStores = Number(nextValue())
    else if (key === '--limit-products') args.limitProducts = Number(nextValue())
    else if (key === '--delay-ms') args.delayMs = Number(nextValue())
  }

  return args
}

export async function runCli(defaultChain) {
  const args = parseArgs()
  if (!args.chain) args.chain = defaultChain
  await runChainScraper(args)
}

export async function runChainScraper(args) {
  const chainSlug = args.chain
  const config = CHAIN_CONFIGS[chainSlug]
  if (!config) {
    throw new Error(
      `Unknown chain "${chainSlug}". Known chains: ${Object.keys(CHAIN_CONFIGS).join(', ')}`
    )
  }

  const checkpointPath = path.resolve(
    process.cwd(),
    '.openclaw-temp',
    `scraper-${chainSlug}-progress.json`
  )
  const checkpoint = args.resume ? readCheckpoint(checkpointPath) : {}

  console.log(`=== OpenClaw price scraper: ${config.label} (${chainSlug}) ===`)
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Database: ${process.env.DATABASE_URL || DEFAULT_DATABASE_URL}`)
  console.log(
    `Flags: state=${args.state || 'ALL'} dryRun=${args.dryRun} resume=${args.resume} maxStores=${args.maxStores || 'ALL'}`
  )

  if (config.skipReason) {
    console.log(`SKIPPED: ${config.skipReason}`)
    writeCheckpoint(checkpointPath, {
      ...checkpoint,
      chain: chainSlug,
      status: 'skipped',
      reason: config.skipReason,
      updatedAt: new Date().toISOString(),
    })
    return { skipped: true, reason: config.skipReason }
  }

  const sql = postgres(process.env.DATABASE_URL || DEFAULT_DATABASE_URL, {
    max: 5,
    idle_timeout: 30,
  })

  try {
    const products = await scrapeInstacartProducts(config, args)
    const limitedProducts = args.limitProducts
      ? products.slice(0, args.limitProducts)
      : products

    console.log(
      `Products found: ${products.length}${limitedProducts.length !== products.length ? ` (limited to ${limitedProducts.length})` : ''}`
    )

    const states = args.state
      ? [args.state]
      : await listChainStates(sql, config.chainSlugs)

    let totalStores = 0
    let totalPrices = 0

    for (const state of states) {
      const stateResult = await ingestState({
        sql,
        config,
        chainSlug,
        state,
        products: limitedProducts,
        args,
        checkpoint,
        checkpointPath,
      })
      totalStores += stateResult.storesScraped
      totalPrices += stateResult.pricesInserted
    }

    const result = {
      chain: chainSlug,
      stateCount: states.length,
      storesScraped: totalStores,
      productsFound: limitedProducts.length,
      pricesInserted: totalPrices,
      dryRun: args.dryRun,
      updatedAt: new Date().toISOString(),
    }
    console.log(
      `DONE chain=${chainSlug} states=${states.length} stores_scraped=${totalStores} products_found=${limitedProducts.length} prices_inserted=${totalPrices}`
    )
    if (!args.dryRun) {
      writeCheckpoint(checkpointPath, { ...checkpoint, ...result, status: 'done' })
    }
    return result
  } finally {
    await sql.end()
  }
}

async function scrapeInstacartProducts(config, args) {
  const deduped = new Map()
  let lastError = null

  for (const instacartSlug of config.instacartSlugs) {
    const url = `https://www.instacart.com/store/${instacartSlug}/storefront`
    try {
      await delay(args.delayMs)
      const html = await fetchText(url)
      const products = extractProductsFromInstacartHtml(html, {
        sourceUrl: url,
        sourceSlug: instacartSlug,
        foodOnly: config.foodOnly,
      })
      console.log(
        `Source ${url}: ${products.length} product prices${config.foodOnly ? ' after food filter' : ''}`
      )
      for (const product of products) {
        const key = [
          normalizeText(product.name),
          normalizeText(product.brand || ''),
          normalizeText(product.size || ''),
          product.priceCents,
          product.salePriceCents || '',
        ].join('|')
        if (!deduped.has(key)) deduped.set(key, product)
      }
    } catch (error) {
      lastError = error
      console.log(`Source ${url}: failed (${error.message})`)
    }
  }

  if (deduped.size === 0 && lastError) {
    throw lastError
  }

  return [...deduped.values()]
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': DEFAULT_USER_AGENT,
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.text()
}

export function extractProductsFromInstacartHtml(html, options = {}) {
  const scriptMatches = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/g
    ),
  ]
  const products = []

  for (const match of scriptMatches) {
    let body = decodeHtmlEntities(match[1].trim())
    try {
      body = decodeURIComponent(body)
    } catch {}

    try {
      const parsed = JSON.parse(body)
      walkInstacartJson(parsed, products, options)
    } catch {}
  }

  const byProduct = new Map()
  for (const product of products) {
    if (!product.name || !product.priceCents) continue
    if (options.foodOnly && !isLikelyFood(product)) continue
    const key = product.externalProductId || `${product.name}|${product.size}|${product.priceCents}`
    if (!byProduct.has(key)) byProduct.set(key, product)
  }
  return [...byProduct.values()]
}

function walkInstacartJson(value, products, options, depth = 0) {
  if (!value || depth > 35) return
  if (Array.isArray(value)) {
    for (const item of value) walkInstacartJson(item, products, options, depth + 1)
    return
  }
  if (typeof value !== 'object') return

  const typename = value.__typename || ''
  const priceSection = value.price?.viewSection
  const name = typeof value.name === 'string' ? value.name.trim() : null

  if (name && priceSection && typename.includes('Item')) {
    const current = firstPriceCents(
      priceSection.priceValueString,
      priceSection.priceString,
      priceSection.itemCard?.priceAriaLabelString,
      priceSection.itemCard?.priceString,
      priceSection.itemDetails?.priceAriaLabelString,
      priceSection.itemDetails?.priceString
    )
    const original = firstPriceCents(
      priceSection.originalPriceString,
      priceSection.itemDetails?.originalPriceString,
      priceSection.itemCard?.fullPriceString,
      priceSection.itemCard?.priceAriaLabelString,
      priceSection.badge?.trackingProperties?.price
    )
    if (current) {
      const onSale = Boolean(original && original > current)
      products.push({
        name,
        brand: value.brandName || value.brand?.name || null,
        size: value.size || null,
        category: inferCategory(name),
        upc: firstString(value.upc, value.upcs?.[0], value.barcode),
        imageUrl: extractImageUrl(value),
        externalProductId: firstString(
          value.productId,
          value.legacyId,
          value.legacyV3Id,
          value.id
        ),
        priceCents: onSale ? original : current,
        salePriceCents: onSale ? current : null,
        baselinePriceCents: original || null,
        isSale: onSale,
        sourceUrl: options.sourceUrl,
        sourceSlug: options.sourceSlug,
      })
    }
  }

  for (const child of Object.values(value)) {
    walkInstacartJson(child, products, options, depth + 1)
  }
}

function extractImageUrl(item) {
  const candidates = [
    item.imageUrl,
    item.image_url,
    item.viewSection?.imageUrl,
    item.itemImage?.url,
  ]
  for (const image of item.images || []) {
    if (typeof image?.url === 'string') candidates.push(image.url)
    for (const size of image?.sizes || []) {
      if (typeof size?.url === 'string') candidates.push(size.url)
    }
  }
  return candidates.find((url) => typeof url === 'string' && url.startsWith('http')) || null
}

function parsePriceCents(value) {
  if (!value || typeof value !== 'string') return null
  const match = value
    .replace(/,/g, '')
    .match(/\$?([0-9]+(?:\.[0-9]{1,2})?)/)
  if (!match) return null
  const cents = Math.round(Number(match[1]) * 100)
  if (!Number.isFinite(cents) || cents <= 0 || cents > 200000) return null
  return cents
}

function firstPriceCents(...values) {
  for (const value of values) {
    const cents = parsePriceCents(value)
    if (cents) return cents
  }
  return null
}

function firstString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || null
}

function isLikelyFood(product) {
  const text = `${product.name} ${product.category || ''}`.toLowerCase()
  if (NON_FOOD_WORDS.test(text)) return false
  return FOOD_WORDS.test(text)
}

function inferCategory(name) {
  const text = name.toLowerCase()
  if (/\b(chicken|beef|pork|turkey|steak|bacon|sausage|ham|salmon|shrimp|fish|seafood|tofu)\b/.test(text)) return 'meat-seafood'
  if (/\b(apple|banana|orange|berry|berries|grape|avocado|lemon|lime|melon|tomato|potato|onion|lettuce|spinach|broccoli|carrot|produce|vegetable|fruit)\b/.test(text)) return 'produce'
  if (/\b(milk|butter|cheese|cream|yogurt|egg)\b/.test(text)) return 'dairy-eggs'
  if (/\b(frozen|ice cream)\b/.test(text)) return 'frozen'
  if (/\b(bread|bagel|roll|bun|tortilla|bakery)\b/.test(text)) return 'bakery'
  if (/\b(water|juice|coffee|tea|soda|beverage)\b/.test(text)) return 'beverages'
  if (/\b(chip|cracker|popcorn|snack|cookie|candy|chocolate)\b/.test(text)) return 'snacks'
  return 'grocery'
}

async function listChainStates(sql, chainSlugs) {
  const rows = await sql`
    select distinct s.state
    from openclaw.stores s
    join openclaw.chains c on c.id = s.chain_id
    where c.slug = any(${chainSlugs})
      and s.is_active = true
    order by s.state
  `
  return rows.map((row) => row.state)
}

async function ingestState({
  sql,
  config,
  chainSlug,
  state,
  products,
  args,
  checkpoint,
  checkpointPath,
}) {
  const completed = new Set(
    checkpoint.states?.[state]?.completedStoreIds || []
  )
  const stores = await loadStores(sql, config.chainSlugs, state, args.maxStores)
  const activeStores = args.resume
    ? stores.filter((store) => !completed.has(store.id))
    : stores

  console.log(
    `State ${state}: stores=${stores.length} remaining=${activeStores.length} products=${products.length}`
  )

  if (args.dryRun) {
    console.log(
      `DRY RUN chain=${chainSlug} state=${state} stores_scraped=${activeStores.length} products_found=${products.length} prices_inserted=${activeStores.length * products.length}`
    )
    return {
      storesScraped: activeStores.length,
      productsFound: products.length,
      pricesInserted: activeStores.length * products.length,
    }
  }

  let storesScraped = 0
  let pricesInserted = 0
  const productIds = []

  for (const product of products) {
    const productId = await findOrCreateProduct(sql, product)
    productIds.push([product, productId])
  }

  for (const store of activeStores) {
    const rows = productIds.map(([product, productId]) => ({
      store_id: store.id,
      product_id: productId ?? null,
      price_cents: product.priceCents,
      sale_price_cents: product.salePriceCents ?? null,
      in_stock: true,
      source: `instacart:${chainSlug}:${product.sourceSlug}:${state}`,
      last_seen_at: new Date(),
      price_type: config.priceType,
      observation_method: 'scrape',
      is_sale: Boolean(product.isSale),
      baseline_price_cents: product.baselinePriceCents ?? null,
    }))
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (row[key] === undefined) row[key] = null
      }
      if (!row.store_id || !row.product_id) {
        throw new Error(`Cannot upsert price without store/product id for ${store.id}`)
      }
    }
    await upsertStoreProductsBatch(sql, rows)
    pricesInserted += rows.length

    storesScraped++
    completed.add(store.id)
    saveStateCheckpoint(checkpoint, checkpointPath, state, {
      storesScraped,
      pricesInserted,
      completedStoreIds: [...completed],
    })
  }

  console.log(
    `LOG chain=${chainSlug} state=${state} stores_scraped=${storesScraped} products_found=${products.length} prices_inserted=${pricesInserted}`
  )

  return { storesScraped, productsFound: products.length, pricesInserted }
}

async function loadStores(sql, chainSlugs, state, limit) {
  const rows = await sql`
    select s.id, s.name, s.city, s.state, s.zip, c.slug as chain_slug
    from openclaw.stores s
    join openclaw.chains c on c.id = s.chain_id
    where c.slug = any(${chainSlugs})
      and s.state = ${state}
      and s.is_active = true
    order by s.city, s.name, s.id
  `
  return limit ? rows.slice(0, limit) : rows
}

async function findOrCreateProduct(sql, product) {
  if (product.upc) {
    const [existing] = await sql`
      select id from openclaw.products where upc = ${product.upc} limit 1
    `
    if (existing) return existing.id
  }

  const [existing] = await sql`
    select id
    from openclaw.products
    where lower(name) = lower(${product.name})
      and coalesce(lower(brand), '') = coalesce(lower(${product.brand}), '')
      and coalesce(lower(size), '') = coalesce(lower(${product.size}), '')
    order by created_at
    limit 1
  `
  if (existing) return existing.id

  const [created] = await sql`
    insert into openclaw.products (
      name, brand, upc, size, category_id, image_url, is_organic,
      is_store_brand, is_food, created_at, updated_at
    )
    values (
      ${product.name},
      ${product.brand},
      ${product.upc},
      ${product.size},
      null,
      ${product.imageUrl},
      ${/\borganic\b/i.test(product.name)},
      ${/\b(store brand|member's mark|signature select|food lion|publix|meijer|sprouts|hannaford|hy-vee|h-e-b|giant|giant eagle|winn-dixie|save a lot|dollar tree)\b/i.test(`${product.brand || ''} ${product.name}`)},
      true,
      now(),
      now()
    )
    returning id
  `
  return created.id
}

async function upsertStoreProductsBatch(sql, rows) {
  if (rows.length === 0) return
  const valueRows = rows.map((row) => [
    row.store_id,
    row.product_id,
    row.price_cents,
    row.sale_price_cents,
    row.in_stock,
    row.source,
    row.last_seen_at,
    row.price_type,
    row.observation_method,
    row.is_sale,
    row.baseline_price_cents,
  ])
  await sql`
    insert into openclaw.store_products (
      store_id,
      product_id,
      price_cents,
      sale_price_cents,
      in_stock,
      source,
      last_seen_at,
      price_type,
      observation_method,
      is_sale,
      baseline_price_cents
    )
    values ${sql(valueRows)}
    on conflict (store_id, product_id) do update set
      price_cents = excluded.price_cents,
      sale_price_cents = excluded.sale_price_cents,
      in_stock = excluded.in_stock,
      source = excluded.source,
      last_seen_at = excluded.last_seen_at,
      price_type = excluded.price_type,
      observation_method = excluded.observation_method,
      is_sale = excluded.is_sale,
      baseline_price_cents = excluded.baseline_price_cents
  `
}

function saveStateCheckpoint(checkpoint, checkpointPath, state, data) {
  checkpoint.states ||= {}
  checkpoint.states[state] = {
    ...(checkpoint.states[state] || {}),
    ...data,
    updatedAt: new Date().toISOString(),
  }
  writeCheckpoint(checkpointPath, checkpoint)
}

function readCheckpoint(checkpointPath) {
  if (!fs.existsSync(checkpointPath)) return {}
  return JSON.parse(fs.readFileSync(checkpointPath, 'utf8'))
}

function writeCheckpoint(checkpointPath, checkpoint) {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true })
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2))
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function currentScriptIsEntrypoint(importMetaUrl) {
  const current = fileURLToPath(importMetaUrl)
  return path.resolve(process.argv[1] || '') === path.resolve(current)
}
