import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from './scripts/lib/supabase.mjs';

const admin = createAdminClient();
const chefId = '91ec0e6a-ce61-41ec-b9e5-eea3b415e5b8';
const eventId = 'e0a10002-0001-4000-8000-000000000030';

// Ensure clean state
await admin.from('chef_preferences').update({ locked_event_id: null }).eq('chef_id', chefId);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

// Sign in via form
console.log('1. Signing in...');
await page.goto('http://localhost:3100/auth/signin', { timeout: 120000, waitUntil: 'commit' });
await page.waitForTimeout(2000);
await page.locator('input[type="email"]').fill('agent@chefflow.test');
await page.locator('input[type="password"]').fill('AgentChefFlow!2026');
await page.locator('button[type="submit"]').click();
// Wait for redirect away from signin
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(1000);
  if (!page.url().includes('signin')) break;
}
console.log('   URL:', page.url());
if (page.url().includes('signin')) {
  console.log('   Sign-in failed, retrying...');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(10000);
  console.log('   URL after retry:', page.url());
}

// Aggressively dismiss ALL overlays - keep trying
async function dismissOverlays() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let dismissed = false;
    for (const label of ['Skip for now', 'Skip', 'Dismiss', 'Decline', 'Not now', 'Close', 'Got it', 'Later']) {
      const btn = page.getByRole('button', { name: label });
      if (await btn.count() > 0) {
        await btn.first().click({ force: true }).catch(() => {});
        dismissed = true;
        await page.waitForTimeout(500);
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (!dismissed && attempt > 3) break;
  }
  // Last resort: hide overlays via CSS (don't remove - that breaks React)
  await page.evaluate(() => {
    document.querySelectorAll('div.fixed.inset-0').forEach(el => {
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    });
  });
  console.log('   Overlays hidden via CSS');
  return true;
}

console.log('2. Dismissing overlays...');
await dismissOverlays();
await page.waitForTimeout(1000);

// Navigate to event page
console.log('3. Going to event page...');
await page.goto('http://localhost:3100/events/' + eventId, { timeout: 120000, waitUntil: 'commit' });
await page.waitForTimeout(3000);
await dismissOverlays();

// Wait for page content to render (wait for Lock In button to appear)
const lockBtn = page.getByRole('button', { name: /lock in/i });
try {
  await lockBtn.waitFor({ state: 'visible', timeout: 30000 });
} catch {
  // Page may still be loading, wait more
  await page.waitForTimeout(10000);
  await dismissOverlays();
}

await page.screenshot({ path: 'tmp-lockin-before.png', fullPage: false });

const lockCount = await lockBtn.count();
console.log('4. Lock In buttons found:', lockCount);

if (lockCount > 0) {
  // Check if button is actually clickable (no overlay)
  const isVisible = await lockBtn.isVisible();
  console.log('   Button visible:', isVisible);

  await lockBtn.click({ timeout: 10000 });
  console.log('5. Clicked Lock In (normal click succeeded)');

  // Wait for server action + revalidation
  await page.waitForTimeout(8000);

  // Check button text
  const btnText = await lockBtn.textContent().catch(() => 'element gone');
  console.log('6. Button text after:', btnText);

  // Check DB
  const { data: prefs } = await admin.from('chef_preferences')
    .select('locked_event_id')
    .eq('chef_id', chefId)
    .single();
  console.log('7. DB locked_event_id:', prefs?.locked_event_id);

  if (prefs?.locked_event_id === eventId) {
    console.log('   ✅ LOCK-IN SERVER ACTION WORKS');

    // Screenshot locked state
    await page.screenshot({ path: 'tmp-lockin-after.png', fullPage: false });

    // Now test EXIT - click Exit Lock-In button on the same page
    const exitBtn = page.locator('button:has-text("Exit Lock-In")');
    const exitCount = await exitBtn.count();
    console.log('8. Exit Lock-In buttons:', exitCount);

    if (exitCount > 0) {
      await exitBtn.click({ timeout: 10000 });
      console.log('9. Clicked Exit Lock-In');
      await page.waitForTimeout(5000);

      const { data: afterUnlock } = await admin.from('chef_preferences')
        .select('locked_event_id')
        .eq('chef_id', chefId)
        .single();
      console.log('10. DB after unlock:', afterUnlock?.locked_event_id);

      if (afterUnlock?.locked_event_id === null) {
        console.log('    ✅ UNLOCK SERVER ACTION WORKS');
      } else {
        console.log('    ❌ UNLOCK FAILED');
      }
    }

    // Test sidebar exit button by re-locking first
    console.log('11. Re-locking for sidebar exit test...');
    await admin.from('chef_preferences').update({ locked_event_id: eventId }).eq('chef_id', chefId);
    await page.reload({ timeout: 120000, waitUntil: 'commit' });
    await page.waitForTimeout(5000);
    await dismissOverlays();

    // Look for XCircle exit button in sidebar
    const sidebarExit = page.locator('aside button[title*="exit" i], aside button[title*="Exit" i], aside button[aria-label*="exit" i]');
    const sidebarExitCount = await sidebarExit.count();
    console.log('12. Sidebar exit buttons:', sidebarExitCount);

    if (sidebarExitCount > 0) {
      await sidebarExit.first().click();
      await page.waitForTimeout(5000);
      const { data: afterSidebarUnlock } = await admin.from('chef_preferences')
        .select('locked_event_id')
        .eq('chef_id', chefId)
        .single();
      console.log('13. DB after sidebar exit:', afterSidebarUnlock?.locked_event_id);
      if (afterSidebarUnlock?.locked_event_id === null) {
        console.log('    ✅ SIDEBAR EXIT WORKS');
      } else {
        console.log('    ❌ SIDEBAR EXIT FAILED');
      }
    } else {
      console.log('    Looking for exit button by text...');
      const exitByText = page.locator('aside').getByRole('button', { name: /exit/i });
      console.log('    Exit buttons by text:', await exitByText.count());
    }
  } else {
    console.log('   ❌ LOCK-IN FAILED - DB not updated');
  }
} else {
  console.log('   ❌ No Lock In button found');
}

// Final: Test mobile viewport
console.log('\n--- MOBILE TEST ---');
await admin.from('chef_preferences').update({ locked_event_id: eventId }).eq('chef_id', chefId);
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3100/events/' + eventId, { timeout: 120000, waitUntil: 'commit' });
await page.waitForTimeout(5000);
await dismissOverlays();
await page.screenshot({ path: 'tmp-lockin-mobile.png', fullPage: false });
console.log('14. Mobile screenshot saved');

// Check mobile bottom tab bar
const tabBar = await page.locator('nav[role="navigation"], nav.fixed.bottom-0').last();
const tabText = await tabBar.textContent().catch(() => 'no tab bar');
console.log('15. Mobile tab bar:', tabText?.substring(0, 100));

// Clean up
await admin.from('chef_preferences').update({ locked_event_id: null }).eq('chef_id', chefId);
await browser.close();
console.log('\nDone!');
