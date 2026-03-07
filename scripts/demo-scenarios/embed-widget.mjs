/**
 * Scenario: embed-widget
 * "Add one line of code. Never miss a lead again."
 *
 * Storyboard: docs/storyboard-05-embeddable-widget.md
 * Duration: ~45 seconds
 */

export default {
  title: 'The Embeddable Widget',
  auth: 'chef',

  async run(rec, page) {
    // ── SCENE 1: TITLE CARD (0-3s) ─────────────────────────
    await rec.titleCard(
      'Add one line of code. Never miss a lead.',
      'The ChefFlow Embed Widget',
      3000
    )

    // ── SCENE 2: SETTINGS PAGE (3-12s) ─────────────────────
    await rec.navigate('/settings/embed')
    await rec.progress(8)

    await rec.caption('Your embed code. One script tag.')
    await rec.pause(2000)

    // Find the code snippet area
    try {
      await rec.hoverOn('code, pre, [class*="snippet"], [class*="code"], textarea', { speed: 500, waitAfter: 800 })
    } catch {}

    await rec.progress(15)

    // Copy button
    try {
      await rec.caption('Copy. Paste on your website. Done.')
      await rec.clickOn('button:has-text("Copy"), button[class*="copy"]', { speed: 400, waitAfter: 1000 })
    } catch {
      await rec.pause(2000)
    }

    await rec.progress(25)

    // ── SCENE 3: WIDGET ON A WEBSITE (12-22s) ──────────────
    // Navigate to the embed preview or a demo page
    await rec.captionHide()
    await rec.pause(500)

    // Try the embed inquiry page directly
    try {
      // Find the chef ID from the page or use a known path
      await rec.sceneCut('/embed/inquiry/preview', { waitAfter: 500 })
    } catch {
      // Fallback: just stay on settings and show the preview
      await rec.scrollBy(400, { waitAfter: 800 })
    }

    await rec.caption('Your website. Your brand. Instant inquiry form.')
    await rec.pause(2000)

    await rec.caption('Event type, date, guests, message. All captured.')
    await rec.pause(2000)

    await rec.progress(45)

    await rec.caption('Client submits. Lead goes straight to your pipeline.')
    await rec.pause(2000)

    await rec.progress(50)

    // ── SCENE 4: LEAD IN PIPELINE (22-33s) ─────────────────
    await rec.captionHide()
    await rec.sceneCut('/inquiries', { waitAfter: 500 })

    await rec.caption('Back in your portal. The lead is already here.')
    await rec.pause(2000)

    await rec.progress(60)

    // Show an inquiry with website source
    try {
      const inqRow = page.locator('table tbody tr, a[href*="/inquiries/"]').first()
      if (await inqRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('table tbody tr, a[href*="/inquiries/"]', { speed: 500 })
        await rec.pause(300)
        await inqRow.click()
        await rec.pause(2000)
      }
    } catch {}

    await rec.caption('Scored. Organized. Ready to act on.')
    await rec.pause(2000)

    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('Every detail from the form. Plus a deadline.')
    await rec.pause(2000)

    await rec.progress(78)

    // ── SCENE 5: CTA (33-40s) ──────────────────────────────
    await rec.captionHide()
    await rec.pause(500)
    await rec.progress(100)

    await rec.titleCard(
      'Your website works while you cook.',
      'Start free at cheflowhq.com',
      5000
    )
  },
}
