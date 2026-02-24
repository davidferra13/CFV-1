# ChefFlow Beta Testing Program

## Overview

Two-phase rollout with a small group of trusted testers. Goal: find bugs, test the real user experience, and validate the product before public launch.

**Beta URL:** `https://beta.cheflowhq.com`

---

## Pre-Flight Checklist (Before ANYONE Tests)

These must all pass before you or your friend touch the beta. If any of these fail, testers will hit problems that aren't app bugs — and you'll waste time debugging the wrong things.

### Environment

- [ ] Beta server is running — `https://beta.cheflowhq.com` loads without errors
- [ ] PM2 process `chefflow-beta` is healthy on Pi (`ssh pi` → `pm2 status`)
- [ ] Cloudflare Tunnel is active (`cloudflared.service` running on Pi)

### Stripe (Payments)

- [ ] Beta is using **Stripe test mode**, not live keys
- [ ] Verify: `.env.local` on Pi has `STRIPE_SECRET_KEY=sk_test_...` (not `sk_live_...`)
- [ ] Verify: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (not `pk_live_...`)
- [ ] Test a payment with Stripe test card `4242 4242 4242 4242` — confirm it goes through without real charges

### Email Delivery

- [ ] Confirmation emails send from beta (sign up → check inbox)
- [ ] Quote emails send from beta (create a quote → send → check inbox)
- [ ] Inquiry notification emails fire (submit public inquiry → chef gets notified)
- [ ] If emails fail: check email provider config in `.env.local` on Pi — API keys, sender domain, etc.

### AI / Ollama

- [ ] Ollama is running on Pi (`ssh pi` → `systemctl status ollama`)
- [ ] Remy chat responds (open Remy → send a message → get a reply)
- [ ] Lead scoring works (submit an inquiry → check if score appears)
- [ ] If Ollama is down: `sudo systemctl start ollama` on Pi (but remember — stop it before any builds)

### Signup Flow

