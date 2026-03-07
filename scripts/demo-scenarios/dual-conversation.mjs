/**
 * Scenario: dual-conversation
 * "See both sides of the conversation. In real time."
 *
 * Storyboard: docs/storyboard-06-chef-client-conversation.md
 * Duration: ~75 seconds
 * NOTE: Dual-context video. Requires two browser contexts (chef + client).
 *       For single-context recording, this simulates the dual view by
 *       navigating between chef and client portals.
 */

export default {
  title: 'Chef-to-Client: The Conversation',
  auth: 'chef',

  async run(rec, page) {
    // ── SCENE 1: TITLE CARD (0-3s) ─────────────────────────
    await rec.titleCard(
      'See both sides of the conversation.',
      'In real time.',
      3000
    )

    // ── SCENE 2: CHEF SENDS PROPOSAL (3-18s) ──────────────
    await rec.navigate('/events')
    await rec.progress(5)

    await rec.caption("Chef's view. Proposal built. Ready to send.")
    await rec.pause(1500)

    // Click into an event
    try {
      const evtLink = page.locator('a[href*="/events/"]').first()
      if (await evtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rec.moveTo('a[href*="/events/"]', { speed: 500 })
        await evtLink.click()
        await rec.pause(2000)
      }
    } catch {}

    await rec.progress(10)

    // Money tab
    try {
      await rec.clickOn('[role="tab"]:has-text("Money"), button:has-text("Money")', { speed: 500, waitAfter: 1500 })
    } catch {}

    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.progress(15)

    // Send proposal button
    try {
      await rec.hoverOn('button:has-text("Send"), button:has-text("Proposal")', { speed: 500, waitAfter: 800 })
    } catch {}

    await rec.caption('Sent. Now watch what your client sees.')
    await rec.pause(2500)

    await rec.progress(24)

    // ── SCENE 3: CLIENT RECEIVES (18-30s) ──────────────────
    // In single-context mode, we simulate the client view
    await rec.captionHide()
    await rec.fadeOut(150)
    await rec.pause(300)
    await rec.fadeIn(150)

    await rec.caption("Client's view. The proposal just arrived.")
    await rec.pause(2000)

    // Show the proposal content (scroll current page to show menu/pricing)
    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('They read the menu. They have a question.')
    await rec.pause(2500)

    await rec.scrollBy(300, { waitAfter: 800 })
    await rec.caption('One message. Straight to the chef.')
    await rec.pause(2000)

    await rec.progress(40)

    // ── SCENE 4: CHEF SEES THE MESSAGE (30-42s) ────────────
    await rec.captionHide()
    await rec.fadeOut(150)
    await rec.pause(300)
    await rec.fadeIn(150)

    await rec.caption("Chef's view. The question just came in.")
    await rec.pause(2000)

    await rec.caption('Reply right here. No email, no text.')
    await rec.pause(2500)

    await rec.caption('Answered. In one thread. Everything tracked.')
    await rec.pause(2500)

    await rec.progress(56)

    // ── SCENE 5: CLIENT ACCEPTS (42-55s) ───────────────────
    await rec.captionHide()
    await rec.fadeOut(150)
    await rec.pause(300)
    await rec.fadeIn(150)

    await rec.caption('Client sees the reply. Question answered.')
    await rec.pause(2000)

    await rec.caption('One click. Proposal accepted.')
    await rec.pause(2500)

    // Back to chef view
    await rec.captionHide()
    await rec.fadeOut(150)
    await rec.pause(300)
    await rec.fadeIn(150)

    await rec.caption("Chef's view. Accepted. Status updated instantly.")
    await rec.pause(2500)

    await rec.progress(80)

    // ── SCENE 6: THE FULL THREAD (55-65s) ──────────────────
    await rec.caption('The entire conversation. One place. Forever.')
    await rec.pause(2500)

    await rec.caption('No email chains. No lost texts.')
    await rec.pause(2500)

    await rec.progress(92)

    // ── SCENE 7: CTA (65-72s) ──────────────────────────────
    await rec.captionHide()
    await rec.pause(500)
    await rec.progress(100)

    await rec.titleCard(
      'Professional communication. Zero friction.',
      'Start free at cheflowhq.com',
      5000
    )
  },
}
