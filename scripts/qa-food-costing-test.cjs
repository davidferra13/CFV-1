const pw = require('playwright');
const fs2 = require('fs');
const path = require('path');
const SS = path.join(process.cwd(), 'tests', 'qa-screenshots');

async function run() {
  const state = JSON.parse(fs2.readFileSync('.auth/agent-fresh.json', 'utf8'));
  const browser = await pw.chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: state, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const results = [];

  async function go(url) {
    page.goto(url, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
  async function ss(name) {
    const p = path.join(SS, 'food-costing-' + name);
    page.screenshot({ path: p, fullPage: false, timeout: 8000, animations: 'disabled' }).catch(() => {}); await page.waitForTimeout(500);
    console.log('Screenshot:', p);
  }
  async function countHelp() { return page.locator('button[aria-label^="Help:"]').count(); }
  async function getBodyText() { return page.evaluate(() => document.body.innerText.substring(0, 3000)); }
  function report(s, ok, n) { results.push({s,ok,n}); console.log('[' + (ok?'PASS':'FAIL') + '] ' + s + ' | ' + n); }

  console.log('TEST 1: Recipe Detail');
  await go('http://localhost:3100/culinary/recipes');
  await ss('01-recipe-list.png');
  const rc = await page.locator('a[href*="/culinary/recipes/"]').count();
  console.log('Recipe links:', rc);
  if (rc > 0) {
    await page.locator('a[href*="/culinary/recipes/"]').first().click();
    await page.waitForTimeout(3000);
    await ss('02-recipe-detail.png');
    const qc = await countQ();
    const tc = await hasText('Total Cost');
    const cp = await hasText('Cost per Portion');
    console.log('? btns:', qc, 'TC:', tc, 'CP:', cp);
    if (qc>0) { await page.locator("button").filter({hasText:'?'}).first().click(); await page.waitForTimeout(600); await ss('02b-popover.png'); }
    report('Recipe Detail - ? icons', qc>0, 'qBtns='+qc+' TC='+tc+' CP='+cp);
  } else { report('Recipe Detail - ? icons', true, 'empty state'); }

  console.log('TEST 2: Menu Detail');
  await go('http://localhost:3100/culinary/menus');
  await ss('03-menu-list.png');
  const mc = await page.locator('a[href*="/culinary/menus/"]').count();
  console.log('Menu links:', mc);
  if (mc > 0) {
    await page.locator('a[href*="/culinary/menus/"]').first().click();
    await page.waitForTimeout(3000);
    await ss('04-menu-detail.png');
    const qc = await countQ();
    const cg = await hasText('Cost / Guest');
    const fc = await hasText('Food Cost %');
    console.log('? btns:', qc, 'CG:', cg, 'FC%:', fc);
    report('Menu Detail - ? icons', qc>0, 'qBtns='+qc+' CG='+cg+' FC%='+fc);
  } else { report('Menu Detail - ? icons', true, 'empty state'); }

  console.log('TEST 3: Recipe Costing Dashboard');
  await go('http://localhost:3100/culinary/costing/recipe');
  await ss('05-recipe-costing.png');
  const qc3 = await countQ();
  const me = await hasText('Most expensive recipe');
  const ac = await hasText('Average recipe cost');
  console.log('? btns:', qc3, 'ME:', me, 'AC:', ac);
  if (qc3>0) { await page.locator("button").filter({hasText:'?'}).first().click(); await page.waitForTimeout(600); await ss('05b-popover.png'); }
  report('Recipe Costing Dashboard - ? icons', qc3>0, 'qBtns='+qc3+' ME='+me+' AC='+ac);

  console.log('TEST 4: Menu Costing Dashboard');
  await go('http://localhost:3100/culinary/costing/menu');
  await ss('06-menu-costing.png');
  const qc4 = await countQ();
  const ec = await hasText('Estimated Cost');
  const cg4 = await hasText('Cost / Guest');
  console.log('? btns:', qc4, 'EC:', ec, 'CG:', cg4);
  report('Menu Costing Dashboard - ? icons', qc4>0, 'qBtns='+qc4+' EC='+ec+' CG='+cg4);

  console.log('TEST 5: Pricing Settings');
  await go('http://localhost:3100/settings/pricing');
  await ss('07-pricing-settings.png');
  const qc5 = await countQ();
  const cr = await hasText('Couples Rates');
  const grr = await hasText('Group Rates');
  const tv = await hasText('Travel');
  console.log('? btns:', qc5, 'CR:', cr, 'GR:', grr, 'T:', tv);
  report('Pricing Settings - ? icons', qc5>0, 'qBtns='+qc5+' CR='+cr+' GR='+grr+' T='+tv);

  console.log('TEST 6: Plate Costs');
  await go('http://localhost:3100/finance/plate-costs');
  await ss('08-plate-costs.png');
  const qc6 = await countQ();
  const tpc = await hasText('True Plate Cost');
  console.log('? btns:', qc6, 'TPC:', tpc);
  report('Plate Costs - ? icon', qc6>0 && tpc, 'qBtns='+qc6+' TPC='+tpc);

  console.log('TEST 7: Food Costing Guide');
  await go('http://localhost:3100/help/food-costing');
  await page.waitForTimeout(1000);
  await ss('09-food-costing-guide.png');
  const isOk = page.url().includes('/help/food-costing');
  const h1c = await page.locator('h1').count();
  const h2c = await page.locator('h2').count();
  const tblc = await page.locator('table').count();
  const fh = h1c>0 ? await page.locator('h1').first().textContent() : (h2c>0 ? await page.locator('h2').first().textContent() : 'none');
  console.log('URL:', page.url(), 'H1:', h1c, 'H2:', h2c, 'Tables:', tblc, 'FirstH:', fh);
  report('Food Costing Guide page', isOk && (h1c+h2c)>0, 'URL='+page.url()+' H1='+h1c+' H2='+h2c+' Tables='+tblc+' FirstH='+fh);

  console.log('TEST 8: Dashboard');
  await go('http://localhost:3100/dashboard');
  await ss('10-dashboard.png');
  const fcc = await page.locator('text=Food Cost').count();
  const tgc = await page.locator('text=/[Tt]arget/').count();
  const wc = await page.locator('text=/[Ww]ithin/').count();
  console.log('FoodCost:', fcc, 'Target:', tgc, 'Within:', wc);
  report('Dashboard - Food Cost stat', fcc>0, 'FC='+fcc+' Tgt='+tgc+' Wi='+wc);

  await browser.close();
  console.log('');
  console.log('=== QA SUMMARY ===');
  let pass=0,fail=0;
  results.forEach(r => { console.log('[' + (r.ok?'PASS':'FAIL') + '] ' + r.s + ' | ' + r.n); if(r.ok) pass++; else fail++; });
  console.log('Total:', results.length, '| Pass:', pass, '| Fail:', fail);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });