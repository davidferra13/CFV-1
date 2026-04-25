/**
 * Digital Twin Simulation - Phase 0: Setup (v2)
 * Drives Chef Bob profile configuration + smoke tests via Playwright
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const SCREENSHOTS = 'docs/simulation-reports/screenshots';
const FINDINGS = [];

function finding(type, id, desc, details = '') {
  FINDINGS.push({ type, id, desc, details });
  console.log(`  [${type}] ${id}: ${desc}`);
}

async function screenshot(page, name) {
  const fp = path.join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  console.log(`  screenshot: ${fp}`);
  return fp;
}

async function authAs(page, email, password) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email, password }
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`Auth failed for ${email}: ${JSON.stringify(body)}`);
  console.log(`Auth OK: ${email}`);
  return body;
}

async function waitAndDismiss(page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // Dismiss cookie banner if present
  const acceptBtn = await page.$('button:has-text("Accept")');
  if (acceptBtn) {
    await acceptBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }
  // Dismiss any toast/notification overlays
  const closeButtons = await page.$$('[aria-label="Close"], .toast-close, button:has-text("Dismiss")');
  for (const btn of closeButtons) {
    await btn.click({ force: true }).catch(() => {});
  }
}

// ============================================================
// PHASE 0.2: Chef Bob Profile Configuration
// ============================================================
async function configureProfile(page) {
  console.log('\n=== 0.2 CHEF BOB PROFILE CONFIGURATION ===\n');
  const profileResults = { pages: {}, fieldsSet: [], issues: [] };

  // --- My Profile ---
  console.log('>> /settings/my-profile');
  await page.goto(`${BASE}/settings/my-profile`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-my-profile');

  // Try filling profile fields
  const inputs = await page.$$('input, textarea, select');
  const fieldInfo = [];
  for (const input of inputs.slice(0, 30)) {
    const name = await input.getAttribute('name').catch(() => null);
    const placeholder = await input.getAttribute('placeholder').catch(() => null);
    const type = await input.getAttribute('type').catch(() => null);
    const tag = await input.evaluate(el => el.tagName).catch(() => null);
    if (name || placeholder) fieldInfo.push({ name, placeholder, type, tag });
  }
  console.log('  Fields found:', JSON.stringify(fieldInfo));
  profileResults.pages.myProfile = { fields: fieldInfo };

  // Fill display name
  for (const sel of ['input[name="displayName"]', 'input[name="display_name"]', 'input[name="name"]']) {
    const el = await page.$(sel);
    if (el) {
      await el.fill('Chef Bob');
      profileResults.fieldsSet.push('displayName');
      console.log('  Set display name: Chef Bob');
      break;
    }
  }

  // Fill bio
  for (const sel of ['textarea[name="bio"]', 'textarea[name="description"]']) {
    const el = await page.$(sel);
    if (el) {
      await el.fill('Private chef in Portland, ME. 8 years crafting intimate dinners and corporate events. Italian and New England cuisine specialist.');
      profileResults.fieldsSet.push('bio');
      console.log('  Set bio');
      break;
    }
  }

  // Save
  const saveBtn = await page.$('button[type="submit"], button:has-text("Save")');
  if (saveBtn) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('  Saved profile');
  }
  await screenshot(page, 'p02-my-profile-filled');

  // --- My Services ---
  console.log('>> /settings/my-services');
  await page.goto(`${BASE}/settings/my-services`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-my-services');
  profileResults.pages.myServices = { loaded: true };

  // Capture form structure
  const servicesContent = await page.textContent('main').catch(() => '');
  console.log('  Services page loaded, content length:', servicesContent.length);

  // --- Public Profile ---
  console.log('>> /settings/public-profile');
  await page.goto(`${BASE}/settings/public-profile`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-public-profile');
  profileResults.pages.publicProfile = { loaded: true };

  // --- Templates ---
  console.log('>> /settings/templates');
  await page.goto(`${BASE}/settings/templates`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-templates');
  profileResults.pages.templates = { loaded: true };

  // Try creating a template
  const newTemplateBtn = await page.$('button:has-text("New"), button:has-text("Create"), button:has-text("Add"), a:has-text("New")');
  if (newTemplateBtn) {
    console.log('  Found new template button');
    profileResults.pages.templates.hasCreate = true;
  } else {
    console.log('  No create template button found');
    profileResults.pages.templates.hasCreate = false;
  }

  // --- Modules ---
  console.log('>> /settings/modules');
  await page.goto(`${BASE}/settings/modules`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-modules');
  profileResults.pages.modules = { loaded: true };

  // --- Billing ---
  console.log('>> /settings/billing');
  await page.goto(`${BASE}/settings/billing`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-billing');
  profileResults.pages.billing = { loaded: true };

  // --- Appearance ---
  console.log('>> /settings/appearance');
  await page.goto(`${BASE}/settings/appearance`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-appearance');
  profileResults.pages.appearance = { loaded: true };

  // --- Navigation ---
  console.log('>> /settings/navigation');
  await page.goto(`${BASE}/settings/navigation`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-navigation');
  profileResults.pages.navigation = { loaded: true };

  // --- Culinary Profile ---
  console.log('>> /settings/culinary-profile');
  await page.goto(`${BASE}/settings/culinary-profile`);
  await waitAndDismiss(page);
  await screenshot(page, 'p02-culinary-profile');
  profileResults.pages.culinaryProfile = { loaded: true };

  return profileResults;
}

// ============================================================
// PHASE 0.3: Stub Recipe Creation
// ============================================================
async function createStubRecipes(page) {
  console.log('\n=== 0.3 STUB RECIPE CREATION ===\n');

  // First, check what the recipe form looks like
  console.log('>> Inspecting /recipes/new form structure');
  await page.goto(`${BASE}/recipes/new`);
  await waitAndDismiss(page);
  await screenshot(page, 'p03-recipe-form-blank');

  // Map all form fields
  const formFields = await page.$$eval('input, textarea, select', els =>
    els.map(el => ({
      tag: el.tagName,
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder'),
      type: el.getAttribute('type'),
      'aria-label': el.getAttribute('aria-label'),
    })).filter(f => f.name || f.placeholder || f.id)
  );
  console.log('  Recipe form fields:', JSON.stringify(formFields, null, 2));

  const recipes = [
    { name: '[STUB] Burrata with Roasted Tomatoes', category: 'appetizer', servings: '4' },
    { name: '[STUB] Tuna Crudo', category: 'appetizer', servings: '4' },
    { name: '[STUB] Wild Mushroom Crostini', category: 'appetizer', servings: '6' },
    { name: '[STUB] Pan-Seared Halibut', category: 'main', servings: '4' },
    { name: '[STUB] Braised Short Ribs', category: 'main', servings: '6' },
    { name: '[STUB] Herb-Crusted Rack of Lamb', category: 'main', servings: '4' },
    { name: '[STUB] Lobster Risotto', category: 'main', servings: '4' },
    { name: '[STUB] Panna Cotta with Berry Compote', category: 'dessert', servings: '6' },
    { name: '[STUB] Chocolate Lava Cake', category: 'dessert', servings: '4' },
    { name: '[STUB] Arugula Salad with Shaved Parmesan', category: 'side', servings: '6' },
  ];

  const created = [];
  const failed = [];

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    console.log(`\n>> Creating recipe ${i + 1}/${recipes.length}: ${recipe.name}`);
    await page.goto(`${BASE}/recipes/new`);
    await waitAndDismiss(page);

    try {
      // Fill name - try multiple selectors
      let nameSet = false;
      for (const sel of ['input[name="name"]', 'input[name="title"]', '#name', '#title', 'input[placeholder*="name" i]', 'input[placeholder*="recipe" i]']) {
        const el = await page.$(sel);
        if (el) {
          await el.fill(recipe.name);
          nameSet = true;
          break;
        }
      }
      if (!nameSet) {
        // Try first visible text input
        const firstInput = await page.$('main input[type="text"], main input:not([type])');
        if (firstInput) {
          await firstInput.fill(recipe.name);
          nameSet = true;
        }
      }
      if (!nameSet) {
        finding('BUG', `BUG-R${i}`, `No name input found on recipe form for ${recipe.name}`);
        failed.push(recipe.name);
        continue;
      }

      // Fill description
      const descEl = await page.$('textarea[name="description"], textarea[name="notes"], textarea');
      if (descEl) {
        await descEl.fill('[STUB] Temporary recipe for Digital Twin simulation. Developer will replace with real recipe.');
      }

      // Servings
      for (const sel of ['input[name="servings"]', 'input[name="serves"]', 'input[name="yield"]', 'input[type="number"]']) {
        const el = await page.$(sel);
        if (el) {
          await el.fill(recipe.servings);
          break;
        }
      }

      // Category
      const catSelect = await page.$('select[name="category"], select[name="course"], select[name="courseType"], select[name="type"]');
      if (catSelect) {
        const options = await catSelect.$$eval('option', opts =>
          opts.map(o => ({ value: o.value, text: o.textContent?.trim()?.toLowerCase() }))
        );
        const match = options.find(o => o.text?.includes(recipe.category));
        if (match) {
          await catSelect.selectOption(match.value);
          console.log(`  Category: ${match.text}`);
        }
      }

      await page.waitForTimeout(500);

      // Submit
      let submitted = false;
      for (const sel of ['button:has-text("Create Recipe")', 'button:has-text("Create")', 'button:has-text("Save")', 'button[type="submit"]']) {
        const btn = await page.$(sel);
        if (btn) {
          const isVisible = await btn.isVisible().catch(() => false);
          if (isVisible) {
            await btn.click({ force: true });
            submitted = true;
            break;
          }
        }
      }

      if (!submitted) {
        finding('BUG', `BUG-R${i}`, `No submit button found for ${recipe.name}`);
        failed.push(recipe.name);
        continue;
      }

      await page.waitForTimeout(3000);
      await waitAndDismiss(page);

      const url = page.url();
      if (url.includes('/recipes/') && !url.endsWith('/new')) {
        console.log(`  CREATED: ${recipe.name} -> ${url}`);
        created.push({ name: recipe.name, url });
        await screenshot(page, `p03-recipe-${i}-created`);
      } else {
        // Check for errors
        const pageText = await page.textContent('body').catch(() => '');
        const hasError = pageText.includes('error') || pageText.includes('Error') || pageText.includes('required');
        if (hasError) {
          finding('BUG', `BUG-R${i}`, `Recipe creation failed for ${recipe.name}, stayed on form`);
        }
        // Maybe it worked but didn't redirect
        await screenshot(page, `p03-recipe-${i}-result`);
        // Check if we're still on /recipes/new - might have inline save
        if (url.endsWith('/new')) {
          failed.push(recipe.name);
        } else {
          created.push({ name: recipe.name, url });
        }
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message.substring(0, 100)}`);
      failed.push(recipe.name);
      await screenshot(page, `p03-recipe-${i}-error`);
    }
  }

  console.log(`\nRecipes: ${created.length} created, ${failed.length} failed`);
  return { created, failed, total: recipes.length };
}

// ============================================================
// PHASE 0.5: Baseline Smoke Test
// ============================================================
async function smokeTestChefBob(page) {
  console.log('\n=== 0.5 SMOKE TEST: Chef Bob ===\n');
  const results = {};

  const pages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'recipes', path: '/recipes' },
    { name: 'events', path: '/events' },
    { name: 'clients', path: '/clients' },
    { name: 'financials', path: '/financials' },
    { name: 'inquiries', path: '/inquiries' },
    { name: 'calendar', path: '/calendar' },
  ];

  for (const pg of pages) {
    console.log(`>> ${pg.name} (${pg.path})`);
    await page.goto(`${BASE}${pg.path}`);
    await waitAndDismiss(page);
    const url = page.url();
    const isOk = !url.includes('/error') && !url.includes('/404');
    results[pg.name] = { ok: isOk, url };
    console.log(`  ${isOk ? 'OK' : 'FAIL'}: ${url}`);
    await screenshot(page, `p05-smoke-bob-${pg.name}`);
  }

  // Sidebar check
  const sidebarLinks = await page.$$eval('nav a, aside a', els =>
    els.map(e => ({ href: e.getAttribute('href'), text: e.textContent?.trim()?.substring(0, 40) }))
  );
  results.sidebarLinkCount = sidebarLinks.length;
  console.log(`  Sidebar links: ${sidebarLinks.length}`);

  // Find Joy in clients list
  console.log('>> Looking for Joy in client list');
  await page.goto(`${BASE}/clients`);
  await waitAndDismiss(page);
  const clientPage = await page.textContent('main').catch(() => '');
  const hasJoy = clientPage.toLowerCase().includes('joy') || clientPage.toLowerCase().includes('emma');
  results.joyInClientList = hasJoy;
  console.log(`  Joy found: ${hasJoy}`);

  if (hasJoy) {
    // Try clicking into Joy's detail
    const joyLink = await page.$('a:has-text("Joy"), a:has-text("Emma"), tr:has-text("Joy") a, tr:has-text("Emma") a');
    if (joyLink) {
      await joyLink.click({ force: true });
      await waitAndDismiss(page);
      await screenshot(page, 'p05-smoke-bob-joy-detail');
      results.joyDetail = { ok: true, url: page.url() };
      console.log(`  Joy detail: ${page.url()}`);
    }
  }

  // Check event creation
  console.log('>> Testing event creation access');
  await page.goto(`${BASE}/events/new`);
  await waitAndDismiss(page);
  const eventNewUrl = page.url();
  results.eventNew = { ok: !eventNewUrl.includes('error'), url: eventNewUrl };
  await screenshot(page, 'p05-smoke-bob-event-new');
  console.log(`  /events/new: ${results.eventNew.ok ? 'OK' : 'FAIL'}`);

  return results;
}

async function smokeTestJoy(page) {
  console.log('\n=== 0.5 SMOKE TEST: Joy (Client) ===\n');
  const results = {};

  await authAs(page, 'emma@northandpine.co', 'E2eClientTest!2026');

  const clientPages = [
    { name: 'myEvents', path: '/my-events' },
    { name: 'myQuotes', path: '/my-quotes' },
  ];

  for (const pg of clientPages) {
    console.log(`>> ${pg.name} (${pg.path})`);
    await page.goto(`${BASE}${pg.path}`);
    await waitAndDismiss(page);
    const url = page.url();
    const isOk = !url.includes('/error') && !url.includes('/sign-in');
    results[pg.name] = { ok: isOk, url };
    console.log(`  ${isOk ? 'OK' : 'FAIL'}: ${url}`);
    await screenshot(page, `p05-smoke-joy-${pg.name}`);
  }

  return results;
}

async function smokeTestDemoClient(page) {
  console.log('\n=== 0.5 SMOKE TEST: Demo Client ===\n');

  await authAs(page, 'demo-client@chefflow.test', 'DemoClientFlow!2026');
  await page.goto(`${BASE}/my-events`);
  await waitAndDismiss(page);
  const url = page.url();
  const isOk = !url.includes('/error') && !url.includes('/sign-in');
  console.log(`  Demo client portal: ${isOk ? 'OK' : 'FAIL'} (${url})`);
  await screenshot(page, 'p05-smoke-demo-client');
  return { ok: isOk, url };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('Digital Twin Simulation - Phase 0: Setup (v2)\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  const report = {
    timestamp: new Date().toISOString(),
    environment: { server: 'localhost:3000', status: 'running', playwright: '1.58.2' },
    accounts: {},
    profile: {},
    recipes: {},
    smokeTest: {},
    findings: [],
  };

  try {
    // Auth as Chef Bob
    report.accounts.chefBob = await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

    // 0.2 Profile Configuration
    report.profile = await configureProfile(page);

    // Re-auth as Chef Bob for recipes
    await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

    // 0.3 Stub Recipes
    report.recipes = await createStubRecipes(page);

    // Re-auth for smoke tests
    await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

    // 0.5 Smoke Test - Chef Bob
    report.smokeTest.chefBob = await smokeTestChefBob(page);

    // 0.5 Smoke Test - Joy
    report.smokeTest.joy = await smokeTestJoy(page);

    // 0.5 Smoke Test - Demo Client
    report.smokeTest.demoClient = await smokeTestDemoClient(page);

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    await screenshot(page, 'p0-fatal-error');
    report.fatalError = err.message;
  } finally {
    report.findings = FINDINGS;
    fs.writeFileSync('docs/simulation-reports/phase-0-raw.json', JSON.stringify(report, null, 2));
    console.log('\n=== SUMMARY ===');
    console.log(`Findings: ${FINDINGS.length}`);
    FINDINGS.forEach(f => console.log(`  [${f.type}] ${f.id}: ${f.desc}`));
    console.log(`Report: docs/simulation-reports/phase-0-raw.json`);
    await browser.close();
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
