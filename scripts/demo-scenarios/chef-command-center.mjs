/**
 * Scenario: chef-command-center
 * "Your Command Center" - Dashboard tour
 *
 * Structure: Hook (3s) -> Dashboard widgets (50s) -> Cmd+K search (7s) -> CTA (5s)
 * Duration: ~65 seconds
 */

export default {
  title: 'Your Command Center',
  auth: 'chef',

  async run(rec, page) {
    // ── HOOK (0-3s) ───────────────────────────────────────
    await rec.titleCard(
      'Open your laptop. Know exactly what to do.',
      'The ChefFlow Dashboard',
      3000
    )

    // ── DASHBOARD (3-55s) ─────────────────────────────────
    await rec.navigate('/dashboard')
    await rec.progress(5)

    // Greeting
    await rec.caption('Good morning, Chef. Here is your day.')
    await rec.pause(2000)
    await rec.progress(10)

    // Priority action banner
    try {
      await rec.hoverOn('[class*="banner"], [class*="priority"]', { speed: 600, waitAfter: 600 })
      await rec.caption('Your most urgent task, front and center.')
      await rec.pause(1500)
    } catch {}
    await rec.progress(18)

    // Scroll to week strip
    await rec.captionHide()
    await rec.scrollBy(350, { waitAfter: 800 })
    try {
      await rec.caption('Your week at a glance. Events, prep days, free days.')
      await rec.hoverOn('[class*="week"], [data-widget="week_strip"]', { speed: 500, waitAfter: 1000 })
    } catch {}
    await rec.progress(28)

    // Scroll to business snapshot
    await rec.captionHide()
    await rec.scrollBy(400, { waitAfter: 800 })
    try {
      await rec.caption('Revenue, profit, events, clients. Real numbers.')
      await rec.pause(2000)
    } catch {}
    await rec.progress(38)

    // Scroll to priority queue
    await rec.captionHide()
    await rec.scrollBy(400, { waitAfter: 800 })
    try {
      await rec.caption('The priority queue. Never wonder what comes next.')
      await rec.hoverOn('[class*="queue"], [data-widget="priority_queue"]', { speed: 500, waitAfter: 1200 })
    } catch {}
    await rec.progress(48)

    // Scroll deeper into widgets
    await rec.captionHide()
    await rec.scrollBy(400, { waitAfter: 800 })
    await rec.scrollBy(400, { waitAfter: 800 })

    // Business intelligence health score
    try {
      await rec.scrollTo('[data-widget="business_health"], [class*="health"]', { waitAfter: 800 })
      await rec.caption('AI-powered health score. 25 engines, zero guesswork.')
      await rec.pause(2000)

      // Spotlight the health score circle
      try {
        await rec.spotlight('[class*="health-score"], [class*="healthScore"], [class*="score-circle"]')
        await rec.pause(2000)
        await rec.spotlightOff()
      } catch {}
    } catch {}
    await rec.progress(65)

    // Scroll back to top
    await rec.captionHide()
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await rec.pause(1500)
    await rec.progress(72)

    // ── CMD+K SEARCH (55-62s) ─────────────────────────────
    await rec.caption('Cmd+K. Find anything instantly.')
    await rec.pause(800)
    await page.keyboard.press('Control+k')
    await rec.pause(1500)

    // Type a search
    try {
      await page.keyboard.type('new event', { delay: 60 })
      await rec.pause(1500)
    } catch {}

    await page.keyboard.press('Escape')
    await rec.captionHide()
    await rec.progress(90)
    await rec.pause(500)

    // ── CTA (62-67s) ──────────────────────────────────────
    await rec.progress(100)
    await rec.titleCard(
      'Every widget is real data. Not a demo.',
      'Start free at cheflowhq.com',
      4000
    )
  },
}
