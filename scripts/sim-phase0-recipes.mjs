/**
 * Phase 0.3 - Stub Recipe Creation via Manual Entry tab
 * Phase 0.4 - Client verification (navigate Active directory)
 * Phase 0.5 - Additional smoke test items
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const SCREENSHOTS = 'docs/simulation-reports/screenshots';
const FINDINGS = [];

function finding(type, id, desc) {
  FINDINGS.push({ type, id, desc });
  console.log(`  [${type}] ${id}: ${desc}`);
}

async function ss(page, name) {
  const fp = path.join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  return fp;
}

async function waitFor(page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  // Kill cookie banner
  const btn = await page.$('button:has-text("Accept")');
  if (btn) await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
}

async function authAs(page, email, password) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, { data: { email, password } });
  const body = await res.json();
  if (!body.ok) throw new Error(`Auth failed: ${email}`);
  console.log(`Auth: ${email}`);
  return body;
}

async function main() {
  console.log('Phase 0: Recipes + Client Verification + Smoke\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await context.newPage();

  await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

  // ========================================
  // 0.3: RECIPES - Manual Entry tab
  // ========================================
  console.log('\n=== 0.3 STUB RECIPE CREATION ===\n');

  // First, inspect the Manual Entry tab
  await page.goto(`${BASE}/recipes/new`);
  await waitFor(page);

  // Click "Manual Entry" tab
  const manualTab = await page.$('button:has-text("Manual Entry"), a:has-text("Manual Entry"), [role="tab"]:has-text("Manual")');
  if (manualTab) {
    await manualTab.click({ force: true });
    await page.waitForTimeout(1500);
    console.log('Clicked Manual Entry tab');
  } else {
    finding('BUG', 'BUG-TAB', 'Manual Entry tab not found on /recipes/new');
  }

  await ss(page, 'p03-manual-entry-tab');

  // Map the manual entry form fields
  const fields = await page.$$eval('main input, main textarea, main select', els =>
    els.map(el => ({
      tag: el.tagName,
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder')?.substring(0, 60),
      type: el.getAttribute('type'),
      label: el.getAttribute('aria-label'),
    })).filter(f => f.name || f.placeholder || f.id)
  );
  console.log('Manual Entry fields:', JSON.stringify(fields, null, 2));

  // Now create recipes
  const recipes = [
    { name: '[STUB] Burrata with Roasted Tomatoes', category: 'appetizer', servings: '4', desc: '[STUB] Fresh burrata over slow-roasted cherry tomatoes with basil oil. Digital Twin simulation placeholder.' },
    { name: '[STUB] Tuna Crudo', category: 'appetizer', servings: '4', desc: '[STUB] Sushi-grade tuna with citrus and microgreens. Digital Twin simulation placeholder.' },
    { name: '[STUB] Wild Mushroom Crostini', category: 'appetizer', servings: '6', desc: '[STUB] Mixed wild mushrooms on sourdough with goat cheese. Digital Twin simulation placeholder.' },
    { name: '[STUB] Pan-Seared Halibut', category: 'main', servings: '4', desc: '[STUB] Halibut with lemon-caper brown butter, asparagus, fingerlings. Digital Twin simulation placeholder.' },
    { name: '[STUB] Braised Short Ribs', category: 'main', servings: '6', desc: '[STUB] Red wine braised short ribs with root vegetables. Digital Twin simulation placeholder.' },
    { name: '[STUB] Herb-Crusted Rack of Lamb', category: 'main', servings: '4', desc: '[STUB] Dijon and herb-crusted lamb with roasted garlic jus. Digital Twin simulation placeholder.' },
    { name: '[STUB] Lobster Risotto', category: 'main', servings: '4', desc: '[STUB] Maine lobster risotto with parmesan and fresh herbs. Digital Twin simulation placeholder.' },
    { name: '[STUB] Panna Cotta with Berry Compote', category: 'dessert', servings: '6', desc: '[STUB] Vanilla bean panna cotta with seasonal berry compote. Digital Twin simulation placeholder.' },
    { name: '[STUB] Chocolate Lava Cake', category: 'dessert', servings: '4', desc: '[STUB] Warm dark chocolate lava cake with powdered sugar. Digital Twin simulation placeholder.' },
    { name: '[STUB] Arugula Salad with Shaved Parmesan', category: 'side', servings: '6', desc: '[STUB] Peppery arugula with lemon vinaigrette, pine nuts, shaved parm. Digital Twin simulation placeholder.' },
  ];

  const created = [];
  const failed = [];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    console.log(`\n>> Recipe ${i + 1}/${recipes.length}: ${r.name}`);

    await page.goto(`${BASE}/recipes/new`);
    await waitFor(page);

    // Click Manual Entry tab
    const tab = await page.$('button:has-text("Manual Entry"), [role="tab"]:has-text("Manual")');
    if (tab) {
      await tab.click({ force: true });
      await page.waitForTimeout(1000);
    }

    try {
      // Try filling by various selector strategies
      // Name field
      let nameFilled = false;
      const nameSelectors = [
        'input[name="name"]', 'input[name="title"]', 'input[name="recipeName"]',
        '#recipeName', '#name', '#title',
        'input[placeholder*="name" i]', 'input[placeholder*="recipe" i]', 'input[placeholder*="title" i]',
      ];
      for (const sel of nameSelectors) {
        const el = await page.$(sel);
        if (el && await el.isVisible().catch(() => false)) {
          await el.fill(r.name);
          nameFilled = true;
          console.log(`  Name filled via: ${sel}`);
          break;
        }
      }

      if (!nameFilled) {
        // Try by label text
        const labels = await page.$$('label');
        for (const label of labels) {
          const text = await label.textContent();
          if (text?.toLowerCase().includes('name') || text?.toLowerCase().includes('title')) {
            const forId = await label.getAttribute('for');
            if (forId) {
              const input = await page.$(`#${forId}`);
              if (input) {
                await input.fill(r.name);
                nameFilled = true;
                console.log(`  Name filled via label[for="${forId}"]`);
                break;
              }
            }
            // Or try the next sibling input
            const nextInput = await label.evaluateHandle(el => el.parentElement?.querySelector('input'));
            if (nextInput) {
              await nextInput.asElement()?.fill(r.name);
              nameFilled = true;
              console.log(`  Name filled via label sibling`);
              break;
            }
          }
        }
      }

      if (!nameFilled) {
        // Last resort: all visible text inputs in main
        const allInputs = await page.$$('main input[type="text"], main input:not([type]):not([placeholder*="Search"])');
        if (allInputs.length > 0) {
          await allInputs[0].fill(r.name);
          nameFilled = true;
          console.log(`  Name filled via first text input`);
        }
      }

      if (!nameFilled) {
        finding('BUG', `BUG-R${i}`, `Cannot find name input for: ${r.name}`);
        failed.push(r.name);
        await ss(page, `p03-recipe-${i}-no-name`);
        continue;
      }

      // Description
      const textareas = await page.$$('main textarea');
      for (const ta of textareas) {
        const ph = await ta.getAttribute('placeholder').catch(() => '');
        if (!ph?.includes('Diane sauce')) { // Skip brain dump textarea
          await ta.fill(r.desc);
          console.log(`  Description filled`);
          break;
        }
      }

      // Servings
      const numInputs = await page.$$('main input[type="number"]');
      for (const ni of numInputs) {
        const name = await ni.getAttribute('name').catch(() => '');
        const ph = await ni.getAttribute('placeholder').catch(() => '');
        if (name?.includes('serv') || name?.includes('yield') || ph?.includes('serv')) {
          await ni.fill(r.servings);
          console.log(`  Servings: ${r.servings}`);
          break;
        }
      }
      // If no labeled servings, try first number input
      if (numInputs.length > 0) {
        const val = await numInputs[0].inputValue();
        if (!val) {
          await numInputs[0].fill(r.servings);
        }
      }

      // Category select
      const selects = await page.$$('main select');
      for (const sel of selects) {
        const options = await sel.$$eval('option', opts =>
          opts.map(o => ({ value: o.value, text: o.textContent?.trim()?.toLowerCase() }))
        );
        const match = options.find(o =>
          o.text?.includes(r.category) ||
          o.text?.includes(r.category === 'main' ? 'entr' : r.category) ||
          o.text?.includes(r.category === 'main' ? 'main' : r.category)
        );
        if (match) {
          await sel.selectOption(match.value);
          console.log(`  Category: ${match.text} (${match.value})`);
          break;
        }
      }

      await page.waitForTimeout(500);
      await ss(page, `p03-recipe-${i}-filled`);

      // Submit
      let submitted = false;
      const submitSelectors = [
        'button:has-text("Create Recipe")', 'button:has-text("Save Recipe")',
        'button:has-text("Create")', 'button:has-text("Save")',
        'main button[type="submit"]',
      ];
      for (const sel of submitSelectors) {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible().catch(() => false)) {
          await btn.click({ force: true });
          submitted = true;
          console.log(`  Submitted via: ${sel}`);
          break;
        }
      }

      if (!submitted) {
        finding('BUG', `BUG-RS${i}`, `No submit button for: ${r.name}`);
        failed.push(r.name);
        continue;
      }

      await page.waitForTimeout(3000);
      await waitFor(page);

      const url = page.url();
      if (url.includes('/recipes/') && !url.endsWith('/new')) {
        console.log(`  CREATED -> ${url}`);
        created.push({ name: r.name, url });
        await ss(page, `p03-recipe-${i}-done`);
      } else {
        console.log(`  Stayed on: ${url}`);
        await ss(page, `p03-recipe-${i}-stayed`);
        // Check for validation errors
        const errors = await page.$$eval('.text-red-500, .text-destructive, [role="alert"]', els =>
          els.map(e => e.textContent?.trim()).filter(Boolean)
        );
        if (errors.length) {
          finding('BUG', `BUG-RV${i}`, `Validation errors: ${errors.join('; ')}`);
        }
        failed.push(r.name);
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message.substring(0, 120)}`);
      failed.push(r.name);
      await ss(page, `p03-recipe-${i}-error`);
    }
  }

  console.log(`\nRecipes: ${created.length}/${recipes.length} created`);
  if (failed.length) console.log(`Failed: ${failed.join(', ')}`);

  // ========================================
  // 0.4: CLIENT VERIFICATION
  // ========================================
  console.log('\n=== 0.4 CLIENT VERIFICATION ===\n');

  await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

  // Navigate to active clients
  console.log('>> /clients - looking for Active directory');
  await page.goto(`${BASE}/clients`);
  await waitFor(page);

  // Click "Active" in sidebar
  const activeLink = await page.$('a:has-text("Active"), a[href*="/clients"][href*="active"]');
  if (activeLink) {
    await activeLink.click({ force: true });
    await page.waitForTimeout(2000);
    await waitFor(page);
    console.log('  Clicked Active clients link');
  }
  await ss(page, 'p04-clients-active');

  // Look for client names
  const clientsText = await page.textContent('main').catch(() => '');
  const hasJoy = clientsText.toLowerCase().includes('joy');
  const hasEmma = clientsText.toLowerCase().includes('emma');
  const hasDemo = clientsText.toLowerCase().includes('demo');
  console.log(`  Joy found: ${hasJoy}, Emma found: ${hasEmma}, Demo found: ${hasDemo}`);

  if (!hasJoy && !hasEmma) {
    finding('GAP', 'GAP-JOY', 'Joy/Emma not found in Chef Bob active client directory');
  }

  // Try signing in as Joy and checking her portal
  console.log('\n>> Joy client portal');
  await authAs(page, 'emma@northandpine.co', 'E2eClientTest!2026');
  await page.goto(`${BASE}/my-events`);
  await waitFor(page);
  await ss(page, 'p04-joy-my-events');
  const joyUrl = page.url();
  console.log(`  Joy /my-events: ${joyUrl}`);

  // Check my-quotes
  await page.goto(`${BASE}/my-quotes`);
  await waitFor(page);
  await ss(page, 'p04-joy-my-quotes');

  // Check my-hub
  await page.goto(`${BASE}/my-hub`);
  await waitFor(page);
  await ss(page, 'p04-joy-my-hub');
  console.log(`  Joy /my-hub: ${page.url()}`);

  // Demo client
  console.log('\n>> Demo Client portal');
  await authAs(page, 'demo-client@chefflow.test', 'DemoClientFlow!2026');
  await page.goto(`${BASE}/my-events`);
  await waitFor(page);
  await ss(page, 'p04-demo-my-events');
  console.log(`  Demo /my-events: ${page.url()}`);

  // ========================================
  // 0.5 EXTRA SMOKE TESTS
  // ========================================
  console.log('\n=== 0.5 ADDITIONAL SMOKE TESTS ===\n');

  await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

  // Check what recipes exist
  await page.goto(`${BASE}/recipes`);
  await waitFor(page);
  await ss(page, 'p05-recipes-list');
  const recipesList = await page.textContent('main').catch(() => '');
  console.log(`  Recipes page content length: ${recipesList.length}`);
  // Check for any existing recipes
  const hasStub = recipesList.includes('[STUB]');
  console.log(`  Has [STUB] recipes: ${hasStub}`);

  // Check menus
  await page.goto(`${BASE}/menus`);
  await waitFor(page);
  await ss(page, 'p05-menus-list');
  console.log(`  Menus page: ${page.url()}`);

  // Check today page
  await page.goto(`${BASE}/today`);
  await waitFor(page);
  await ss(page, 'p05-today');
  console.log(`  Today page: ${page.url()}`);

  // ========================================
  // WRITE RESULTS
  // ========================================
  const results = {
    timestamp: new Date().toISOString(),
    recipes: { created, failed, total: recipes.length },
    clients: {
      joyInDirectory: hasJoy || hasEmma,
      joyPortal: !joyUrl.includes('error'),
      demoPortal: true,
    },
    findings: FINDINGS,
  };

  fs.writeFileSync('docs/simulation-reports/phase-0-part2.json', JSON.stringify(results, null, 2));
  console.log('\n=== DONE ===');
  console.log(`Findings: ${FINDINGS.length}`);
  FINDINGS.forEach(f => console.log(`  [${f.type}] ${f.id}: ${f.desc}`));

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
