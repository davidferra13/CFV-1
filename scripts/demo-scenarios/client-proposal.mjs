/**
 * Scenario: client-proposal
 * "Your clients get a white-glove experience. Automatically."
 *
 * Storyboard: docs/storyboard-04-what-your-client-sees.md
 * Duration: ~60 seconds
 * Auth: client account
 */

export default {
  title: 'What Your Client Sees',
  auth: 'client',

  async run(rec, page) {
    // ── SCENE 1: TITLE CARD (0-3s) ─────────────────────────
    await rec.titleCard(
      'Your clients get a white-glove experience.',
      'Automatically.',
      3000
    )

    // ── SCENE 2: THE PROPOSAL ARRIVES (3-15s) ──────────────
    // Navigate to client dashboard or proposals
    await rec.navigate('/client/dashboard')
    await rec.progress(5)

    await rec.caption('Your client opens this. Clean. Professional.')
    await rec.pause(2000)

    // Try to find and click into a proposal or event
    try {
      const proposalLink = page.locator('a[href*="/proposal"], a[href*="/event"], [class*="proposal"]').first()
      if (await proposalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('a[href*="/proposal"], a[href*="/event"]', { speed: 500 })
        await proposalLink.click()
        await rec.pause(2000)
      }
    } catch {}

    await rec.progress(12)

    // Scroll through proposal content
    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('Dietary needs highlighted. They feel cared for.')
    await rec.pause(2000)

    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('Clear pricing. No surprises. One button.')
    await rec.pause(2000)

    await rec.progress(25)

    // ── SCENE 3: CLIENT ACCEPTS AND PAYS (15-28s) ──────────
    // Look for accept/pay button
    try {
      await rec.hoverOn('button:has-text("Accept"), button:has-text("Pay"), button:has-text("Approve")', { speed: 500, waitAfter: 800 })
    } catch {}

    await rec.caption('One click to accept. Stripe handles the rest.')
    await rec.pause(2500)

    await rec.caption('Paid. Confirmed. No awkward money conversations.')
    await rec.pause(2500)

    await rec.progress(47)

    // ── SCENE 4: CLIENT DASHBOARD (28-38s) ─────────────────
    await rec.captionHide()
    await rec.sceneCut('/client/dashboard', { waitAfter: 500 })

    await rec.caption('Your client\'s own portal. Their events, history, rewards.')
    await rec.pause(2000)

    await rec.scrollBy(400, { waitAfter: 800 })
    await rec.progress(55)

    // Loyalty section
    await rec.caption('Loyalty tiers. Points. They come back for more.')
    await rec.pause(2500)

    await rec.progress(63)

    // ── SCENE 5: INVOICE WITH LOYALTY (38-48s) ─────────────
    await rec.captionHide()
    // Try to find invoice link
    try {
      const invoiceLink = page.locator('a[href*="/invoice"], a[href*="/billing"]').first()
      if (await invoiceLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('a[href*="/invoice"]', { speed: 500 })
        await invoiceLink.click()
        await rec.pause(2000)
      }
    } catch {
      await rec.scrollBy(400, { waitAfter: 800 })
    }

    await rec.caption('Invoices your clients actually want to open.')
    await rec.pause(2000)

    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('Every event earns loyalty points.')
    await rec.pause(2000)

    await rec.caption('Points become real discounts. They feel valued.')
    await rec.pause(2000)

    await rec.progress(80)

    // ── SCENE 6: CLIENT EVENT DETAIL (48-53s) ──────────────
    await rec.captionHide()
    await rec.caption('Your client sees their event. Every detail.')
    await rec.pause(2000)
    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('Guest allergies, preferences. All visible.')
    await rec.pause(2000)

    await rec.progress(90)

    // ── SCENE 7: CTA (53-60s) ──────────────────────────────
    await rec.captionHide()
    await rec.pause(500)
    await rec.progress(100)

    await rec.titleCard(
      'Look professional. Without the effort.',
      'Start free at cheflowhq.com',
      5000
    )
  },
}
