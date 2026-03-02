#!/usr/bin/env node
/**
 * ══════════════════════════════════════════════════════════════
 *  ChefFlow Overnight Audit Engine
 * ══════════════════════════════════════════════════════════════
 *
 *  Usage:  node scripts/overnight-audit.mjs
 *  Time:   4-8 hours (designed to run overnight)
 *  Cost:   $0 — no AI, no agents, no VS Code needed
 *  Output: reports/overnight-YYYY-MM-DD/report.md
 *
 *  What it does:
 *    Phase 1  TypeScript deep audit              (~3 min)
 *    Phase 2  Unit + integration tests           (~5 min)
 *    Phase 3  Full site crawl — every page       (~1-2 hours)
 *             ├ Desktop + mobile screenshots
 *             ├ Console error capture
 *             ├ Accessibility audit (axe-core)
 *             ├ Performance metrics
 *             ├ Broken image detection
 *             └ Link discovery
 *    Phase 4  Dead link verification             (~30 min)
 *    Phase 5  Playwright test marathon            (~2-5 hours)
 *             ├ smoke, e2e, coverage, interactions
 *             ├ launch, diagnostic, journey
 *             └ isolation (security)
 *    Phase 6  Report generation                  (instant)
 *
 *  Go to bed. Wake up to a diagnosis.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// ═══════════════════════ CONFIGURATION ═══════════════════════

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATE = new Date().toISOString().slice(0, 10);
const REPORTS_DIR = path.join(ROOT, 'reports', `overnight-${DATE}`);
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const TEST_RESULTS_DIR = path.join(REPORTS_DIR, 'test-results');
const BASE_URL = 'http://localhost:3100';
const NAV_TIMEOUT = 30_000;
const SUITE_TIMEOUT = 45 * 60 * 1000; // 45 min per test suite

const startTime = Date.now();
let serverProcess = null;

// Test suites in priority order (most valuable first)
const TEST_SUITES = [
  'smoke',
  'coverage-public', 'coverage-chef', 'coverage-client', 'coverage-admin',
  'coverage-auth-boundaries', 'coverage-api',
  'interactions-chef', 'interactions-admin', 'interactions-client', 'interactions-public',
  'isolation-tests',
  'launch-chef', 'launch-client', 'launch-public', 'launch-mobile',
  'diagnostic',
  'journey-chef',
  'chef', 'client', 'cross-portal', 'public',
];

// ═══════════════════════ UTILITIES ════════════════════════════

function log(msg) {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  const elapsed = formatDuration(Date.now() - startTime);
  console.log(`[${t}] [${elapsed}] ${msg}`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function sanitize(route) {
  return (route.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'root');
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

function waitForServer(port, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const poll = async () => {
      if (Date.now() - t0 > timeout) return reject(new Error('Server start timeout'));
      if (await checkPort(port)) return resolve();
      setTimeout(poll, 2000);
    };
    poll();
  });
}

function findFiles(dir, match, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const e of entries) {
    if (['node_modules', '.next', '.git', '.auth'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) findFiles(full, match, results);
    else if (match.test(e.name)) results.push(full);
  }
  return results;
}

// ═══════════════════════ ROUTE DISCOVERY ═════════════════════

function discoverRoutes() {
  const appDir = path.join(ROOT, 'app');
  const pageFiles = findFiles(appDir, /^page\.tsx$/);

  let seed = {};
  try { seed = JSON.parse(fs.readFileSync(path.join(ROOT, '.auth', 'seed-ids.json'), 'utf8')); } catch {}

  const routes = { chef: [], client: [], public: [] };

  for (const file of pageFiles) {
    let rel = path.relative(appDir, path.dirname(file)).replace(/\\/g, '/');

    // Skip special dirs
    if (rel.includes('@') || rel.includes('(.)') || rel.startsWith('api') || rel.includes('embed')) continue;

    // Determine role
    let role = 'public';
    if (rel.includes('(chef)')) role = 'chef';
    else if (rel.includes('(client)')) role = 'client';

    // Strip route groups
    rel = rel.replace(/\([^)]+\)\/?/g, '');

    // Skip catch-all
    if (rel.includes('[...')) continue;

    // Resolve dynamic segments
    if (rel.includes('[')) {
      rel = resolveDynamic(rel, seed);
      if (!rel) continue;
    }

    routes[role].push('/' + rel);
  }

  for (const r of Object.keys(routes)) routes[r].sort();
  return routes;
}

function resolveDynamic(route, seed) {
  const parts = route.split('/');
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('[') && parts[i].endsWith(']')) {
      const ctx = parts[i - 1] || '';
      const val = {
        events: seed.eventIds?.draft,
        clients: seed.clientIds?.primary,
        inquiries: seed.inquiryIds?.awaitingChef,
        quotes: seed.quoteIds?.draft,
        menus: seed.menuId,
        recipes: seed.recipeId,
        staff: seed.staffId,
        'my-events': seed.eventIds?.draft,
        'my-quotes': seed.quoteIds?.draft,
        'my-inquiries': seed.inquiryIds?.awaitingClient,
        chef: seed.chefSlug,
        calls: null, // skip — no seed data
      }[ctx];
      if (!val) return null;
      out.push(val);
    } else {
      out.push(parts[i]);
    }
  }
  return out.join('/');
}

// ═══════════════════════ PHASE 1: TYPESCRIPT ═════════════════

function phaseTypeScript() {
  log('Phase 1/6: TypeScript Deep Audit');
  const results = { errors: [], errorCount: 0, duration: 0 };
  const t0 = Date.now();

  try {
    execSync('npx tsc --noEmit --skipLibCheck 2>&1', { cwd: ROOT, encoding: 'utf8', timeout: 300_000 });
    log('  ✓ Zero TypeScript errors');
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    const lines = output.split('\n').filter(l => l.match(/\.tsx?\(\d+,\d+\):/));
    results.errors = lines.map(l => {
      const m = l.match(/(.+?)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.*)/);
      return m ? { file: m[1], line: m[2], col: m[3], code: m[4], msg: m[5].trim() } : { raw: l };
    });
    results.errorCount = results.errors.length;
    log(`  ⚠ Found ${results.errorCount} TypeScript errors`);
  }

  results.duration = Date.now() - t0;
  log(`  Done (${formatDuration(results.duration)})`);
  return results;
}

// ═══════════════════════ PHASE 2: UNIT TESTS ═════════════════

function phaseUnitTests() {
  log('Phase 2/6: Unit + Integration Tests');
  const results = { unit: null, integration: null, duration: 0 };
  const t0 = Date.now();

  // Unit tests
  try {
    const out = execSync('node --test --import tsx "tests/unit/**/*.test.ts" 2>&1', {
      cwd: ROOT, encoding: 'utf8', timeout: 300_000,
    });
    const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
    results.unit = { pass: +(m?.[1] || 0), fail: +(m?.[2] || 0), output: out.slice(-2000) };
    log(`  Unit: ${results.unit.pass} pass, ${results.unit.fail} fail`);
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
    results.unit = { pass: +(m?.[1] || 0), fail: +(m?.[2] || 0), output: out.slice(-2000) };
    log(`  Unit: ${results.unit.pass} pass, ${results.unit.fail} fail`);
  }

  // Integration tests
  try {
    const out = execSync('node --test --import tsx "tests/integration/**/*.integration.test.ts" 2>&1', {
      cwd: ROOT, encoding: 'utf8', timeout: 300_000,
    });
    const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
    results.integration = { pass: +(m?.[1] || 0), fail: +(m?.[2] || 0), output: out.slice(-2000) };
    log(`  Integration: ${results.integration.pass} pass, ${results.integration.fail} fail`);
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    const m = out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/);
    results.integration = { pass: +(m?.[1] || 0), fail: +(m?.[2] || 0), output: out.slice(-2000) };
    log(`  Integration: ${results.integration.pass} pass, ${results.integration.fail} fail`);
  }

  results.duration = Date.now() - t0;
  log(`  Done (${formatDuration(results.duration)})`);
  return results;
}

