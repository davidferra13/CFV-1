/**
 * Scenario: tac-integration
 * "Take a Chef emails you 50 times a day. What if they all landed in one place?"
 *
 * Storyboard: docs/storyboard-01-take-a-chef-integration.md
 * Duration: ~60 seconds
 */

export default {
  title: 'Take a Chef Integration',
  auth: 'chef',

  async run(rec, page) {
    // ── SCENE 1: TITLE CARD (0-3s) ─────────────────────────
    await rec.titleCard(
      'Take a Chef emails you 50 times a day.',
      'What if they all landed in one place?',
      3000
    )

    // ── SCENE 2: SETUP PAGE (3-12s) ────────────────────────
    await rec.navigate('/settings/integrations')
    await rec.progress(5)
    await rec.caption('Connect your Gmail. That is the whole setup.')
    await rec.pause(1500)

    // Find and click Gmail connect or show connected state
    try {
      // Look for the Take a Chef setup component
      await rec.hoverOn('[class*="take-a-chef"], [class*="takeAChef"], [class*="gmail"], [class*="integration"]', { speed: 500, waitAfter: 800 })
    } catch {}

    await rec.progress(10)

    // Show the connected state
    try {
      await rec.caption('Done. ChefFlow handles the rest.')
      await rec.pause(2000)
    } catch {}

    await rec.progress(15)

    // Commission rate
    try {
      await rec.caption('Set your commission rate. It tracks automatically.')
      await rec.hoverOn('[class*="commission"], input[type="number"]', { speed: 500, waitAfter: 1500 })
    } catch {}

    await rec.progress(18)
    await rec.pause(500)

    // ── SCENE 3: THE MAGIC MOMENT (12-28s) ─────────────────
    await rec.captionHide()
    await rec.sceneCut('/inquiries', { waitAfter: 500 })
    await rec.progress(22)

    await rec.caption('Every Take a Chef email becomes an inquiry.')
    await rec.pause(1500)

    // Look for a TAC-sourced inquiry
    try {
      const tacBadge = page.locator('[class*="source"], [class*="badge"]').first()
      if (await tacBadge.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.hoverOn('[class*="source"], [class*="badge"]', { speed: 500, waitAfter: 600 })
      }
    } catch {}

    await rec.progress(28)

    // Show lead score
    await rec.caption('Scored instantly. No AI. Pure math.')
    await rec.pause(1500)

    try {
      // Click into an inquiry
      const inqRow = page.locator('table tbody tr, a[href*="/inquiries/"]').first()
      if (await inqRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('table tbody tr, a[href*="/inquiries/"]', { speed: 500 })
        await rec.pause(300)
        await inqRow.click()
        await rec.pause(2500)
      }
    } catch {}

    await rec.progress(35)

    // Inquiry detail
    await rec.caption('Every detail pulled from the email.')
    await rec.pause(1500)
    await rec.scrollBy(300, { waitAfter: 800 })

    await rec.caption('Name. Date. Budget. Allergies. All there.')
    await rec.pause(2000)

    await rec.progress(45)

    // ── SCENE 4: THE DASHBOARD PROOF (28-42s) ──────────────
    await rec.captionHide()
    await rec.sceneCut('/dashboard', { waitAfter: 500 })
    await rec.progress(50)

    await rec.caption('Your Take a Chef command center.')
    await rec.pause(1500)

    // Scroll to the TAC widget
    await rec.scrollBy(400, { waitAfter: 800 })
    await rec.scrollBy(400, { waitAfter: 800 })

    try {
      await rec.scrollTo('[data-widget="tac"], [class*="tac"], [class*="take-a-chef"]', { waitAfter: 800 })
    } catch {}

    await rec.progress(58)
    await rec.caption('New leads. Awaiting reply. Confirmed. One glance.')
    await rec.pause(2500)

    await rec.caption('Three clients waiting on you right now.')
    await rec.pause(2000)

    await rec.progress(65)
    await rec.caption('No more logging into their platform.')
    await rec.pause(2000)

    await rec.progress(70)

    // ── SCENE 5: THE FINANCIAL HOOK (42-50s) ────────────────
    // Navigate to an event detail Money tab
    await rec.captionHide()

    // Try to find an event to show financial details
    try {
      await rec.sceneCut('/events', { waitAfter: 500 })
      const evtLink = page.locator('a[href*="/events/"]').first()
      if (await evtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('a[href*="/events/"]', { speed: 500 })
        await evtLink.click()
        await rec.pause(2000)

        // Click Money tab
        try {
          await rec.clickOn('[role="tab"]:has-text("Money"), button:has-text("Money"), a:has-text("Money")', { speed: 500, waitAfter: 1500 })
        } catch {}
      }
    } catch {}

    await rec.progress(78)
    await rec.caption('Commission tracked on every booking.')
    await rec.pause(2000)
    await rec.scrollBy(300, { waitAfter: 800 })

    await rec.caption('Your real take-home. Not their number.')
    await rec.pause(2000)

    await rec.caption('No spreadsheet. No guessing.')
    await rec.pause(1500)

    await rec.progress(88)

    // ── SCENE 6: CTA (50-57s) ──────────────────────────────
    await rec.captionHide()
    await rec.pause(500)
    await rec.progress(100)

    await rec.titleCard(
      'Every lead. One place. Zero logins.',
      'Start free at cheflowhq.com',
      5000
    )
  },
}
