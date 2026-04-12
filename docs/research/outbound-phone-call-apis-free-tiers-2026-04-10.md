# Research: Free/Low-Cost Programmatic Outbound Phone Call APIs

> **Date:** 2026-04-10
> **Question:** What free or effectively-free options exist for making automated outbound PSTN calls with TTS + DTMF capture? Specific focus on Bland.ai, Vapi.ai, Retell AI, Twilio, and Google Voice.
> **Status:** Complete

## Origin Context

Need to programmatically call a US phone number, play a short TTS message, capture a DTMF keypress (1 or 2), and return the result to a server. Looking for the cheapest or free option that does not restrict which phone numbers can be called. Key questions: do any of these services have a free tier that allows calling arbitrary numbers (not just verified/sandboxed ones)?

---

## Summary

Every service in the "trial" tier restricts outbound calls to verified/whitelisted numbers only. The only realistic path to calling any arbitrary US number for free (or near-free) is: (1) Twilio upgraded to paid, where the $15 trial credit does NOT carry over but the verified-number restriction IS lifted, or (2) Bland.ai's free Start plan, which has no documented verified-number restriction and allows 100 calls/day at $0.14/min pay-as-you-go. Vapi and Retell both offer $10 trial credits with no documented number restrictions but this is unconfirmed. Google Voice has no legitimate programmatic API.

---

## Detailed Findings

### 1. Bland.ai

