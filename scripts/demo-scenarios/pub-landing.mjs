/**
 * Scenario: pub-landing
 * "What is ChefFlow?" - Landing page tour
 *
 * Structure: Hook (3s) -> Scroll through value props (30s) -> Pricing (10s) -> CTA (5s)
 * Duration: ~45 seconds
 */

export default {
  title: 'What is ChefFlow?',
  auth: null,

  async run(rec, page) {
    // ── HOOK (0-3s) ───────────────────────────────────────
    await rec.titleCard(
      'What if running your private chef business was actually easy?',
      '',
      3000
    )

    // ── LANDING PAGE (3-35s) ──────────────────────────────
    await rec.navigate('/')
    await rec.progress(7)
    await rec.caption('ChefFlow. Ops for artists.')
    await rec.pause(2000)

    // Scroll through the page, captioning each section
    await rec.scrollBy(500, { waitAfter: 1200 })
    await rec.captionHide()
    await rec.progress(15)

    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.caption('Inquiries, events, clients, finance. All in one place.')
    await rec.pause(1500)
    await rec.progress(25)

    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.captionHide()
    await rec.scrollBy(500, { waitAfter: 1000 })
    await rec.progress(35)

    await rec.caption('Built by a private chef. For private chefs.')
    await rec.pause(1500)

    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.captionHide()
    await rec.progress(50)

    // Scroll through remaining sections
    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.scrollBy(500, { waitAfter: 800 })
    await rec.progress(65)

    // ── PRICING (35-43s) ──────────────────────────────────
    await rec.sceneCut('/pricing', { waitAfter: 500 })
    await rec.caption('Start free. Upgrade when you grow.')
    await rec.progress(72)
    await rec.pause(2000)

    // Scroll through pricing tiers
    await rec.scrollBy(400, { waitAfter: 1000 })
    await rec.progress(82)

    // Hover over the free tier CTA
    try {
      await rec.hoverOn('button:has-text("Start Free"), a:has-text("Start Free"), button:has-text("Get Started")', { speed: 600, waitAfter: 1000 })
    } catch {}

    await rec.captionHide()
    await rec.progress(90)

    // ── CTA (43-48s) ──────────────────────────────────────
    await rec.progress(100)
    await rec.titleCard(
      'Your business deserves better than spreadsheets.',
      'cheflowhq.com',
      4000
    )
  },
}
