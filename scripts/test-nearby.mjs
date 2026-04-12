import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'http://127.0.0.1:3100'
const SCREENSHOTS = 'C:/Users/david/Documents/CFv1/screenshots/nearby-qa'

async function signIn(page) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  if (!res.ok()) throw new Error('Auth failed: ' + res.status())
  const body = await res.json()
  console.log('Auth response keys:', Object.keys(body))
  return body
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text())
  })

  const results = []

  // Step 1: Sign in
  console.log('Step 1: Sign in via API...')
  try {
    await signIn(page)
    console.log('Auth OK')
  } catch (e) {
    console.log('Auth warning:', e.message)
  }

  // Step 2: Landing page
  console.log('Step 2: Load /nearby landing page...')
  await page.goto(BASE + '/nearby', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.screenshot({ path: SCREENSHOTS + '/01-landing.png', fullPage: false })

  const h1Text = await page.locator('h1').first().textContent().catch(() => '')
  const statsText = await page.locator('p:has-text("food businesses")').textContent().catch(() => '')
  const stateGridCount = await page.locator('details summary').count()
  const popularCitiesCount = await page.locator('text=Popular cities').count()

  console.log('H1:', h1Text)
  console.log('Stats:', statsText)
  console.log('State grid details elements:', stateGridCount)
  console.log('Popular cities section:', popularCitiesCount)

  results.push({
    step: '1 - Landing Page',
    pass: h1Text.includes('Nearby'),
    details: { h1: h1Text, stats: statsText, stateGridCount, popularCitiesCount },
  })

  // Step 3: Expand state grid
  if (stateGridCount > 0) {
    await page.locator('details summary').first().click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: SCREENSHOTS + '/02-state-grid-expanded.png', fullPage: false })
    console.log('State grid expanded')
  }

  // Step 4: Filter by MA
  console.log('Step 3: Filter by MA...')
  await page.goto(BASE + '/nearby?state=MA', { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.screenshot({ path: SCREENSHOTS + '/03-filtered-MA.png', fullPage: false })

  const totalText = await page.locator('p.text-sm.font-medium').first().textContent().catch(() => '')
  const cardCount = await page.locator('article').count()
  console.log('Total text:', totalText)
  console.log('Cards visible:', cardCount)

  results.push({
    step: '2 - Filter by MA',
    pass: cardCount > 0,
    details: { totalText, cardCount },
  })

  // Step 5: Analyze images
  console.log('Step 4: Analyzing images on MA listing cards...')
  await page.evaluate(() => window.scrollTo(0, 300))
  await page.waitForTimeout(800)
  await page.screenshot({ path: SCREENSHOTS + '/04-MA-cards.png', fullPage: false })

  const cardData = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'))
    return articles.map((article, i) => {
      const imgEl = article.querySelector('img')
      const svgEl = article.querySelector('svg')
      return {
        index: i,
        hasImg: !!imgEl,
        imgSrc: imgEl ? imgEl.src : null,
        hasSvg: !!svgEl,
        name: (article.querySelector('h3') || {}).textContent || '',
      }
    })
  })

  const totalCards = cardData.length
  const cardsWithImg = cardData.filter(c => c.hasImg).length
  const cardsWithoutImg = cardData.filter(c => !c.hasImg).length
  const cardsWithDirPhotos = cardData.filter(c => c.imgSrc && c.imgSrc.includes('/api/storage/public/directory-photos/')).length
  const cardsWithOtherSrc = cardData.filter(c => c.imgSrc && !c.imgSrc.includes('/api/storage/public/directory-photos/')).length

  console.log('Total cards: ' + totalCards)
  console.log('Cards with <img>: ' + cardsWithImg)
  console.log('Cards without <img> (CategoryPlaceholder): ' + cardsWithoutImg)
  console.log('Cards with /api/storage/public/directory-photos/ src: ' + cardsWithDirPhotos)
  console.log('Cards with other img src: ' + cardsWithOtherSrc)
  cardData.slice(0, 6).forEach(c => {
    const src = c.imgSrc ? c.imgSrc.substring(0, 90) : 'NONE'
    console.log('  Card ' + c.index + ' [' + c.name.substring(0,30) + ']: img=' + c.hasImg + ', svg=' + c.hasSvg + ', src=' + src)
  })

  results.push({
    step: '3 - Image Check (MA)',
    pass: cardsWithoutImg === 0,
    details: {
      totalCards,
      cardsWithImg,
      cardsWithoutImg,
      cardsWithDirPhotos,
      cardsWithOtherSrc,
      failure: cardsWithoutImg > 0 ? cardsWithoutImg + ' cards showing CategoryPlaceholder (no <img>)' : null,
      sample: cardData.slice(0, 3),
    },
  })

  // Full page screenshot
  await page.screenshot({ path: SCREENSHOTS + '/05-MA-full.png', fullPage: true })

  // Step 6: Click into detail
  console.log('Step 5: Navigate to listing detail...')
  const firstDetailLink = page.locator('a[href^="/nearby/"]').first()
  const href = await firstDetailLink.getAttribute('href').catch(() => null)
  console.log('First detail href:', href)

  if (href) {
    await page.goto(BASE + href, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.screenshot({ path: SCREENSHOTS + '/06-detail-top.png', fullPage: false })

    const detailH1 = await page.locator('h1').first().textContent().catch(() => '')
    const has404 = (await page.locator('text=404').count()) > 0
    const hasError = (await page.locator('text=Something went wrong').count()) > 0
    const imgCount = await page.locator('img').count()

    console.log('Detail H1:', detailH1)
    console.log('Has 404:', has404)
    console.log('Images on detail page:', imgCount)

    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForTimeout(500)
    await page.screenshot({ path: SCREENSHOTS + '/07-detail-scrolled.png', fullPage: false })
    await page.screenshot({ path: SCREENSHOTS + '/08-detail-full.png', fullPage: true })

    results.push({
      step: '4 - Detail Page (' + href + ')',
      pass: detailH1.length > 0 && !has404 && !hasError,
      details: { h1: detailH1, has404, hasError, imgCount },
    })
  }

  // Summary
  console.log('\n===== RESULTS =====')
  results.forEach(r => {
    console.log('[' + (r.pass ? 'PASS' : 'FAIL') + '] ' + r.step)
    if (!r.pass) console.log('  ' + JSON.stringify(r.details))
  })

  console.log('\nBrowser errors: ' + errors.length)
  errors.slice(0, 5).forEach(e => console.log('  -', e))

  writeFileSync(SCREENSHOTS + '/report.json', JSON.stringify({ results, errors }, null, 2))
  await browser.close()
}

run().catch(e => { console.error(e); process.exit(1) })
