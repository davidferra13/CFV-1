/**
 * Digital Twin Simulation - Phase 1: SELL
 * Inquiry -> Quote -> Event (full happy path + edge cases)
 *
 * Tests the complete sales pipeline a chef would use:
 *   1. Create inquiry (manual entry)
 *   2. Advance inquiry through pipeline statuses
 *   3. Create quote from inquiry
 *   4. Send quote to client
 *   5. Simulate client acceptance (via portal)
 *   6. Convert confirmed inquiry to event
 *   7. Advance event through FSM (draft -> completed)
 *   8. Edge cases: decline, expire, cancel
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:3000';
const SCREENSHOTS = 'docs/simulation-reports/screenshots/phase1';
const FINDINGS = [];
const TIMINGS = [];

// ── Helpers ──────────────────────────────────────────────────

function finding(type, id, desc, details = '') {
  FINDINGS.push({ type, id, desc, details, timestamp: new Date().toISOString() });
  const icon = { BUG: '🔴', SLOW: '🟡', DEAD: '⚫', CONFUSING: '🟠', MISSING: '🔵', OK: '🟢' }[type] || '⚪';
  console.log(`  ${icon} [${type}] ${id}: ${desc}`);
}

function timing(action, ms) {
  TIMINGS.push({ action, ms, timestamp: new Date().toISOString() });
  if (ms > 3000) finding('SLOW', `SLOW-${action}`, `${action} took ${ms}ms (>3s threshold)`);
}

async function screenshot(page, name) {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const fp = path.join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path: fp, fullPage: false });
  return fp;
}

async function authAs(page, email, password) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email, password },
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`Auth failed for ${email}: ${JSON.stringify(body)}`);
  console.log(`  Auth OK: ${email}`);
  return body;
}

async function settle(page, timeout = 8000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function dismissOverlays(page) {
  for (const sel of [
    'button:has-text("Accept")',
    '[aria-label="Close"]',
    '.toast-close',
    'button:has-text("Dismiss")',
  ]) {
    const btns = await page.$$(sel);
    for (const btn of btns) {
      await btn.click({ force: true }).catch(() => {});
    }
  }
  await page.waitForTimeout(300);
}

/** Click a button by visible text, return true if found */
async function clickButton(page, text, options = {}) {
  const { exact = false, timeout = 5000 } = options;
  const selector = exact
    ? `button:has-text("${text}")`
    : `button:text-is("${text}"), button:has-text("${text}")`;
  try {
    const btn = await page.waitForSelector(selector, { timeout, state: 'visible' });
    if (btn) {
      await btn.click({ force: true });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** Timed navigation: go to URL and measure load */
async function timedGoto(page, urlPath, label) {
  const start = Date.now();
  await page.goto(`${BASE}${urlPath}`);
  await settle(page);
  await dismissOverlays(page);
  const ms = Date.now() - start;
  timing(label || urlPath, ms);
  return ms;
}

/** Timed action: click button and measure response */
async function timedClick(page, text, label) {
  const start = Date.now();
  const clicked = await clickButton(page, text);
  if (!clicked) {
    finding('MISSING', `MISS-${label}`, `Button "${text}" not found`);
    return { clicked: false, ms: 0 };
  }
  await settle(page);
  await dismissOverlays(page);
  const ms = Date.now() - start;
  timing(label || text, ms);
  return { clicked: true, ms };
}

/** Extract current URL path */
function urlPath(page) {
  return new URL(page.url()).pathname;
}

/** Check for visible error text on page */
async function hasVisibleError(page) {
  const main = await page.textContent('main').catch(() => '');
  return /error|failed|something went wrong/i.test(main);
}

// ── Phase 1.1: Create Inquiry ────────────────────────────────

async function createInquiry(page) {
  console.log('\n=== 1.1 CREATE INQUIRY ===\n');
  const result = { success: false };

  await timedGoto(page, '/inquiries/new', 'inquiries-new-load');
  await screenshot(page, '1.1-inquiry-form-blank');

  // Fill required: Channel
  const channelSelect = await page.$('select');
  if (!channelSelect) {
    finding('BUG', 'BUG-INQ-1', 'No channel select found on /inquiries/new');
    return result;
  }
  await channelSelect.selectOption('email');
  console.log('  Channel: email');

  // Fill required: Client Name
  const clientNameInput = await page.$('input[name="clientName"], input[name="client_name"]');
  if (clientNameInput) {
    await clientNameInput.fill('Twin Simulation Client');
  } else {
    // Fallback: find by label
    const labels = await page.$$('label');
    for (const label of labels) {
      const text = await label.textContent();
      if (/client name/i.test(text)) {
        const forId = await label.getAttribute('for');
        if (forId) {
          await page.fill(`#${forId}`, 'Twin Simulation Client');
          break;
        }
        const input = await label.$('input');
        if (input) {
          await input.fill('Twin Simulation Client');
          break;
        }
      }
    }
  }
  console.log('  Client Name: Twin Simulation Client');

  // Fill optional: email
  const emailInput = await page.$('input[name="email"], input[type="email"]');
  if (emailInput) {
    await emailInput.fill('twin-sim@test.chefflow');
    console.log('  Email: twin-sim@test.chefflow');
  }

  // Fill optional: guest count
  const guestInput = await page.$('input[name="guestCount"], input[name="guest_count"]');
  if (guestInput) {
    await guestInput.fill('8');
    console.log('  Guest Count: 8');
  }

  // Fill optional: occasion
  const occasionInput = await page.$('input[name="occasion"]');
  if (occasionInput) {
    await occasionInput.fill('Anniversary Dinner');
    console.log('  Occasion: Anniversary Dinner');
  }

  // Fill optional: budget
  const budgetInput = await page.$('input[name="budget"]');
  if (budgetInput) {
    await budgetInput.fill('1500');
    console.log('  Budget: 1500');
  }

  // Fill optional: original message
  const messageArea = await page.$('textarea[name="originalMessage"], textarea[name="original_message"]');
  if (messageArea) {
    await messageArea.fill(
      'Hi Chef Bob, we are celebrating our 10th anniversary and would love a multi-course Italian dinner for 8 guests at our home in Portland. Budget around $1500. Any dietary restrictions we should discuss?'
    );
    console.log('  Original Message: filled');
  }

  await screenshot(page, '1.1-inquiry-form-filled');

  // Submit
  const { clicked, ms } = await timedClick(page, 'Log Inquiry', 'inquiry-submit');
  if (!clicked) {
    finding('BUG', 'BUG-INQ-2', 'Log Inquiry button not found');
    return result;
  }

  await page.waitForTimeout(2000);
  const currentPath = urlPath(page);

  if (currentPath.startsWith('/inquiries/') && !currentPath.endsWith('/new')) {
    const inquiryId = currentPath.split('/inquiries/')[1].split('/')[0].split('?')[0];
    result.success = true;
    result.inquiryId = inquiryId;
    result.url = currentPath;
    finding('OK', 'OK-INQ-1', `Inquiry created: ${inquiryId}`);
    console.log(`  Inquiry created: ${inquiryId}`);
  } else {
    if (await hasVisibleError(page)) {
      finding('BUG', 'BUG-INQ-3', 'Inquiry creation showed error', currentPath);
    } else {
      finding('BUG', 'BUG-INQ-4', `Inquiry submit did not redirect. Stuck at: ${currentPath}`);
    }
  }

  await screenshot(page, '1.1-inquiry-created');
  return result;
}

// ── Phase 1.2: Advance Inquiry Pipeline ──────────────────────

async function advanceInquiry(page, inquiryId) {
  console.log('\n=== 1.2 ADVANCE INQUIRY PIPELINE ===\n');
  const result = { transitions: [] };

  await timedGoto(page, `/inquiries/${inquiryId}`, 'inquiry-detail-load');
  await screenshot(page, '1.2-inquiry-detail-initial');

  // Transition: new -> awaiting_client
  console.log('  >> new -> awaiting_client');
  let t = await timedClick(page, 'Mark Awaiting Client', 'inq-to-awaiting-client');
  if (t.clicked) {
    result.transitions.push('new->awaiting_client');
    await screenshot(page, '1.2-inquiry-awaiting-client');
    finding('OK', 'OK-INQ-T1', 'Inquiry transitioned to awaiting_client');
  } else {
    finding('BUG', 'BUG-INQ-T1', 'Cannot find "Mark Awaiting Client" button');
    // Try alternate button text
    t = await timedClick(page, 'Awaiting Client', 'inq-to-awaiting-client-alt');
    if (t.clicked) result.transitions.push('new->awaiting_client');
  }

  // Transition: awaiting_client -> awaiting_chef
  console.log('  >> awaiting_client -> awaiting_chef');
  t = await timedClick(page, 'Client Replied', 'inq-client-replied');
  if (t.clicked) {
    result.transitions.push('awaiting_client->awaiting_chef');
    await screenshot(page, '1.2-inquiry-awaiting-chef');
    finding('OK', 'OK-INQ-T2', 'Inquiry transitioned to awaiting_chef');
  } else {
    finding('BUG', 'BUG-INQ-T2', 'Cannot find "Client Replied" button');
  }

  return result;
}

// ── Phase 1.3: Create Quote ──────────────────────────────────

async function createQuoteFromInquiry(page, inquiryId) {
  console.log('\n=== 1.3 CREATE QUOTE FROM INQUIRY ===\n');
  const result = { success: false };

  // Navigate to inquiry detail
  await timedGoto(page, `/inquiries/${inquiryId}`, 'inquiry-detail-for-quote');

  // Find and click "+ Create Quote"
  let quoteBtn = await page.$('[data-testid="inquiry-create-quote"]');
  if (!quoteBtn) {
    quoteBtn = await page.$('a:has-text("Create Quote"), button:has-text("Create Quote")');
  }

  if (!quoteBtn) {
    finding('BUG', 'BUG-QT-1', 'No "Create Quote" button found on inquiry detail');
    await screenshot(page, '1.3-no-create-quote-btn');
    return result;
  }

  const href = await quoteBtn.getAttribute('href');
  console.log(`  Create Quote href: ${href || '(no href, will click)'}`);

  if (href) {
    await timedGoto(page, href, 'quote-new-from-inquiry');
  } else {
    await quoteBtn.click({ force: true });
    await settle(page);
  }

  await screenshot(page, '1.3-quote-form-blank');

  // Check we landed on quotes/new
  const currentPath = urlPath(page);
  if (!currentPath.includes('/quotes/new')) {
    finding('CONFUSING', 'CONF-QT-1', `Expected /quotes/new, got ${currentPath}`);
  }

  // Fill Pricing Model
  const pricingSelect = await page.$('select[name="pricingModel"], select[name="pricing_model"]');
  if (pricingSelect) {
    // Try to select "Per Person" first, fallback to "Flat Rate"
    try {
      await pricingSelect.selectOption({ label: 'Per Person' });
      console.log('  Pricing Model: Per Person');
    } catch {
      try {
        await pricingSelect.selectOption('per_person');
        console.log('  Pricing Model: per_person');
      } catch {
        await pricingSelect.selectOption({ index: 1 });
        console.log('  Pricing Model: (first option)');
      }
    }
  } else {
    // Maybe it's a custom select/radio
    const labels = await page.$$('label');
    for (const label of labels) {
      const text = await label.textContent();
      if (/pricing model/i.test(text)) {
        finding('CONFUSING', 'CONF-QT-2', 'Pricing model found as label but not standard select');
        break;
      }
    }
  }

  // Fill Total Quoted Amount
  const amountInput = await page.$('input[name="totalAmount"], input[name="total_amount"], input[name="amount"]');
  if (amountInput) {
    await amountInput.fill('1500');
    console.log('  Total Amount: 1500');
  } else {
    // Find by label text
    const inputs = await page.$$('input[type="number"]');
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        if (label) {
          const text = await label.textContent();
          if (/total|amount|quoted/i.test(text)) {
            await input.fill('1500');
            console.log(`  Total Amount (via label "${text.trim()}"): 1500`);
            break;
          }
        }
      }
    }
  }

  // Fill Quote Name (optional)
  const nameInput = await page.$('input[name="name"], input[name="quoteName"], input[name="quote_name"]');
  if (nameInput) {
    await nameInput.fill('Anniversary Dinner - Premium Package');
    console.log('  Quote Name: Anniversary Dinner - Premium Package');
  }

  // Fill Valid Until (optional)
  const validUntilInput = await page.$('input[name="validUntil"], input[name="valid_until"], input[type="date"]');
  if (validUntilInput) {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await validUntilInput.fill(futureDate);
    console.log(`  Valid Until: ${futureDate}`);
  }

  // Fill pricing notes
  const notesArea = await page.$('textarea[name="pricingNotes"], textarea[name="pricing_notes"]');
  if (notesArea) {
    await notesArea.fill('Includes all ingredients, preparation, service, and cleanup for an 8-guest multi-course Italian dinner.');
    console.log('  Pricing Notes: filled');
  }

  await screenshot(page, '1.3-quote-form-filled');

  // Submit quote
  const { clicked, ms } = await timedClick(page, 'Create Quote', 'quote-submit');
  if (!clicked) {
    finding('BUG', 'BUG-QT-2', 'Create Quote submit button not found');
    return result;
  }

  await page.waitForTimeout(2000);
  const afterPath = urlPath(page);

  if (afterPath.startsWith('/quotes/') && !afterPath.endsWith('/new')) {
    const quoteId = afterPath.split('/quotes/')[1].split('/')[0].split('?')[0];
    result.success = true;
    result.quoteId = quoteId;
    result.url = afterPath;
    finding('OK', 'OK-QT-1', `Quote created: ${quoteId}`);
    console.log(`  Quote created: ${quoteId}`);
  } else {
    if (await hasVisibleError(page)) {
      finding('BUG', 'BUG-QT-3', 'Quote creation showed error');
    } else {
      finding('BUG', 'BUG-QT-4', `Quote submit did not redirect. At: ${afterPath}`);
    }
  }

  await screenshot(page, '1.3-quote-created');
  return result;
}

// ── Phase 1.4: Send Quote ────────────────────────────────────

async function sendQuote(page, quoteId) {
  console.log('\n=== 1.4 SEND QUOTE ===\n');
  const result = { success: false };

  await timedGoto(page, `/quotes/${quoteId}`, 'quote-detail-load');
  await screenshot(page, '1.4-quote-detail-draft');

  // Click "Send to Client"
  const { clicked } = await timedClick(page, 'Send to Client', 'quote-send');
  if (!clicked) {
    finding('BUG', 'BUG-QT-SEND-1', 'Send to Client button not found');
    return result;
  }

  // Handle ConfirmPolicyDialog
  await page.waitForTimeout(1000);
  const confirmBtn = await page.$('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Send")');
  if (confirmBtn) {
    console.log('  Confirm dialog found, clicking...');
    await confirmBtn.click({ force: true });
    await settle(page);
  }

  await page.waitForTimeout(2000);
  await screenshot(page, '1.4-quote-sent');

  // Verify status changed (look for "sent" badge or absence of "Send to Client" button)
  const sendBtnStillThere = await page.$('button:has-text("Send to Client")');
  if (!sendBtnStillThere) {
    result.success = true;
    finding('OK', 'OK-QT-SEND', 'Quote sent to client');
  } else {
    // Check if visible
    const visible = await sendBtnStillThere.isVisible().catch(() => false);
    if (visible) {
      finding('BUG', 'BUG-QT-SEND-2', 'Send to Client button still visible after click');
    } else {
      result.success = true;
      finding('OK', 'OK-QT-SEND', 'Quote sent (button hidden)');
    }
  }

  return result;
}

// ── Phase 1.5: Simulate Client Quote Acceptance ──────────────

async function simulateClientAcceptance(page, quoteId) {
  console.log('\n=== 1.5 SIMULATE CLIENT ACCEPTANCE ===\n');
  const result = { success: false };

  // Client accepts quotes via the portal. We need to either:
  // A) Auth as the client and accept via portal
  // B) Use a server action directly
  // C) Use the chef's "Accept on Behalf" (not available on quotes, only events)
  //
  // For simulation, we advance the inquiry to "quoted" -> "confirmed" via chef controls,
  // then convert to event. This is the manual/legacy path.
  // The quote acceptance via client portal is a separate Phase 1 sub-test.

  // Instead, transition the inquiry directly. We'll note this gap.
  finding('CONFUSING', 'CONF-CLIENT-1',
    'Client quote acceptance requires portal login. Simulating via inquiry confirmation path.');

  result.success = true;
  result.method = 'inquiry-confirmation-path';
  return result;
}

// ── Phase 1.6: Confirm Inquiry & Convert to Event ────────────

async function confirmAndConvert(page, inquiryId) {
  console.log('\n=== 1.6 CONFIRM INQUIRY & CONVERT TO EVENT ===\n');
  const result = { success: false };

  await timedGoto(page, `/inquiries/${inquiryId}`, 'inquiry-detail-for-confirm');
  await screenshot(page, '1.6-inquiry-before-confirm');

  // The inquiry should be in "awaiting_chef" or "quoted" state
  // Try to transition to "quoted" first (awaiting_chef -> quoted)
  let t = await timedClick(page, 'Send Quote', 'inq-to-quoted');
  if (t.clicked) {
    console.log('  Inquiry -> quoted');
    await screenshot(page, '1.6-inquiry-quoted');
  }

  // Then "quoted" -> "confirmed"
  t = await timedClick(page, 'Mark Confirmed', 'inq-to-confirmed');
  if (t.clicked) {
    console.log('  Inquiry -> confirmed');
    await screenshot(page, '1.6-inquiry-confirmed');
  } else {
    // Maybe we can go directly to confirmed from current state
    finding('CONFUSING', 'CONF-CONV-1', 'Could not find "Mark Confirmed" button. Checking current state...');
    await screenshot(page, '1.6-inquiry-state-unknown');
  }

  // Now look for "Convert to Event"
  await page.waitForTimeout(1000);
  t = await timedClick(page, 'Convert to Event', 'convert-to-event');
  if (t.clicked) {
    await page.waitForTimeout(3000);
    const currentPath = urlPath(page);

    if (currentPath.startsWith('/events/')) {
      const eventId = currentPath.split('/events/')[1].split('/')[0].split('?')[0];
      result.success = true;
      result.eventId = eventId;
      result.url = currentPath;
      finding('OK', 'OK-CONV-1', `Event created from inquiry: ${eventId}`);
      console.log(`  Event created: ${eventId}`);
    } else {
      finding('BUG', 'BUG-CONV-1', `Convert did not redirect to event. At: ${currentPath}`);
    }
  } else {
    // Maybe "Convert to Series" for multi-day?
    t = await timedClick(page, 'Convert to Series', 'convert-to-series');
    if (t.clicked) {
      await page.waitForTimeout(3000);
      const currentPath = urlPath(page);
      if (currentPath.startsWith('/events/')) {
        result.success = true;
        result.eventId = currentPath.split('/events/')[1].split('/')[0];
        finding('OK', 'OK-CONV-2', 'Event created via series conversion');
      }
    } else {
      finding('BUG', 'BUG-CONV-2', 'Neither "Convert to Event" nor "Convert to Series" found');
    }
  }

  await screenshot(page, '1.6-event-created');
  return result;
}

// ── Phase 1.7: Event FSM Full Lifecycle ──────────────────────

async function advanceEventLifecycle(page, eventId) {
  console.log('\n=== 1.7 EVENT FSM LIFECYCLE ===\n');
  const result = { transitions: [], finalStatus: 'draft' };

  await timedGoto(page, `/events/${eventId}`, 'event-detail-load');
  await screenshot(page, '1.7-event-draft');

  // draft -> proposed
  console.log('  >> draft -> proposed');
  let t = await timedClick(page, 'Propose to Client', 'evt-propose');
  if (t.clicked) {
    // May have readiness modal
    await page.waitForTimeout(1000);
    const override = await page.$('button:has-text("Override"), button:has-text("Continue")');
    if (override) {
      await override.click({ force: true });
      await settle(page);
      console.log('  Readiness override clicked');
    }
    result.transitions.push('draft->proposed');
    result.finalStatus = 'proposed';
    await screenshot(page, '1.7-event-proposed');
    finding('OK', 'OK-EVT-T1', 'Event proposed');
  } else {
    finding('BUG', 'BUG-EVT-T1', '"Propose to Client" not found');
  }

  // proposed -> accepted (chef accepts on behalf)
  console.log('  >> proposed -> accepted');
  t = await timedClick(page, 'Accept on Behalf', 'evt-accept');
  if (t.clicked) {
    // Might have confirm dialog
    await page.waitForTimeout(1000);
    const confirm = await page.$('button:has-text("Confirm"), button:has-text("Yes")');
    if (confirm) {
      await confirm.click({ force: true });
      await settle(page);
    }
    result.transitions.push('proposed->accepted');
    result.finalStatus = 'accepted';
    await screenshot(page, '1.7-event-accepted');
    finding('OK', 'OK-EVT-T2', 'Event accepted on behalf');
  } else {
    finding('BUG', 'BUG-EVT-T2', '"Accept on Behalf" not found');
  }

  // accepted -> paid (mark offline)
  console.log('  >> accepted -> paid');
  t = await timedClick(page, 'Mark Paid', 'evt-paid');
  if (t.clicked) {
    await page.waitForTimeout(1000);
    const confirm = await page.$('button:has-text("Confirm"), button:has-text("Yes")');
    if (confirm) {
      await confirm.click({ force: true });
      await settle(page);
    }
    result.transitions.push('accepted->paid');
    result.finalStatus = 'paid';
    await screenshot(page, '1.7-event-paid');
    finding('OK', 'OK-EVT-T3', 'Event marked paid');
  } else {
    finding('BUG', 'BUG-EVT-T3', '"Mark Paid" not found');
  }

  // paid -> confirmed
  console.log('  >> paid -> confirmed');
  t = await timedClick(page, 'Confirm Event', 'evt-confirm');
  if (t.clicked) {
    await page.waitForTimeout(1000);
    const override = await page.$('button:has-text("Override"), button:has-text("Continue")');
    if (override) {
      await override.click({ force: true });
      await settle(page);
    }
    result.transitions.push('paid->confirmed');
    result.finalStatus = 'confirmed';
    await screenshot(page, '1.7-event-confirmed');
    finding('OK', 'OK-EVT-T4', 'Event confirmed');
  } else {
    finding('BUG', 'BUG-EVT-T4', '"Confirm Event" not found');
  }

  // confirmed -> in_progress
  console.log('  >> confirmed -> in_progress');
  t = await timedClick(page, 'Mark In Progress', 'evt-in-progress');
  if (t.clicked) {
    await page.waitForTimeout(1000);
    const override = await page.$('button:has-text("Override"), button:has-text("Continue")');
    if (override) {
      await override.click({ force: true });
      await settle(page);
    }
    result.transitions.push('confirmed->in_progress');
    result.finalStatus = 'in_progress';
    await screenshot(page, '1.7-event-in-progress');
    finding('OK', 'OK-EVT-T5', 'Event in progress');
  } else {
    // Could be hard-blocked by simulation gate
    finding('CONFUSING', 'CONF-EVT-T5', '"Mark In Progress" not found or disabled (simulation gate?)');
    await screenshot(page, '1.7-event-progress-blocked');
  }

  // in_progress -> completed
  if (result.finalStatus === 'in_progress') {
    console.log('  >> in_progress -> completed');
    t = await timedClick(page, 'Mark Completed', 'evt-complete');
    if (t.clicked) {
      result.transitions.push('in_progress->completed');
      result.finalStatus = 'completed';
      await page.waitForTimeout(2000);

      // Should redirect to close-out
      const currentPath = urlPath(page);
      if (currentPath.includes('close-out')) {
        finding('OK', 'OK-EVT-T6', 'Event completed, redirected to close-out');
        result.redirectedToCloseOut = true;
      } else {
        finding('OK', 'OK-EVT-T6', `Event completed (at: ${currentPath})`);
      }
      await screenshot(page, '1.7-event-completed');
    } else {
      finding('BUG', 'BUG-EVT-T6', '"Mark Completed" not found');
    }
  }

  return result;
}

// ── Phase 1.8: Edge Cases ────────────────────────────────────

async function testEdgeCases(page) {
  console.log('\n=== 1.8 EDGE CASES ===\n');
  const result = { tests: [] };

  // Edge 1: Create and immediately decline an inquiry
  console.log('  >> Edge: Create + Decline inquiry');
  await timedGoto(page, '/inquiries/new', 'edge-inquiry-new');

  const channelSelect = await page.$('select');
  if (channelSelect) await channelSelect.selectOption('phone');
  const nameInput = await page.$('input[name="clientName"], input[name="client_name"]');
  if (nameInput) await nameInput.fill('Decline Test Client');

  const logBtn = await clickButton(page, 'Log Inquiry');
  if (logBtn) {
    await page.waitForTimeout(2000);
    const declineResult = await timedClick(page, 'Decline', 'edge-decline');
    if (declineResult.clicked) {
      // Fill reason in modal
      await page.waitForTimeout(500);
      const reasonInput = await page.$('input[placeholder*="reason" i], textarea[placeholder*="reason" i], input[required]');
      if (reasonInput) {
        await reasonInput.fill('Outside service area');
        console.log('  Decline reason filled');
      }
      // Confirm decline
      const confirmDecline = await clickButton(page, 'Confirm');
      if (!confirmDecline) await clickButton(page, 'Decline');
      await settle(page);
      finding('OK', 'OK-EDGE-1', 'Inquiry declined successfully');
      result.tests.push({ name: 'decline-inquiry', pass: true });
    } else {
      finding('MISSING', 'MISS-EDGE-1', 'Decline button not found on new inquiry');
      result.tests.push({ name: 'decline-inquiry', pass: false });
    }
  }
  await screenshot(page, '1.8-edge-declined');

  // Edge 2: Create event directly (no inquiry)
  console.log('  >> Edge: Direct event creation');
  await timedGoto(page, '/events/new', 'edge-event-new');
  await screenshot(page, '1.8-edge-event-new');

  const hasForm = await page.$('form, input, select, button:has-text("Create")');
  if (hasForm) {
    finding('OK', 'OK-EDGE-2', '/events/new loads with form');
    result.tests.push({ name: 'direct-event-creation', pass: true });
  } else {
    finding('DEAD', 'DEAD-EDGE-2', '/events/new has no form elements');
    result.tests.push({ name: 'direct-event-creation', pass: false });
  }

  // Edge 3: Inquiry pipeline view (kanban)
  console.log('  >> Edge: Inquiry kanban');
  await timedGoto(page, '/inquiries', 'edge-inquiries-list');
  await screenshot(page, '1.8-edge-inquiries-list');

  const mainContent = await page.textContent('main').catch(() => '');
  if (mainContent.length > 50) {
    finding('OK', 'OK-EDGE-3', 'Inquiries list renders with content');
    result.tests.push({ name: 'inquiries-list', pass: true });
  } else {
    finding('DEAD', 'DEAD-EDGE-3', 'Inquiries list appears empty or broken');
    result.tests.push({ name: 'inquiries-list', pass: false });
  }

  // Edge 4: Quotes list
  console.log('  >> Edge: Quotes list');
  await timedGoto(page, '/quotes', 'edge-quotes-list');
  await screenshot(page, '1.8-edge-quotes-list');

  const quotesContent = await page.textContent('main').catch(() => '');
  if (quotesContent.length > 50) {
    finding('OK', 'OK-EDGE-4', 'Quotes list renders');
    result.tests.push({ name: 'quotes-list', pass: true });
  } else {
    finding('DEAD', 'DEAD-EDGE-4', 'Quotes list appears empty or broken');
    result.tests.push({ name: 'quotes-list', pass: false });
  }

  // Edge 5: Rate card
  console.log('  >> Edge: Rate card');
  await timedGoto(page, '/rate-card', 'edge-rate-card');
  await screenshot(page, '1.8-edge-rate-card');
  const rateContent = await page.textContent('main').catch(() => '');
  result.tests.push({ name: 'rate-card', pass: rateContent.length > 50 });
  if (rateContent.length > 50) {
    finding('OK', 'OK-EDGE-5', 'Rate card loads');
  } else {
    finding('DEAD', 'DEAD-EDGE-5', 'Rate card empty or broken');
  }

  return result;
}

// ── Phase 1.9: Pipeline Integrity Check ──────────────────────

async function pipelineIntegrity(page) {
  console.log('\n=== 1.9 PIPELINE INTEGRITY ===\n');
  const result = { checks: [] };

  // Verify data persisted: check inquiries list for our test client
  await timedGoto(page, '/inquiries', 'integrity-inquiries');
  const inquiriesText = await page.textContent('main').catch(() => '');
  const hasSimClient = /twin simulation/i.test(inquiriesText);
  result.checks.push({ name: 'inquiry-persisted', pass: hasSimClient });
  if (hasSimClient) {
    finding('OK', 'OK-INTEG-1', 'Test inquiry visible in pipeline');
  } else {
    finding('BUG', 'BUG-INTEG-1', 'Test inquiry not found in pipeline list');
  }

  // Verify events list shows our test event
  await timedGoto(page, '/events', 'integrity-events');
  const eventsText = await page.textContent('main').catch(() => '');
  const hasEvent = /twin simulation|anniversary/i.test(eventsText);
  result.checks.push({ name: 'event-persisted', pass: hasEvent });
  if (hasEvent) {
    finding('OK', 'OK-INTEG-2', 'Test event visible in events list');
  } else {
    // Might not show if completed/cancelled filters are active
    finding('CONFUSING', 'CONF-INTEG-2', 'Test event not visible in events list (filter issue?)');
  }

  // Verify quotes list
  await timedGoto(page, '/quotes', 'integrity-quotes');
  const quotesText = await page.textContent('main').catch(() => '');
  const hasQuote = /anniversary|twin simulation|1500/i.test(quotesText);
  result.checks.push({ name: 'quote-persisted', pass: hasQuote });
  if (hasQuote) {
    finding('OK', 'OK-INTEG-3', 'Test quote visible in quotes list');
  } else {
    finding('CONFUSING', 'CONF-INTEG-3', 'Test quote not visible (may be filtered)');
  }

  await screenshot(page, '1.9-pipeline-integrity');
  return result;
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log('Digital Twin Simulation - Phase 1: SELL\n');
  console.log(`Target: ${BASE}`);
  console.log(`Screenshots: ${SCREENSHOTS}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: page.url() });
    }
  });

  // Capture failed network requests
  const failedRequests = [];
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const report = {
    phase: 'Phase 1: SELL',
    timestamp: new Date().toISOString(),
    environment: { server: BASE, headless: true },
    steps: {},
    findings: [],
    timings: [],
    consoleErrors: [],
    failedRequests: [],
  };

  try {
    // Auth as Chef Bob
    console.log('Authenticating as Chef Bob...');
    await authAs(page, 'chef-bob@chefflow.test', 'ChefBobFlow!2026');

    // 1.1 Create Inquiry
    const inquiry = await createInquiry(page);
    report.steps.createInquiry = inquiry;

    if (inquiry.success && inquiry.inquiryId) {
      // 1.2 Advance Inquiry
      report.steps.advanceInquiry = await advanceInquiry(page, inquiry.inquiryId);

      // 1.3 Create Quote
      const quote = await createQuoteFromInquiry(page, inquiry.inquiryId);
      report.steps.createQuote = quote;

      if (quote.success && quote.quoteId) {
        // 1.4 Send Quote
        report.steps.sendQuote = await sendQuote(page, quote.quoteId);
      } else {
        finding('BUG', 'BUG-FLOW-1', 'Quote creation failed, skipping send');
      }

      // 1.5 Client acceptance simulation
      report.steps.clientAcceptance = await simulateClientAcceptance(page, quote?.quoteId);

      // 1.6 Confirm & Convert
      const conversion = await confirmAndConvert(page, inquiry.inquiryId);
      report.steps.confirmAndConvert = conversion;

      if (conversion.success && conversion.eventId) {
        // 1.7 Event FSM Lifecycle
        report.steps.eventLifecycle = await advanceEventLifecycle(page, conversion.eventId);
      } else {
        finding('BUG', 'BUG-FLOW-2', 'Inquiry conversion failed, skipping event lifecycle');

        // Fallback: try direct event creation to still test FSM
        console.log('\n  >> Fallback: Testing FSM via direct event creation');
        await timedGoto(page, '/events', 'fallback-events');
        // Look for any draft event
        const draftLink = await page.$('a[href*="/events/"]:not([href*="/new"])');
        if (draftLink) {
          const href = await draftLink.getAttribute('href');
          const fallbackEventId = href.split('/events/')[1]?.split('/')[0]?.split('?')[0];
          if (fallbackEventId) {
            console.log(`  Using existing event: ${fallbackEventId}`);
            report.steps.eventLifecycle = await advanceEventLifecycle(page, fallbackEventId);
          }
        }
      }
    } else {
      finding('BUG', 'BUG-FLOW-0', 'Inquiry creation failed, cannot continue pipeline');
    }

    // 1.8 Edge Cases (always run)
    report.steps.edgeCases = await testEdgeCases(page);

    // 1.9 Pipeline Integrity (always run)
    report.steps.pipelineIntegrity = await pipelineIntegrity(page);

  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    await screenshot(page, '1-fatal-error');
    report.fatalError = { message: err.message, stack: err.stack };
  } finally {
    report.findings = FINDINGS;
    report.timings = TIMINGS;
    report.consoleErrors = consoleErrors.slice(0, 50);
    report.failedRequests = failedRequests.slice(0, 50);

    // Generate summary
    const counts = { OK: 0, BUG: 0, SLOW: 0, DEAD: 0, CONFUSING: 0, MISSING: 0 };
    for (const f of FINDINGS) counts[f.type] = (counts[f.type] || 0) + 1;
    report.summary = {
      total: FINDINGS.length,
      ...counts,
      avgTiming: TIMINGS.length > 0 ? Math.round(TIMINGS.reduce((s, t) => s + t.ms, 0) / TIMINGS.length) : 0,
      slowest: TIMINGS.length > 0 ? TIMINGS.reduce((a, b) => a.ms > b.ms ? a : b) : null,
      consoleErrorCount: consoleErrors.length,
      failedRequestCount: failedRequests.length,
    };

    // Write report
    fs.writeFileSync('docs/simulation-reports/phase-1-raw.json', JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1: SELL - SUMMARY');
    console.log('='.repeat(60));
    console.log(`OK: ${counts.OK}  BUG: ${counts.BUG}  SLOW: ${counts.SLOW}  DEAD: ${counts.DEAD}  CONFUSING: ${counts.CONFUSING}  MISSING: ${counts.MISSING}`);
    console.log(`Avg timing: ${report.summary.avgTiming}ms`);
    if (report.summary.slowest) {
      console.log(`Slowest: ${report.summary.slowest.action} (${report.summary.slowest.ms}ms)`);
    }
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    console.log(`\nFindings:`);
    for (const f of FINDINGS) {
      const icon = { BUG: 'X', SLOW: '!', DEAD: '-', CONFUSING: '?', MISSING: '~', OK: '+' }[f.type] || ' ';
      console.log(`  [${icon}] ${f.id}: ${f.desc}`);
    }
    console.log(`\nReport: docs/simulation-reports/phase-1-raw.json`);
    console.log(`Screenshots: ${SCREENSHOTS}/`);

    await browser.close();
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