// ═══════════════════════ PHASE 3: SITE CRAWL ═════════════════

async function phaseSiteCrawl(routes) {
  log('Phase 3/6: Full Site Crawl');
  const t0 = Date.now();

  // Dynamic imports
  const { chromium } = await import('playwright');
  let AxeBuilder = null;
  try {
    const axeMod = await import('@axe-core/playwright');
    AxeBuilder = axeMod.default || axeMod.AxeBuilder;
    log('  ✓ axe-core loaded for accessibility auditing');
  } catch {
    log('  ⚠ axe-core not available — using manual a11y checks');
  }

  const browser = await chromium.launch({ headless: true });
  const allPages = [];
  const allLinks = new Set();

  // Helper: crawl a set of routes with a given auth context
  async function crawlRole(role, routeList, storageStatePath) {
    if (routeList.length === 0) return;
    log(`  Crawling ${role} routes (${routeList.length} pages)...`);

    let contextOpts = { viewport: { width: 1280, height: 720 } };
    if (storageStatePath && fs.existsSync(storageStatePath)) {
      try {
        contextOpts.storageState = storageStatePath;
      } catch {}
    }

    const context = await browser.newContext(contextOpts);
    const page = await context.newPage();

    for (let i = 0; i < routeList.length; i++) {
      const route = routeList[i];
      const result = await crawlPage(page, route, role, AxeBuilder, allLinks, i + 1, routeList.length);
      allPages.push(result);
    }

    await page.close();
    await context.close();
  }

  // Crawl each role
  await crawlRole('public', routes.public, null);
  await crawlRole('chef', routes.chef, path.join(ROOT, '.auth', 'chef.json'));
  await crawlRole('client', routes.client, path.join(ROOT, '.auth', 'client.json'));

  await browser.close();

  const duration = Date.now() - t0;
  log(`  Crawled ${allPages.length} pages, found ${allLinks.size} links (${formatDuration(duration)})`);
  return { pages: allPages, links: [...allLinks], duration };
}

async function crawlPage(page, route, role, AxeBuilder, allLinks, idx, total) {
  const result = {
    route, role,
    status: 'ok',
    loadTime: 0,
    domNodes: 0,
    consoleErrors: [],
    consoleWarnings: [],
    a11yViolations: [],
    brokenImages: [],
    links: [],
    title: '',
    redirectedTo: null,
    screenshot: { desktop: null, mobile: null },
  };

  // Collect console messages
  const onConsole = (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') result.consoleErrors.push(text.slice(0, 500));
    else if (msg.type() === 'warning') result.consoleWarnings.push(text.slice(0, 500));
  };
  page.on('console', onConsole);

  try {
    const url = `${BASE_URL}${route}`;
    const t0 = Date.now();
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT });
    result.loadTime = Date.now() - t0;
    result.status = response?.status() || 0;

    // Detect redirect (e.g., to sign-in)
    const finalUrl = page.url();
    if (!finalUrl.includes(route.split('?')[0]) && route !== '/') {
      result.redirectedTo = finalUrl.replace(BASE_URL, '');
    }

    // Page title
    result.title = await page.title();

    // DOM node count
    result.domNodes = await page.evaluate(() => document.querySelectorAll('*').length);

    // Broken images
    result.brokenImages = await page.evaluate(() =>
      [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0)
        .map(i => ({ src: i.src?.slice(0, 200), alt: i.alt || '' }))
    );

    // Collect links
    const pageLinks = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith('http'))
    );
    result.links = pageLinks.slice(0, 200);
    pageLinks.forEach(l => allLinks.add(l));

    // Desktop screenshot
    const desktopFile = path.join(SCREENSHOTS_DIR, 'desktop', `${sanitize(route)}.png`);
    await page.screenshot({ path: desktopFile, fullPage: true, timeout: 15000 }).catch(() => {});
    result.screenshot.desktop = path.relative(REPORTS_DIR, desktopFile).replace(/\\/g, '/');

    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const mobileFile = path.join(SCREENSHOTS_DIR, 'mobile', `${sanitize(route)}.png`);
    await page.screenshot({ path: mobileFile, fullPage: true, timeout: 15000 }).catch(() => {});
    result.screenshot.mobile = path.relative(REPORTS_DIR, mobileFile).replace(/\\/g, '/');

    // Reset viewport for next page
    await page.setViewportSize({ width: 1280, height: 720 });

    // Accessibility audit
    if (AxeBuilder) {
      try {
        const axeResults = await new AxeBuilder({ page }).analyze();
        result.a11yViolations = axeResults.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          nodes: v.nodes.length,
          elements: v.nodes.slice(0, 3).map(n => n.html?.slice(0, 120) || ''),
        }));
      } catch {}
    } else {
      // Manual fallback
      result.a11yViolations = await page.evaluate(() => {
        const v = [];
        document.querySelectorAll('img:not([alt])').forEach(i =>
          v.push({ id: 'image-alt', impact: 'critical', description: 'Image missing alt text', nodes: 1, elements: [i.outerHTML.slice(0, 120)] })
        );
        document.querySelectorAll('button').forEach(b => {
          if (!b.textContent?.trim() && !b.getAttribute('aria-label'))
            v.push({ id: 'button-name', impact: 'critical', description: 'Button has no accessible name', nodes: 1, elements: [b.outerHTML.slice(0, 120)] });
        });
        document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
          const id = el.id;
          if (!id || !document.querySelector(`label[for="${id}"]`))
            if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
              v.push({ id: 'label', impact: 'critical', description: 'Form input missing label', nodes: 1, elements: [el.outerHTML.slice(0, 120)] });
        });
        return v;
      });
    }

    const errCount = result.consoleErrors.length;
    const a11yCount = result.a11yViolations.length;
    const status = errCount > 0 ? '✗' : '✓';
    log(`  [${idx}/${total}] ${role}: ${route} ${status} (${result.loadTime}ms, ${errCount} errors, ${a11yCount} a11y)`);
  } catch (err) {
    result.status = 'error';
    result.consoleErrors.push(`Navigation failed: ${err.message}`);
    log(`  [${idx}/${total}] ${role}: ${route} ✗ FAILED: ${err.message.slice(0, 100)}`);
  }

  page.removeListener('console', onConsole);
  return result;
}

// ═══════════════════════ PHASE 4: DEAD LINKS ═════════════════

async function phaseDeadLinks(links) {
  log('Phase 4/6: Dead Link Check');
  const t0 = Date.now();

  // Only check internal links
  const internal = links.filter(l => l.startsWith(BASE_URL));
  const unique = [...new Set(internal)];
  log(`  Checking ${unique.length} unique internal links...`);

  const dead = [];
  for (let i = 0; i < unique.length; i++) {
    try {
      const res = await fetch(unique[i], { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (res.status >= 400) {
        dead.push({ url: unique[i], status: res.status });
      }
    } catch (err) {
      dead.push({ url: unique[i], status: 'error', error: err.message?.slice(0, 100) });
    }

    if ((i + 1) % 50 === 0) log(`  Checked ${i + 1}/${unique.length} links...`);
  }

  const duration = Date.now() - t0;
  log(`  Found ${dead.length} dead links (${formatDuration(duration)})`);
  return { dead, total: unique.length, duration };
}

// ═══════════════════════ PHASE 5: TEST MARATHON ══════════════

function phaseTestMarathon() {
  log('Phase 5/6: Playwright Test Marathon');
  const t0 = Date.now();
  const results = [];

  for (const suite of TEST_SUITES) {
    log(`  Running: ${suite}...`);
    const suiteT0 = Date.now();
    const outputFile = path.join(TEST_RESULTS_DIR, `${suite}.json`);

    let passed = 0, failed = 0, skipped = 0, timedOut = false;
    const failures = [];

    try {
      execSync(`npx playwright test --project=${suite} --reporter=json`, {
        cwd: ROOT,
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024,
        timeout: SUITE_TIMEOUT,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: outputFile },
      });
    } catch (err) {
      if (err.killed) timedOut = true;
    }

    // Parse results
    try {
      const json = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      if (json.suites) {
        const countTests = (suites) => {
          for (const s of suites) {
            if (s.specs) {
              for (const spec of s.specs) {
                for (const test of spec.tests || []) {
                  for (const result of test.results || []) {
                    if (result.status === 'passed') passed++;
                    else if (result.status === 'failed' || result.status === 'timedOut') {
                      failed++;
                      failures.push({
                        title: spec.title,
                        file: spec.file || s.file || '',
                        error: (result.errors || []).map(e => e.message?.slice(0, 300)).join('; ') || result.status,
                      });
                    } else if (result.status === 'skipped') skipped++;
                  }
                }
              }
            }
            if (s.suites) countTests(s.suites);
          }
        };
        countTests(json.suites);
      }
    } catch {
      // JSON parse failed — suite probably didn't run at all
    }

    const suiteDuration = Date.now() - suiteT0;
    const status = failed === 0 && !timedOut ? '✓' : '✗';
    log(`  ${status} ${suite}: ${passed} pass, ${failed} fail, ${skipped} skip (${formatDuration(suiteDuration)})${timedOut ? ' [TIMED OUT]' : ''}`);

    results.push({ suite, passed, failed, skipped, timedOut, failures, duration: suiteDuration });
  }

  const duration = Date.now() - t0;
  const totalPass = results.reduce((s, r) => s + r.passed, 0);
  const totalFail = results.reduce((s, r) => s + r.failed, 0);
  log(`  Marathon complete: ${totalPass} pass, ${totalFail} fail (${formatDuration(duration)})`);
  return { suites: results, duration };
}

// ═══════════════════════ REPORT GENERATOR ════════════════════

function generateReport(ts, unit, crawl, deadLinks, tests) {
  log('Phase 6/6: Generating Report');
  const totalDuration = Date.now() - startTime;

  // ── Calculate health score ──
  let score = 100;
  score -= Math.min(20, (ts.errorCount || 0) * 0.5);
  const unitFail = (unit.unit?.fail || 0) + (unit.integration?.fail || 0);
  score -= Math.min(15, unitFail * 2);
  const totalConsoleErrors = crawl.pages.reduce((s, p) => s + p.consoleErrors.length, 0);
  score -= Math.min(15, totalConsoleErrors * 1.5);
  const critA11y = crawl.pages.reduce((s, p) => s + p.a11yViolations.filter(v => v.impact === 'critical').length, 0);
  const totalA11y = crawl.pages.reduce((s, p) => s + p.a11yViolations.length, 0);
  score -= Math.min(20, critA11y * 2 + (totalA11y - critA11y) * 0.3);
  score -= Math.min(5, (deadLinks.dead?.length || 0) * 2);
  const testFail = tests.suites.reduce((s, r) => s + r.failed, 0);
  const testPass = tests.suites.reduce((s, r) => s + r.passed, 0);
  score -= Math.min(20, testFail * 0.5);
  score = Math.max(0, Math.round(score));
  const letterGrade = grade(score);

  // ── Collect top issues ──
  const topIssues = [];

  // Console errors
  const pagesWithErrors = crawl.pages.filter(p => p.consoleErrors.length > 0);
  if (pagesWithErrors.length > 0) {
    topIssues.push({
      severity: 'HIGH',
      title: `${totalConsoleErrors} console errors across ${pagesWithErrors.length} pages`,
      details: pagesWithErrors.slice(0, 5).map(p => `- **${p.route}**: ${p.consoleErrors[0]?.slice(0, 150)}`).join('\n'),
      fix: 'Check the browser console on each affected page. Fix runtime errors — these indicate crashes or failed operations that users will encounter.',
    });
  }

  // Critical accessibility
  if (critA11y > 0) {
    const critPages = crawl.pages.filter(p => p.a11yViolations.some(v => v.impact === 'critical'));
    topIssues.push({
      severity: 'CRITICAL',
      title: `${critA11y} critical accessibility violations on ${critPages.length} pages`,
      details: critPages.slice(0, 5).map(p => {
        const crits = p.a11yViolations.filter(v => v.impact === 'critical');
        return `- **${p.route}**: ${crits.map(c => c.description).join(', ')}`;
      }).join('\n'),
      fix: 'Critical a11y violations mean users with disabilities CANNOT use these pages. Fix missing form labels, image alt text, and button names. See the Accessibility section below for specifics.',
    });
  }

  // Failed tests
  if (testFail > 0) {
    const failedSuites = tests.suites.filter(s => s.failed > 0);
    topIssues.push({
      severity: 'HIGH',
      title: `${testFail} test failures across ${failedSuites.length} suites`,
      details: failedSuites.slice(0, 5).map(s =>
        `- **${s.suite}**: ${s.failed} failures — ${s.failures[0]?.title || 'unknown'}`
      ).join('\n'),
      fix: 'Review each failed test. Failures indicate either regressions (code broke something) or stale tests (tests need updating). See the Test Marathon section for details.',
    });
  }

  // Broken images
  const brokenImgPages = crawl.pages.filter(p => p.brokenImages.length > 0);
  const brokenImgCount = brokenImgPages.reduce((s, p) => s + p.brokenImages.length, 0);
  if (brokenImgCount > 0) {
    topIssues.push({
      severity: 'MEDIUM',
      title: `${brokenImgCount} broken images on ${brokenImgPages.length} pages`,
      details: brokenImgPages.slice(0, 5).map(p => `- **${p.route}**: ${p.brokenImages.map(i => i.src?.split('/').pop()).join(', ')}`).join('\n'),
      fix: 'Verify image file paths exist and are correctly imported. Check for typos in src attributes.',
    });
  }

  // Dead links
  if (deadLinks.dead?.length > 0) {
    topIssues.push({
      severity: 'MEDIUM',
      title: `${deadLinks.dead.length} dead internal links`,
      details: deadLinks.dead.slice(0, 5).map(l => `- ${l.url.replace(BASE_URL, '')} → ${l.status}`).join('\n'),
      fix: 'These links lead to 404 or error pages. Update the href or remove the link.',
    });
  }

  // Auth redirects
  const redirected = crawl.pages.filter(p => p.redirectedTo);
  if (redirected.length > 0) {
    topIssues.push({
      severity: 'LOW',
      title: `${redirected.length} pages redirected (likely expired auth)`,
      details: redirected.slice(0, 5).map(p => `- **${p.route}** → ${p.redirectedTo}`).join('\n'),
      fix: 'Run `npm run seed:e2e` to refresh test auth tokens, then re-run the audit.',
    });
  }

  // Sort by severity
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  topIssues.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

  // ── Build report ──
  const lines = [];
  const w = (s) => lines.push(s);

  w('# ChefFlow Overnight Audit Report');
  w('');
  w(`> **Generated:** ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
  w(`> **Duration:** ${formatDuration(totalDuration)}`);
  w(`> **Server:** ${BASE_URL}`);
  w(`> **Machine:** ${process.platform} / Node ${process.version}`);
  w('');
  w('---');
  w('');

  // Health Score
  w(`## Health Score: ${score}/100 (${letterGrade})`);
  w('');
  w('| Category | Result | Score |');
  w('|----------|--------|-------|');
  w(`| TypeScript Errors | ${ts.errorCount || 0} errors | ${Math.max(0, 20 - Math.min(20, (ts.errorCount || 0) * 0.5)).toFixed(0)}/20 |`);
  w(`| Unit Tests | ${unit.unit?.pass || 0} pass, ${unit.unit?.fail || 0} fail | ${Math.max(0, 15 - Math.min(15, unitFail * 2)).toFixed(0)}/15 |`);
  w(`| Console Errors | ${totalConsoleErrors} on ${pagesWithErrors.length} pages | ${Math.max(0, 15 - Math.min(15, totalConsoleErrors * 1.5)).toFixed(0)}/15 |`);
  w(`| Accessibility | ${totalA11y} violations (${critA11y} critical) | ${Math.max(0, 20 - Math.min(20, critA11y * 2 + (totalA11y - critA11y) * 0.3)).toFixed(0)}/20 |`);
  w(`| Dead Links | ${deadLinks.dead?.length || 0} dead | ${Math.max(0, 5 - Math.min(5, (deadLinks.dead?.length || 0) * 2)).toFixed(0)}/5 |`);
  w(`| E2E Tests | ${testPass} pass, ${testFail} fail | ${Math.max(0, 20 - Math.min(20, testFail * 0.5)).toFixed(0)}/20 |`);
  w(`| **Total** | | **${score}/100 (${letterGrade})** |`);
  w('');
  w('---');
  w('');

  // Top Issues
  w('## Top Issues to Fix (Priority Order)');
  w('');
  if (topIssues.length === 0) {
    w('No significant issues found! The app is in great shape.');
  } else {
    topIssues.forEach((issue, i) => {
      w(`### ${i + 1}. [${issue.severity}] ${issue.title}`);
      w('');
      w(issue.details);
      w('');
      w(`**Fix:** ${issue.fix}`);
      w('');
    });
  }
  w('---');
  w('');

  // Phase 1: TypeScript
  w('## Phase 1: TypeScript Audit');
  w('');
  w(`- **Errors:** ${ts.errorCount || 0}`);
  w(`- **Duration:** ${formatDuration(ts.duration)}`);
  w('');
  if (ts.errors.length > 0) {
    w('| File | Line | Code | Message |');
    w('|------|------|------|---------|');
    ts.errors.slice(0, 50).forEach(e => {
      if (e.file) w(`| ${e.file} | ${e.line} | ${e.code} | ${e.msg?.slice(0, 80)} |`);
      else w(`| — | — | — | ${e.raw?.slice(0, 80)} |`);
    });
    if (ts.errors.length > 50) w(`\n*...and ${ts.errors.length - 50} more errors*`);
  }
  w('');

  // Phase 2: Unit Tests
  w('## Phase 2: Unit + Integration Tests');
  w('');
  w(`- **Unit:** ${unit.unit?.pass || 0} pass / ${unit.unit?.fail || 0} fail`);
  w(`- **Integration:** ${unit.integration?.pass || 0} pass / ${unit.integration?.fail || 0} fail`);
  w(`- **Duration:** ${formatDuration(unit.duration)}`);
  w('');

  // Phase 3: Site Crawl
  w('## Phase 3: Site Crawl Results');
  w('');
  w(`- **Pages crawled:** ${crawl.pages.length}`);
  w(`- **Links discovered:** ${crawl.links.length}`);
  w(`- **Duration:** ${formatDuration(crawl.duration)}`);
  w('');

  for (const role of ['public', 'chef', 'client']) {
    const rolePages = crawl.pages.filter(p => p.role === role);
    if (rolePages.length === 0) continue;

    w(`### ${role.charAt(0).toUpperCase() + role.slice(1)} Routes (${rolePages.length} pages)`);
    w('');
    w('| Route | Status | Load Time | DOM Nodes | Errors | A11y | Desktop | Mobile |');
    w('|-------|--------|-----------|-----------|--------|------|---------|--------|');
    rolePages.forEach(p => {
      const status = p.redirectedTo ? `→ ${p.redirectedTo.slice(0, 20)}` : (p.status === 'error' ? 'ERR' : p.status);
      const desktop = p.screenshot.desktop ? `[pic](${p.screenshot.desktop})` : '—';
      const mobile = p.screenshot.mobile ? `[pic](${p.screenshot.mobile})` : '—';
      w(`| ${p.route} | ${status} | ${p.loadTime}ms | ${p.domNodes} | ${p.consoleErrors.length} | ${p.a11yViolations.length} | ${desktop} | ${mobile} |`);
    });
    w('');
  }

  // Console Errors Detail
  if (totalConsoleErrors > 0) {
    w('### Console Errors (Detail)');
    w('');
    pagesWithErrors.forEach(p => {
      w(`**${p.route}** (${p.consoleErrors.length} errors):`);
      p.consoleErrors.slice(0, 5).forEach(e => w(`- \`${e.slice(0, 200)}\``));
      w('');
    });
  }

  // Phase 4: Accessibility
  w('## Phase 4: Accessibility Report');
  w('');
  w(`- **Total violations:** ${totalA11y}`);
  w(`- **Critical:** ${critA11y}`);
  const seriousA11y = crawl.pages.reduce((s, p) => s + p.a11yViolations.filter(v => v.impact === 'serious').length, 0);
  const moderateA11y = crawl.pages.reduce((s, p) => s + p.a11yViolations.filter(v => v.impact === 'moderate').length, 0);
  w(`- **Serious:** ${seriousA11y}`);
  w(`- **Moderate:** ${moderateA11y}`);
  w('');

  // Group violations by rule
  const violationMap = new Map();
  crawl.pages.forEach(p => {
    p.a11yViolations.forEach(v => {
      if (!violationMap.has(v.id)) violationMap.set(v.id, { ...v, pages: [], totalNodes: 0 });
      const entry = violationMap.get(v.id);
      entry.pages.push(p.route);
      entry.totalNodes += v.nodes;
    });
  });

  if (violationMap.size > 0) {
    w('| Rule | Impact | Occurrences | Pages | Description |');
    w('|------|--------|-------------|-------|-------------|');
    [...violationMap.values()]
      .sort((a, b) => (['critical', 'serious', 'moderate', 'minor'].indexOf(a.impact) - ['critical', 'serious', 'moderate', 'minor'].indexOf(b.impact)))
      .forEach(v => {
        const pages = [...new Set(v.pages)].slice(0, 3).join(', ');
        const more = new Set(v.pages).size > 3 ? ` +${new Set(v.pages).size - 3} more` : '';
        w(`| ${v.id} | **${v.impact}** | ${v.totalNodes} | ${pages}${more} | ${v.description?.slice(0, 60)} |`);
      });
    w('');
  }

  // Phase 5: Dead Links
  w('## Phase 5: Dead Links');
  w('');
  w(`- **Checked:** ${deadLinks.total || 0} internal links`);
  w(`- **Dead:** ${deadLinks.dead?.length || 0}`);
  w(`- **Duration:** ${formatDuration(deadLinks.duration)}`);
  w('');
  if (deadLinks.dead?.length > 0) {
    w('| URL | Status |');
    w('|-----|--------|');
    deadLinks.dead.forEach(l => w(`| ${l.url.replace(BASE_URL, '')} | ${l.status} |`));
    w('');
  }

  // Phase 6: Test Marathon
  w('## Phase 6: Test Marathon Results');
  w('');
  const totalTests = testPass + testFail;
  w(`- **Total:** ${totalTests} tests across ${tests.suites.length} suites`);
  w(`- **Passed:** ${testPass} (${totalTests ? ((testPass / totalTests) * 100).toFixed(1) : 0}%)`);
  w(`- **Failed:** ${testFail}`);
  w(`- **Duration:** ${formatDuration(tests.duration)}`);
  w('');
  w('### Suite Breakdown');
  w('');
  w('| Suite | Pass | Fail | Skip | Duration | Status |');
  w('|-------|------|------|------|----------|--------|');
  tests.suites.forEach(s => {
    const status = s.timedOut ? 'TIMEOUT' : (s.failed === 0 ? (s.passed > 0 ? '✓' : '—') : '✗');
    w(`| ${s.suite} | ${s.passed} | ${s.failed} | ${s.skipped} | ${formatDuration(s.duration)} | ${status} |`);
  });
  w('');

  // Failed test details
  const allFailures = tests.suites.flatMap(s => s.failures.map(f => ({ suite: s.suite, ...f })));
  if (allFailures.length > 0) {
    w('### Failed Tests (Detail + Diagnosis)');
    w('');
    allFailures.slice(0, 30).forEach((f, i) => {
      w(`**${i + 1}. ${f.title}** (${f.suite})`);
      w(`- File: \`${f.file}\``);
      w(`- Error: \`${f.error?.slice(0, 200)}\``);
      // Diagnosis
      if (f.error?.includes('Timeout')) {
        w('- Diagnosis: Page or element took too long to load. Likely a slow server response or missing element selector.');
        w('- Fix: Check if the route exists and loads correctly. The selector in the test may need updating.');
      } else if (f.error?.includes('expect(')) {
        w('- Diagnosis: An assertion failed — the page content doesn\'t match what the test expects.');
        w('- Fix: Either the feature regressed (fix the code) or the test is outdated (update the assertion).');
      } else if (f.error?.includes('404') || f.error?.includes('Not Found')) {
        w('- Diagnosis: The test tried to navigate to a route that doesn\'t exist or isn\'t rendering.');
        w('- Fix: Check if the route exists in the app directory. It may have been moved or renamed.');
      } else {
        w('- Diagnosis: Runtime error during test execution.');
        w('- Fix: Review the test file and the component it tests. The error message above is the key clue.');
      }
      w('');
    });
    if (allFailures.length > 30) w(`*...and ${allFailures.length - 30} more failures*\n`);
  }

  w('');
  w('---');
  w('');
  w(`*Report generated by ChefFlow Overnight Audit Engine in ${formatDuration(totalDuration)}*`);

  // Write report
  const reportPath = path.join(REPORTS_DIR, 'report.md');
  fs.writeFileSync(reportPath, lines.join('\n'));
  log(`Report written to: ${reportPath}`);

  // Also write a JSON summary for machine parsing
  const summary = {
    date: DATE,
    duration: totalDuration,
    score, grade: letterGrade,
    typescript: { errors: ts.errorCount },
    unitTests: { pass: unit.unit?.pass || 0, fail: unit.unit?.fail || 0 },
    crawl: { pages: crawl.pages.length, consoleErrors: totalConsoleErrors, a11yViolations: totalA11y, criticalA11y: critA11y, brokenImages: brokenImgCount },
    deadLinks: { total: deadLinks.total, dead: deadLinks.dead?.length || 0 },
    tests: { pass: testPass, fail: testFail, suites: tests.suites.length },
  };
  fs.writeFileSync(path.join(REPORTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  return { score, grade: letterGrade, reportPath };
}

// ═══════════════════════ MAIN ════════════════════════════════

async function main() {
  // Banner
  console.log('\n' + '═'.repeat(60));
  console.log('  ChefFlow Overnight Audit Engine');
  console.log('  ' + new Date().toLocaleString());
  console.log('  Estimated: 4-8 hours. Go to bed.');
  console.log('═'.repeat(60) + '\n');

  // Create directories
  for (const dir of [REPORTS_DIR, path.join(SCREENSHOTS_DIR, 'desktop'), path.join(SCREENSHOTS_DIR, 'mobile'), TEST_RESULTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Heartbeat (every 10 minutes)
  const heartbeat = setInterval(() => {
    log(`... still running (${formatDuration(Date.now() - startTime)} elapsed)`);
  }, 10 * 60 * 1000);

  // Check server
  const serverUp = await checkPort(3100);
  if (!serverUp) {
    log('No server on port 3100. Starting dev server...');
    serverProcess = spawn('npx', ['next', 'dev', '-p', '3100', '-H', '0.0.0.0'], {
      cwd: ROOT,
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, SUPABASE_E2E_ALLOW_REMOTE: 'true' },
    });
    try {
      await waitForServer(3100, 180_000);
      log('Dev server started on port 3100');
    } catch (err) {
      log('FATAL: Could not start dev server. Exiting.');
      clearInterval(heartbeat);
      process.exit(1);
    }
  } else {
    log('Server detected on port 3100 — using existing server');
  }

  // Discover routes
  const routes = discoverRoutes();
  const totalRoutes = routes.chef.length + routes.client.length + routes.public.length;
  log(`Discovered ${totalRoutes} routes (${routes.chef.length} chef, ${routes.client.length} client, ${routes.public.length} public)`);

  // ── Run Phases ──
  let tsResults, unitResults, crawlResults, deadLinkResults, testResults;

  // Phase 1: TypeScript
  try { tsResults = phaseTypeScript(); } catch (err) {
    log(`Phase 1 failed: ${err.message}`);
    tsResults = { errorCount: -1, errors: [], duration: 0 };
  }

  // Phase 2: Unit Tests
  try { unitResults = phaseUnitTests(); } catch (err) {
    log(`Phase 2 failed: ${err.message}`);
    unitResults = { unit: { pass: 0, fail: 0 }, integration: { pass: 0, fail: 0 }, duration: 0 };
  }

  // Phase 3: Site Crawl
  try { crawlResults = await phaseSiteCrawl(routes); } catch (err) {
    log(`Phase 3 failed: ${err.message}`);
    crawlResults = { pages: [], links: [], duration: 0 };
  }

  // Phase 4: Dead Links
  try { deadLinkResults = await phaseDeadLinks(crawlResults.links); } catch (err) {
    log(`Phase 4 failed: ${err.message}`);
    deadLinkResults = { dead: [], total: 0, duration: 0 };
  }

  // Phase 5: Test Marathon
  try { testResults = phaseTestMarathon(); } catch (err) {
    log(`Phase 5 failed: ${err.message}`);
    testResults = { suites: [], duration: 0 };
  }

  // Phase 6: Report
  const report = generateReport(tsResults, unitResults, crawlResults, deadLinkResults, testResults);

  // Cleanup
  clearInterval(heartbeat);
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log(`  AUDIT COMPLETE`);
  console.log(`  Health Score: ${report.score}/100 (${report.grade})`);
  console.log(`  Duration: ${formatDuration(Date.now() - startTime)}`);
  console.log(`  Report: ${report.reportPath}`);
  console.log('═'.repeat(60) + '\n');
}

// ── Entry point ──
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// ── Cleanup on interrupt ──
process.on('SIGINT', () => {
  console.log('\nInterrupted. Cleaning up...');
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}
  }
  process.exit(0);
});
