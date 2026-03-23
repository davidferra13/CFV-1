/**
 * Culinary section navigation test
 * Uses the agent test account to explore the culinary hub and sidebar navigation.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3100';
const SCREENSHOT_DIR = '/c/Users/david/Documents/CFv1/test-results/culinary-nav';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let stepNum = 0;
async function screenshot(page, label) {
  stepNum++;
  const filename = path.join(SCREENSHOT_DIR, `${String(stepNum).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`[screenshot] ${filename}`);
  return filename;
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(15000);

  // ── Step 1: Sign in via API ──────────────────────────────────────────────
  console.log('\n=== STEP 1: Sign in via API ===');
  const authRes = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' },
    timeout: 60000,
  });
  const authBody = await authRes.json().catch(() => ({}));
  console.log('Auth status:', authRes.status(), JSON.stringify(authBody).slice(0, 200));

  if (!authRes.ok()) {
    console.error('Auth failed - aborting');
    await browser.close();
    return;
  }

  await goto(page, `${BASE_URL}/dashboard`);
  console.log('Current URL after login:', page.url());

  // ── Step 2: Navigate to /culinary ────────────────────────────────────────
  console.log('\n=== STEP 2: Navigate to /culinary ===');
  await goto(page, `${BASE_URL}/culinary`);
  console.log('URL:', page.url());
  await screenshot(page, 'culinary-hub-full-page');

  const pageTitle = await page.title();
  const h1Text = await page.$eval('h1', el => el.textContent).catch(() => 'no h1');
  console.log('Page title:', pageTitle);
  console.log('H1 text:', h1Text);

  // ── Step 3: Sidebar sub-menu items ───────────────────────────────────────
  console.log('\n=== STEP 3: Sidebar Culinary sub-menu ===');

  // Already visible because we're on /culinary - check if sub-items show
  const culinarySubItems = await page.$$eval('nav a, aside a', els =>
    els
      .filter(el => {
        const href = el.getAttribute('href') || '';
        return href.includes('/culinary/') || href === '/menus' || href.includes('costing') || href.includes('prep');
      })
      .map(el => ({ text: el.textContent?.trim().slice(0, 60), href: el.getAttribute('href') }))
  );
  console.log('Culinary sub-items in nav/aside:', JSON.stringify(culinarySubItems, null, 2));

  // Check if there is a chevron/toggle button for Culinary in the sidebar
  // Look for the Culinary parent nav item wrapper
  const culinaryParentInfo = await page.evaluate(() => {
    // Find the sidebar Culinary link
    const culinaryLink = document.querySelector('nav a[href="/culinary"], aside a[href="/culinary"]');
    if (!culinaryLink) return { found: false };

    // Check parent li for a toggle button
    const li = culinaryLink.closest('li');
    if (!li) return { found: true, hasLi: false };

    const toggleBtn = li.querySelector('button');
    const allButtons = Array.from(li.querySelectorAll('button')).map(b => b.textContent?.trim().slice(0, 40));
    const allLinks = Array.from(li.querySelectorAll('a')).map(a => ({ text: a.textContent?.trim().slice(0, 40), href: a.getAttribute('href') }));
    const liHTML = li.outerHTML.slice(0, 500);

    return { found: true, hasLi: true, hasToggleBtn: !!toggleBtn, allButtons, allLinks, liHTMLSnippet: liHTML };
  });
  console.log('Culinary parent li info:', JSON.stringify(culinaryParentInfo, null, 2));

  // Try to click the chevron/toggle to expand (if not already expanded)
  // The sub-menu items (Recipes, Menus, Costing, Prep) are already visible since we found them above
  // Let's check if there's an actual expand button to click
  const chevronBtn = await page.$('nav a[href="/culinary"] ~ button, aside a[href="/culinary"] ~ button');
  if (chevronBtn) {
    console.log('Found chevron button next to Culinary link, clicking it');
    await chevronBtn.click().catch(() => {});
    await page.waitForTimeout(500);
  } else {
    console.log('No separate chevron found - sub-menu may be auto-expanded when on /culinary');
  }

  await screenshot(page, 'culinary-sidebar-state');

  // ── Step 4: Verify sub-menu items (Recipes, Menus, Costing, Prep) ────────
  console.log('\n=== STEP 4: Verify sub-menu items ===');
  const subItemsVisible = {
    recipes: !!(await page.$('nav a[href="/culinary/recipes"], aside a[href="/culinary/recipes"]')),
    menus: !!(await page.$('nav a[href="/menus"], aside a[href="/menus"]')),
    costing: !!(await page.$('nav a[href="/culinary/costing"], aside a[href="/culinary/costing"]')),
    prep: !!(await page.$('nav a[href="/culinary/prep"], aside a[href="/culinary/prep"]')),
  };
  console.log('Sub-menu items visible in sidebar nav:', JSON.stringify(subItemsVisible));

  // ── Step 5: Click Recipe Book tile (navigate directly to avoid intercept) ─
  console.log('\n=== STEP 5: Culinary hub tiles ===');

  // Inspect the hub page tiles - find all links in the main content area
  const hubTiles = await page.evaluate(() => {
    // Exclude sidebar - look for links in the main content section
    const main = document.querySelector('main');
    if (!main) return [];
    return Array.from(main.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().slice(0, 80),
      href: a.getAttribute('href'),
      classes: a.className.slice(0, 60),
    }));
  });
  console.log('Hub page tiles (main area):', JSON.stringify(hubTiles, null, 2));

  // Navigate directly to recipe book
  console.log('Navigating to /culinary/recipes directly');
  await goto(page, `${BASE_URL}/culinary/recipes`);
  console.log('URL:', page.url());
  const recipeH1 = await page.$eval('h1', el => el.textContent).catch(() => 'no h1');
  console.log('Recipe page H1:', recipeH1);
  await screenshot(page, 'recipe-book-page');

  // ── Step 6: Menus page ────────────────────────────────────────────────────
  console.log('\n=== STEP 6: Back to /culinary, then Menus ===');
  // First show /culinary page state
  await goto(page, `${BASE_URL}/culinary`);
  console.log('Back on /culinary');

  // Now navigate to menus
  console.log('Navigating to /menus');
  await goto(page, `${BASE_URL}/menus`);
  console.log('URL:', page.url());
  const menusH1 = await page.$eval('h1', el => el.textContent).catch(() => 'no h1');
  console.log('Menus page H1:', menusH1);
  await screenshot(page, 'menus-page');

  // ── Step 7: Create Menu button on /culinary ───────────────────────────────
  console.log('\n=== STEP 7: Create Menu button on /culinary ===');
  await goto(page, `${BASE_URL}/culinary`);

  // Look for Create Menu button in top right / anywhere on page
  const createMenuInfo = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button, a'));
    const createMenu = allBtns.filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('create menu') || text.includes('new menu') || (text.includes('create') && text.includes('menu'));
    });
    return createMenu.map(el => ({
      text: el.textContent?.trim().slice(0, 80),
      tag: el.tagName,
      href: el.getAttribute('href'),
      classes: el.className.slice(0, 80),
    }));
  });
  console.log('Create Menu elements:', JSON.stringify(createMenuInfo, null, 2));

  // Also check the top-right area of the page
  const topRightContent = await page.evaluate(() => {
    const topArea = document.querySelector('header, [class*="header"], [class*="page-header"], [class*="top"]');
    if (!topArea) {
      // Fallback: get all buttons and links near the top of main
      const main = document.querySelector('main');
      if (!main) return 'no main';
      const firstSection = main.querySelector('div');
      return firstSection ? firstSection.innerHTML.slice(0, 500) : 'no first section';
    }
    return topArea.textContent?.slice(0, 300);
  });
  console.log('Top area content:', topRightContent);

  await screenshot(page, 'culinary-hub-with-create-btn');

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await browser.close();
  console.log('\n=== DONE ===');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
