import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const packDir = path.resolve('.evidence/live-browser/2026-05-20-15-31-58-google-food-near-me-to-chefflow-eat');
const screenshotsDir = path.join(packDir, 'screenshots');
const observations = [];

async function visibleText(page) {
  return page.evaluate(() => document.body?.innerText?.replace(/\s+\n/g, '\n') ?? '')
    .then((text) =>
      text
        .replace(/IP address: \d{1,3}(?:\.\d{1,3}){3}/g, 'IP address: [REDACTED_IP]')
        .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[REDACTED_IP]')
        .trim()
        .slice(0, 12000)
    );
}

async function suggestions(page) {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll('[role="listbox"] [role="option"], ul[role="listbox"] li, .erkvQe li, .G43f7e li'),
    ];
    return [...new Set(nodes.map((node) => node.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  });
}

async function note(page, viewport, step, action, filename, extra = {}) {
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
  const text = await visibleText(page);
  observations.push({
    timestamp: new Date().toISOString(),
    viewport,
    step,
    action,
    url: page.url(),
    screenshot: `screenshots/${filename}`,
    title: await page.title().catch(() => ''),
    visibleTextSample: text,
    suggestions: await suggestions(page).catch(() => []),
    ...extra,
  });
}

async function maybeHandleConsent(page) {
  const buttons = [
    'button:has-text("Reject all")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'text=Reject all',
    'text=Accept all',
  ];
  for (const selector of buttons) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 1500 }).catch(() => false)) {
      const label = await locator.innerText().catch(() => selector);
      await locator.click();
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      return label.replace(/\s+/g, ' ').trim();
    }
  }
  return null;
}

async function getInput(page) {
  const candidates = [
    'textarea[name="q"]',
    'input[name="q"]',
    '[aria-label="Search"]',
    '[title="Search"]',
  ];
  for (const selector of candidates) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 2500 }).catch(() => false)) {
      return locator;
    }
  }
  throw new Error('Could not find Google search input');
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(9000);

  await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded' });
  const consentAction = await maybeHandleConsent(page);
  await note(page, 'desktop', '01-start', 'Opened Google starting state before typing', '01-desktop-google-start.png', {
    consentAction,
  });

  const input = await getInput(page);
  await input.click();
  await page.waitForTimeout(700);
  await note(page, 'desktop', '02-focus', 'Focused the search input', '02-desktop-input-focus.png');

  const prefixes = ['f', 'fo', 'foo', 'food', 'food near', 'food near me'];
  let index = 3;
  for (const prefix of prefixes) {
    await input.fill(prefix);
    await page.waitForTimeout(900);
    await note(page, 'desktop', `0${index}-autocomplete-${prefix.replace(/\s+/g, '-')}`, `Typed "${prefix}"`, `${String(index).padStart(2, '0')}-desktop-autocomplete-${prefix.replace(/\s+/g, '-')}.png`, {
      queryFragment: prefix,
    });
    index += 1;
  }

  await input.press('Enter');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);
  await note(page, 'desktop', '09-results-above-fold', 'Submitted "food near me"; captured initial results above the fold', '09-desktop-results-above-fold.png');

  const localPackClicked = await page
    .locator('text=/More places|View all|Map|Places/i')
    .first()
    .click({ timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  if (localPackClicked) {
    await page.waitForTimeout(1500);
    await note(page, 'desktop', '10-safe-local-expansion', 'Clicked a non-final local/map expansion control when visible', '10-desktop-safe-local-expansion.png', {
      localPackClicked,
    });
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
  }

  await page.mouse.wheel(0, 850);
  await page.waitForTimeout(1200);
  await note(page, 'desktop', '11-one-scroll-depth', 'Scrolled one depth below the initial results', '11-desktop-one-scroll-depth.png');

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(1800);
  await note(page, 'desktop', '12-repeat-reload', 'Reloaded once to check volatility', '12-desktop-repeat-reload.png');

  await browser.close();
}

async function runMobile() {
  const browser = await chromium.launch({ headless: true });
  const pixel = devices['Pixel 5'];
  const context = await browser.newContext({
    ...pixel,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(9000);

  await page.goto('https://www.google.com/search?q=food+near+me', { waitUntil: 'domcontentloaded' });
  await maybeHandleConsent(page);
  await page.waitForTimeout(2500);
  await note(page, 'mobile', '13-mobile-results-above-fold', 'Loaded mobile SERP for "food near me"', '13-mobile-results-above-fold.png');

  await page.mouse.wheel(0, 650);
  await page.waitForTimeout(1200);
  await note(page, 'mobile', '14-mobile-one-scroll-depth', 'Scrolled mobile SERP one depth', '14-mobile-one-scroll-depth.png');

  await browser.close();
}

await fs.mkdir(screenshotsDir, { recursive: true });
try {
  await runDesktop();
  await runMobile();
} catch (error) {
  observations.push({
    timestamp: new Date().toISOString(),
    step: 'error',
    action: 'Capture script failed',
    error: String(error?.stack ?? error),
  });
  throw error;
} finally {
  await fs.writeFile(path.join(packDir, 'observations.json'), JSON.stringify(observations, null, 2));
}