- [ ] Landing page clearly communicates what ChefFlow is (a tester shouldn't need to ask "what is this?")
- [ ] Sign-up form works — create a throwaway account, confirm email, log in
- [ ] Password reset works — trigger a reset, receive email, set new password
- [ ] Delete the throwaway account after testing (keep the beta clean)

---

## Phase 1 — Smoke Test (You + Best Friend)

Goal: Make sure the core flow works end to end before inviting anyone else.

| #   | Name    | Email | Role         | Status  | Invited | Signed Up | Notes                                          |
| --- | ------- | ----- | ------------ | ------- | ------- | --------- | ---------------------------------------------- |
| 1   | _(you)_ |       | Chef (admin) | —       | —       | —         | Already on the platform                        |
| 2   |         |       | Chef         | Not yet |         |           | Best friend, private chef. Test together live. |

### What to test in Phase 1

**Part A — Chef side** (walk through the entire lifecycle as a brand new chef):

1. **Sign up** — go to `beta.cheflowhq.com`, create an account from scratch
2. **Onboarding** — complete any setup steps, fill in chef profile
3. **Create a client** — add a fake client with realistic info
4. **Receive an inquiry** — submit one through the public inquiry form
5. **Create an event** — full event setup from the inquiry
6. **Build a quote** — add menu items, pricing, send the quote
7. **Accept the quote** — simulate the client accepting
8. **Process a payment** — go through the payment flow (use Stripe test card `4242 4242 4242 4242`)
9. **Walk the event through all stages** — draft → proposed → accepted → paid → confirmed → in_progress → completed
10. **Check financials** — do the numbers add up in the dashboard?
11. **Try the AI features** — Remy chat, lead scoring, any Ollama-powered features
12. **Mobile test** — open the beta URL on your phones, go through the same flows

**Part B — Client side** (this is the other half of your app — don't skip it):

1. **Receive a quote as a client** — check the email, click the link, view the quote
2. **Accept a quote as a client** — does the acceptance flow work? Is it clear what to do?
3. **Make a payment as a client** — go through the client payment experience
4. **View event details as a client** — can the client see their upcoming event, menu, timeline?
5. **Submit an inquiry as a client** — use the public inquiry form or embeddable widget from an outside perspective

**Tip:** Hop on a call with your friend while he goes through it. Watch him use it without guiding him. Every time he hesitates or asks "what do I do here?" — that's a UX bug worth logging.

### Phase 1 exit criteria

Move to Phase 2 when ALL of these are true:

- [ ] Both testers can sign up without help
- [ ] Core event lifecycle works end to end (no crashes, no dead ends)
- [ ] Client-side experience works (view quote, accept, pay, see event)
- [ ] Emails deliver correctly (confirmations, quotes, notifications)
- [ ] Financial numbers display correctly
- [ ] AI features respond without errors (or fail gracefully with a clear message)
- [ ] App works on mobile (no layout breaks, forms are usable)
- [ ] No data loss or corruption during normal use
- [ ] Critical bugs from Phase 1 are fixed and redeployed

---

## Phase 2 — Real Feedback (Wider Group)

Goal: Fresh eyes on the product. These people haven't seen it before — watch where they get confused.

| #   | Name | Email | Role | Status  | Invited | Signed Up | Notes |
| --- | ---- | ----- | ---- | ------- | ------- | --------- | ----- |
| 3   |      |       |      | Not yet |         |           |       |
| 4   |      |       |      | Not yet |         |           |       |
| 5   |      |       |      | Not yet |         |           |       |
| 6   |      |       |      | Not yet |         |           |       |

### What to send them

Keep it simple. One message:

> Hey! I'm building a platform for private chefs called ChefFlow. I'd love for you to try it out and give me honest feedback. Here's the link:
>
> **https://beta.cheflowhq.com**
>
> Just sign up and play around with it. Don't worry about breaking anything — that's the whole point. If anything is confusing or doesn't work, screenshot it and send it to me in [GROUP CHAT NAME].

**Do NOT send instructions.** The less you explain, the more useful their feedback is. If they can't figure something out, that's a bug in the UX, not a gap in your instructions.

### Feedback channel

Pick ONE place where all beta feedback goes. Scattered texts across 6 DM threads will get lost.

**Recommended:** Create a group chat (iMessage, WhatsApp, or whatever you all already use) called something like "ChefFlow Beta." Tell testers: "Drop screenshots and feedback here." This also lets testers see each other's feedback, which sparks more conversation.

**Alternative:** A shared Google Doc where testers add comments. More organized but higher friction — people are less likely to bother.

### Feedback to collect

After they've used it for a few days, ask:

1. What was your first impression when you landed on the site?
2. Was anything confusing during sign-up?
3. What did you try to do first? Were you able to do it?
4. What felt broken or unfinished?
5. What do you wish it did that it doesn't?
6. Would you use this for your business? Why or why not?

---

## Bug / Feedback Log

Track issues as they come in. Move to GitHub Issues if the list gets long.

| #   | Reported By | Date | Description | Severity | Status | Fixed In |
| --- | ----------- | ---- | ----------- | -------- | ------ | -------- |
|     |             |      |             |          |        |          |

**Severity guide:**

- **Critical** — can't sign up, data loss, app crashes
- **High** — core feature broken, blocks the main workflow
- **Medium** — something doesn't work right but there's a workaround
- **Low** — cosmetic, minor annoyance, nice-to-have

---

## Timeline

Fill in actual dates to keep momentum. Beta without deadlines drifts forever.

| Milestone                       | Target Date | Status      |
| ------------------------------- | ----------- | ----------- |
| Pre-flight checklist complete   |             | Not started |
| Phase 1 start (you + friend)    |             | Not started |
| Phase 1 bugs fixed + redeployed |             |             |
| Phase 2 invites sent            |             |             |
| Phase 2 feedback collected      |             |             |
| Post-beta fixes complete        |             |             |
| Ready for production launch     |             |             |
