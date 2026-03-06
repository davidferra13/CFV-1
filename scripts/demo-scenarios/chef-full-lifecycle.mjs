/**
 * Scenario: chef-full-lifecycle
 * "Inquiry to Invoice" - The #1 most important video.
 *
 * This is the video that shows the ENTIRE value prop in 90 seconds.
 * Structure: Hook (3s) -> Problem (5s) -> Solution walkthrough (75s) -> CTA (7s)
 *
 * Duration: ~90 seconds
 */

export default {
  title: 'Inquiry to Invoice',
  auth: 'chef',

  async run(rec, page) {
    // ── HOOK (0-3s) ───────────────────────────────────────
    // This is the first thing they see. Stop the scroll.
    await rec.titleCard(
      'From first message to final payment.',
      'In one platform.',
      3000
    )
    await rec.progress(3)

    // ── STAGE 1: Inquiry comes in (3-20s) ─────────────────
    await rec.navigate('/inquiries')
    await rec.caption('Every inquiry gets an instant lead score.')
    await rec.pause(1500)

    // Hover the lead score column
    try {
      await rec.hoverOn('[class*="lead-score"], [class*="leadScore"], [class*="score"], td:nth-child(4)', { speed: 500, waitAfter: 600 })
    } catch {}

    await rec.progress(12)

    // Click into inquiry detail
    try {
      const inqRow = page.locator('table tbody tr, a[href*="/inquiries/"]').first()
      if (await inqRow.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.caption('See everything about this lead at a glance.')
        await rec.moveTo('table tbody tr', { speed: 600 })
        await rec.pause(300)
        await inqRow.click()
        await rec.pause(2500)

        // Scroll to show the full inquiry detail
        await rec.scrollBy(300, { waitAfter: 800 })
      }
    } catch {}

    await rec.progress(22)

    // ── STAGE 2: Create the event (20-35s) ────────────────
    await rec.captionHide()
    await rec.fadeOut(300)
    await rec.navigate('/events', { waitAfter: 500 })
    await rec.fadeIn(300)

    await rec.caption('One click to turn an inquiry into an event.')
    await rec.pause(1500)

    // Show the events list with different statuses
    try {
      // Hover across the status filters to show the pipeline
      for (const status of ['Draft', 'Proposed', 'Accepted', 'Confirmed', 'Completed']) {
        try {
          await rec.hoverOn(`a:has-text("${status}"), button:has-text("${status}")`, { speed: 300, waitAfter: 300 })
        } catch { break }
      }
      // Back to All
      try {
        await rec.clickOn('a:has-text("All"), button:has-text("All")', { speed: 300, waitAfter: 600 })
      } catch {}
    } catch {}

    await rec.progress(32)

    // Click into an event
    await rec.captionHide()
    let eventUrl = null
    try {
      const evtLink = page.locator('a[href*="/events/"]').first()
      if (await evtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('a[href*="/events/"]', { speed: 500 })
        await evtLink.click()
        await rec.pause(2000)
        eventUrl = page.url()
      }
    } catch {}

    // ── STAGE 3: Event detail tabs (35-55s) ───────────────
    await rec.caption('Every detail in one place. Four tabs.')
    await rec.pause(1500)

    // Scroll the overview
    await rec.scrollBy(300, { waitAfter: 800 })

    await rec.progress(40)

    // Money tab
    try {
      await rec.caption('Quotes, payments, food cost, profit margins.')
      await rec.clickOn('[role="tab"]:has-text("Money"), button:has-text("Money"), a:has-text("Money")', { speed: 500, waitAfter: 1800 })
      await rec.scrollBy(300, { waitAfter: 800 })
    } catch {}

    await rec.progress(50)

    // Ops tab
    try {
      await rec.caption('Time tracking, staff, temp logs, packing lists.')
      await rec.clickOn('[role="tab"]:has-text("Ops"), button:has-text("Ops"), a:has-text("Ops")', { speed: 500, waitAfter: 1800 })
      await rec.scrollBy(300, { waitAfter: 800 })
    } catch {}

    await rec.progress(58)

    // Wrap-Up tab
    try {
      await rec.caption('After-action review. Learn from every event.')
      await rec.clickOn('[role="tab"]:has-text("Wrap"), button:has-text("Wrap"), a:has-text("Wrap")', { speed: 500, waitAfter: 1500 })
    } catch {}

    await rec.progress(65)

    // ── STAGE 4: Invoice (55-70s) ─────────────────────────
    const eventIdMatch = (eventUrl || page.url()).match(/\/events\/([^/?]+)/)
    if (eventIdMatch) {
      await rec.captionHide()
      await rec.sceneCut(`/events/${eventIdMatch[1]}/invoice`, { waitAfter: 500 })
      await rec.caption('Professional invoices. One click to send.')
      await rec.pause(1500)
      await rec.scrollBy(300, { waitAfter: 800 })
      await rec.scrollBy(300, { waitAfter: 800 })
    }

    await rec.progress(78)

    // ── STAGE 5: Kanban board (70-83s) ────────────────────
    await rec.captionHide()
    await rec.sceneCut('/events', { waitAfter: 500 })
    await rec.caption('See your entire pipeline at a glance.')
    await rec.pause(1000)

    // Switch to kanban view
    try {
      await rec.clickOn('button:has-text("Board"), [aria-label*="board"], [aria-label*="Board"]', { speed: 500, waitAfter: 2000 })
      await rec.scrollBy(200, { waitAfter: 1000 })
    } catch {}

    await rec.progress(90)

    // ── CTA (83-90s) ──────────────────────────────────────
    await rec.captionHide()
    await rec.pause(500)
    await rec.progress(100)

    await rec.titleCard(
      'Stop juggling spreadsheets.',
      'Start free at cheflowhq.com',
      4000
    )
  },
}