**Source:** [Bland AI Billing Docs](https://docs.bland.ai/platform/billing), [Lindy analysis](https://www.lindy.ai/blog/bland-ai-pricing)

- **Free tier exists:** Yes. The "Start" plan is free with no monthly fee.
- **Limits:** 100 calls/day, 100 calls/hour, 10 concurrent calls, 1 voice clone.
- **Per-minute rate:** $0.14/min (highest of all tiers, but pay-as-you-go with no subscription).
- **Verified number restriction:** Not documented on the billing page. No mention of a sandboxed/verified-only restriction for the Start plan. This is the most likely option for calling arbitrary numbers without paying a subscription.
- **DTMF support:** Yes, Bland supports DTMF input capture natively.
- **Minimum call cost:** $0.015 per attempt (charged even if no answer or call under 10 seconds, as of June 2025).
- **Verdict:** Best free-tier candidate. 100 calls/day for a 30-second call = roughly $0.07/call. No subscription needed. Number restriction status unconfirmed but no restriction is mentioned anywhere.

### 2. Vapi.ai

**Source:** [Vapi pricing](https://vapi.ai/pricing), [Dograh breakdown](https://blog.dograh.com/vapi-pricing-breakdown-2025-plans-hidden-costs-what-to-expect/), [aitoolscoop review](https://aitoolscoop.com/tool/vapi/)

- **Free trial:** $10 in credits at signup, no credit card required.
- **Per-minute rate:** $0.05/min platform fee + separately billed telephony (Twilio/Vonage), TTS, LLM. Total real cost is typically $0.15-$0.25/min all-in.
- **Verified number restriction:** Not documented. Multiple sources confirm $10 free credits with no explicit mention of a verified-number sandbox. This suggests outbound calls to any US number may be allowed.
- **DTMF support:** Yes.
- **Verdict:** $10 trial credit, no credit card, probably no number restriction. But true all-in cost per call is unclear until you configure telephony provider. The $0.05/min platform fee is only part of it.

### 3. Retell AI

**Source:** [Retell pricing](https://www.retellai.com/pricing), [eesel.ai guide](https://www.eesel.ai/blog/retell-ai-pricing), [synthflow review](https://synthflow.ai/blog/retell-ai-review)

- **Free trial:** $10 in credits at signup. No platform fee.
- **Per-minute rate:** $0.07+ base, realistically $0.13-$0.31/min all-in depending on voice model and LLM.
- **Verified number restriction:** The "Verified Phone Number" feature at Retell is about caller ID branding (making your outgoing caller ID show as verified/branded to avoid spam filters). It is NOT a restriction on which numbers you can call. You can call any US number; the verified number product is optional.
- **DTMF support:** Yes.
- **Verdict:** $10 free credits, no documented restriction on destination numbers, no credit card required upfront. Competitive option.

### 4. Twilio

**Source:** [Twilio free trial docs](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account), [upgrade article](https://help.twilio.com/articles/223183208-Upgrading-to-a-paid-Twilio-Account), [limitations article](https://help.twilio.com/articles/360036052753-Twilio-Free-Trial-Limitations)

- **Trial credit:** $15 preloaded on account creation. No credit card required to start.
- **Trial restriction:** You can ONLY call/message verified phone numbers in trial mode. This is a hard platform restriction, not a soft guideline.
- **Upgrading to paid:**
  - Adding a credit card and upgrading removes the verified-number restriction immediately.
  - The $15 trial credit does NOT carry over to the paid account. It is forfeited on upgrade.
  - Your paid account starts with whatever balance you fund during upgrade.
- **DTMF support:** Yes, full TwiML `<Gather>` verb for DTMF capture.
- **Per-minute rate:** ~$0.014/min outbound US calls. Very cheap.
- **Verdict:** Trial is useless for calling arbitrary numbers. Paid account is cheap ($0.014/min) but requires funding. The $15 credit is lost when you upgrade. Best raw telephony option if you are willing to put in $10-20.

### 5. Google Voice

**Source:** [OpenPhone analysis](https://www.quo.com/blog/google-voice-api/), [Google Voice community](https://support.google.com/voice/thread/248102131/google-voice-api), [jaraco/googlevoice GitHub](https://github.com/jaraco/googlevoice)

- **Official API:** Does not exist. Google has never released a public Voice API.
- **Unofficial libraries:** The `googlevoice` Python package (and `jaraco/googlevoice` fork) exists on PyPI, based on reverse-engineering the internal web interface. Actively maintained until around 2021-2022.
- **Legal status:** Using any unofficial automation violates Google Voice Acceptable Use Policy and Google Workspace Service-Specific Terms. Google can and does terminate accounts.
- **Practical status in 2026:** The internal API Google Voice uses has changed multiple times. These libraries are fragile and likely broken or partially broken. Google actively fights scraping/automation of Voice.
- **Verdict:** Not viable. No legitimate API. Unofficial workarounds violate ToS and are unreliable.

### 6. SignalWire

**Source:** [SignalWire docs](https://developer.signalwire.com/voice/getting-started/making-and-receiving-phone-calls/), [SignalWire FAQs](https://developer.signalwire.com/messaging/faq/)

- **Trial mode:** Free trial exists but has the same restriction as Twilio: trial mode restricts calls to your own verified numbers only. You must upgrade to call arbitrary numbers.
- **DTMF support:** Yes, robust DTMF gather.
- **Pricing:** Comparable to or cheaper than Twilio.
- **Verdict:** Same model as Twilio trial. Upgrade required to remove number restrictions. Not a free option.

### 7. Vonage (now Vonage API Platform / formerly Nexmo)

**Source:** [Vonage trial limitations](https://api.support.vonage.com/hc/en-us/articles/212554438-What-are-the-limitations-of-a-trial-account), [Vonage test numbers guide](https://api.support.vonage.com/hc/en-us/articles/204014853-How-do-I-add-test-numbers-during-my-Vonage-API-trial)

- **Trial credit:** Provided on signup (amount varies but typically small).
- **Trial restriction:** Voice calls in trial mode can only be made to your registered number AND up to 5 whitelisted test numbers. Hard restriction.
- **Upgrade:** Removes restriction, allows calling any number.
- **DTMF support:** Yes, full NCCO (Nexmo Call Control Objects) with input actions.
- **Verdict:** Trial is useless for arbitrary numbers. Paid tier is usable but requires funding.

### 8. Plivo

**Source:** [Plivo free trial support](https://support.plivo.com/hc/en-us/sections/360008303751-Free-Trial-Account), [Plivo DTMF support article](https://support.plivo.com/hc/en-us/articles/360041448952-What-types-of-DTMF-does-Plivo-support)

- **Trial restriction:** Outbound calls limited to sandboxed/verified numbers only.
- **DTMF support:** Yes (RFC-2833 out-of-band only).
- **Verdict:** Same pattern as Twilio/Vonage. Upgrade required.

---

## Comparison Table

| Service      | Free Credits         | No CC Required   | Call Any Number (Trial)                                     | DTMF | Best Path                            |
| ------------ | -------------------- | ---------------- | ----------------------------------------------------------- | ---- | ------------------------------------ |
| Bland.ai     | None (pay-as-you-go) | Yes (Start plan) | Likely yes (not restricted in docs)                         | Yes  | Free Start plan, pay $0.14/min       |
| Vapi.ai      | $10                  | Yes              | Likely yes (not documented as restricted)                   | Yes  | Use $10 credit, add telephony        |
| Retell AI    | $10                  | Yes              | Yes (verified = caller ID branding, not a call restriction) | Yes  | Use $10 credit                       |
| Twilio       | $15 (trial)          | Yes (trial only) | No (trial: verified only)                                   | Yes  | Upgrade to paid, credit is forfeited |
| SignalWire   | Yes (trial)          | Yes (trial)      | No (trial: verified only)                                   | Yes  | Same as Twilio                       |
| Vonage       | Yes (trial)          | Yes (trial)      | No (trial: up to 5 verified only)                           | Yes  | Upgrade required                     |
| Plivo        | Yes (trial)          | Yes (trial)      | No (trial: sandboxed only)                                  | Yes  | Upgrade required                     |
| Google Voice | N/A                  | N/A              | No legitimate API                                           | N/A  | Not viable                           |

---

## Gaps and Unknowns

1. **Bland.ai verified number restriction (unconfirmed):** The Start plan billing page does not mention a verified-number requirement, but it also does not explicitly confirm there is none. The safest approach is to sign up and test with a non-verified number to confirm.

2. **Vapi.ai number restriction during trial:** Multiple sources confirm $10 free credits with no credit card, but none explicitly state whether outbound calls are restricted to verified numbers during the trial. Likely not restricted (since Vapi routes calls through your choice of telephony provider), but unconfirmed.

3. **Twilio trial credit fate:** Official docs say the $15 trial balance is "not carried over" on upgrade. One older Twilio blog post mentioned "unused minutes converted at $0.03/min" but this may be outdated. Current official position is the credit is forfeited.

4. **Real all-in cost for Vapi:** The $0.05/min platform fee is separate from telephony, TTS, and LLM costs. Actual cost for a 30-second call with TTS + DTMF could be $0.10-$0.20 per call depending on voice model chosen.

---

## Recommendations

**Immediate action (quick fix):**

- Sign up for Retell AI with $10 free credits. The free credit is enough for 60-90 minutes of test calls. No credit card required. DTMF capture is supported. Destination number restrictions are not documented (the "verified number" product is a caller ID branding feature, not an outbound calling gate).
- Alternatively, sign up for Bland.ai Start plan. No monthly fee. Pay $0.14/min only for connected time. For a 30-second call = ~$0.07. 100 calls/day limit is plenty for testing.

**If you need scale (needs discussion):**

- Twilio paid account: $0.014/min is 10x cheaper than Bland. Requires adding a credit card and losing the $15 trial credit. But for volume this is the right long-term choice.

**Do not pursue:**

- Google Voice: no API, ToS violation, accounts terminated.
- Twilio/Vonage/Plivo/SignalWire trial accounts: all restrict outbound calls to verified numbers. Useless for calling arbitrary numbers.
