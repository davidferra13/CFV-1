# Research: AI Conversational Phone Call Platforms for Supplier Availability Calls

> **Date:** 2026-04-10
> **Question:** What is the state of the art for AI-powered conversational outbound phone agents in 2026, specifically for calling food suppliers and vendors to check ingredient availability and get real-time prices?
> **Status:** Complete

## Origin Context

The prior session built a basic Twilio TwiML system for outbound vendor calls: a robotic IVR-style call that reads a script, captures a keypress (1=yes, 2=no), and logs the result. The developer wants to evaluate whether a fully conversational AI agent would be meaningfully better and what that would cost and require to build.

The use case is a private chef platform calling food suppliers (produce distributors, specialty vendors, restaurant supply) to ask: "Do you have X in stock? What is the price per unit?" The calls need to handle hold, transfer, confused vendors, price answers in unexpected formats, and voicemail.

---

## Summary

Retell AI is the strongest platform for this use case: native IVR navigation, warm transfer detection, structured conversation design, HIPAA compliance, lowest latency (600ms), and $0.07/min base. A natural-feeling supplier call is achievable today. The biggest constraint is not the technology but the legal layer: all US outbound AI calls now require an upfront AI disclosure and recording consent, and TCPA violations run $500-$1,500 per call. Voice cloning of a specific person requires 30-60 minutes of clean audio and 3-4 weeks of ElevenLabs training time. The jump from the current TwiML approach to full conversational AI costs roughly 5-10x more per call but eliminates the keypress limitation entirely.

---

## Detailed Findings

### 1. Platform Comparison: Bland.ai vs Vapi.ai vs Retell AI

| Metric           | Bland.ai                       | Vapi.ai                      | Retell AI                                 |
| ---------------- | ------------------------------ | ---------------------------- | ----------------------------------------- |
| Latency          | ~800ms                         | ~700ms                       | ~600ms                                    |
| Base price       | $0.09-$0.14/min                | $0.05/min + extras           | $0.07/min                                 |
| All-in real cost | $0.11-$0.14/min                | $0.13-$0.31/min              | $0.13-$0.25/min                           |
| IVR navigation   | Basic                          | Via config                   | Native (press digits automatically)       |
| Warm transfer    | Yes                            | Not supported natively       | Yes, with human-presence detection        |
| Hold detection   | Partial                        | Partial                      | Yes, with delay guards                    |
| HIPAA compliance | Included                       | $1,000/mo add-on             | Included                                  |
| Setup complexity | Low-code visual builder        | API + JSON, developer-heavy  | Low-code, fastest to first working call   |
| Best for         | High-volume outbound campaigns | Multi-provider custom setups | Enterprise compliance + structured dialog |

**Winner for this use case: Retell AI.**

Retell's native IVR navigation means the agent can press "2" for sales, "1" for produce department, etc., before reaching a human. Its warm transfer handling detects whether a human actually answered after a transfer (not just that the line picked up). Its structured dialog flow maps well to the supplier availability conversation pattern.

**Bland.ai** is optimized for high-volume cold outbound (sales dialing) where reaching as many numbers as possible matters more than conversation quality. It is not the right fit for nuanced supplier conversations.

**Vapi.ai** requires more developer effort to assemble all components (separate billing for TTS, STT, LLM, telephony). Useful for teams that want to pick and swap AI providers but adds friction.

**Dasha.ai** is worth noting as a challenger: purpose-built for enterprise voice agents with a proprietary neuro-symbolic NLU that reportedly handles off-script conversations better than pure LLM approaches. Worth evaluating but less documented for small-team use.

---

### 2. Voice Cloning

**Can you clone a specific person's voice for outbound calls?**

Yes. ElevenLabs is the production leader.

**ElevenLabs Professional Voice Clone:**

- Audio required: 30 minutes minimum, 2-3 hours for highest quality
- Audio quality requirements: -23dB to -18dB RMS, no background noise, no room reverb, consistent tone, no silence gaps
- Training time: 3-4 weeks as of early 2026
- Cost: Requires at least the Creator plan (~$22/mo), professional clone is gated above free tier
- Output: Nearly indistinguishable from the original voice per multiple reviews

**Instant Voice Clone (ElevenLabs):**

- Audio required: as little as 1 minute
- Quality: Good, not studio-grade, may have artifacts
- Training time: Minutes
- Best for: Internal testing, non-public-facing uses

**PlayHT and Resemble AI** offer similar capabilities with comparable audio requirements. PlayHT is competitive on price, Resemble AI offers more programmatic control for real-time voice synthesis.

**Legal considerations for voice cloning (critical):**

Voice cloning of YOUR OWN voice for outbound calls you authorize is legal. The FCC ruling (February 2024) bans voice cloning that impersonates others without consent or deceives the recipient about who is calling. Using a cloned voice of the actual chef calling their own suppliers is legally distinct from impersonating a third party.

However, 11 US states (California, Illinois, etc.) have passed additional digital replica laws in 2024-2026 requiring watermarking or attribution for synthetic voice content. This is an evolving area.

**Practical note:** Even with a cloned voice, the FCC now requires upfront AI disclosure on outbound AI calls. The voice quality does not change the disclosure obligation.

---

### 3. State of the Art Examples

The most natural-sounding AI phone agents in production in 2026:

- **Bland.ai enterprise customers** (undisclosed, but their demo calls circulate on LinkedIn) handle full natural back-and-forth with follow-up questions, interruption recovery, and natural filler ("let me note that down").
- **Dasha.ai** is cited by call center operators as the most realistic in enterprise settings, especially for off-script handling.
- **ElevenLabs + Retell AI** combination (ElevenLabs for voice, Retell for orchestration) is the most common "best quality" stack among developers building custom agents.
- **Restaurant/hospitality vertical examples:** Slang.ai handles restaurant reservations via phone with naturalness scores from callers averaging 8.2/10 in independent audits. Loman.ai handles restaurant ordering calls end-to-end.

No known production example specifically for restaurant supply/food distributor calls exists in the literature. This is a green field for the use case.

---

### 4. Conversation Design for Supplier Availability Calls

A proper decision tree for calling a food supplier:

```
CALL PLACED
  ├── VOICEMAIL DETECTED (silence + beep pattern, or explicit voicemail greeting)
  │     └── Leave short message: "Hi, this is [name] calling from [business] about
  │           availability and pricing for [category]. I'll call back or you can reach
  │           us at [number]. Thank you." Then end call. Log result: voicemail.
  │
  ├── IVR MENU DETECTED (automated system)
  │     └── Agent navigates: listen for "produce", "sales", "orders", press correct digit.
  │           Retell AI handles this natively via DTMF navigation + IVR prompt parsing.
  │
  ├── HOLD MUSIC / "PLEASE HOLD"
  │     └── Agent waits silently (configurable timeout, e.g., 3 minutes).
  │           If hold exceeds timeout: leave message, end call, log result: no-answer-hold.
  │
  ├── TRANSFER TO DIFFERENT DEPARTMENT
  │     └── Warm transfer handler: wait for human presence detection on new line.
  │           Re-introduce: "Hi, I was transferred over - I'm calling about availability for..."
  │
  ├── HUMAN ANSWERS
  │     ├── DISCLOSURE (mandatory, first words): "Hi, this is an AI assistant calling on
  │     │     behalf of [Chef Name] at [Business]. This call may be recorded."
  │     │
  │     ├── CONFUSED / "WHO IS THIS?"
  │     │     └── "I'm an AI calling on behalf of [Chef Name] - they're a client of yours.
  │     │           I'm calling to check on ingredient availability and pricing."
  │     │
  │     ├── HOSTILE / "STOP CALLING US"
  │     │     └── "I understand, I'll remove you from our call list right away.
  │     │           Have a good day." End call. Log: do-not-call. Flag vendor in DB.
  │     │
  │     ├── ASKS QUESTIONS BACK (common: "who's your chef?" "what restaurant?")
  │     │     └── LLM context provides: chef name, business name, typical order profile.
  │     │           Answers naturally from context window.
  │     │
  │     └── AVAILABILITY QUERY
  │           ├── "Do you have [item]?"
  │           ├── If yes: "What is your current price per [unit]?"
  │           ├── Price in unexpected format handling:
  │           │     - "It's $X a case" - ask "How many units per case?"
  │           │     - "Depends on quantity" - ask "What's your price for [quantity]?"
  │           │     - "Let me check" + hold - wait up to 60 seconds
  │           │     - "Call back tomorrow" - log: no-price-today, schedule follow-up
  │           └── Confirm: "So [item] at $X per [unit] - do I have that right?"
  │                 Then: "Thank you, that's all I needed." End call. Log: success.
  │
  └── NO ANSWER / BUSY / FAILED
        └── Log result, schedule retry based on retry policy.
```

**Key design rules:**

- Keep the AI voice disclosure as the first utterance, before any pleasantries. This is legally required.
- Always confirm extracted data ("So $3.50 per pound - did I get that right?") before hanging up. Vendors give prices in casual formats that need structured capture.
- The LLM context window should include: chef name, business name, the specific ingredient and quantity of interest, acceptable substitutes, and any prior call history with this vendor.
- Use structured output extraction after the call ends (separate LLM pass) to parse the conversation transcript into: `{ available: boolean, price_per_unit: number | null, unit: string, notes: string }`.

---

### 5. Legal Compliance

**Disclosure requirements (federal - FCC 2024 ruling):**

All AI voice outbound calls must include AI disclosure within the first 30 seconds. The disclosure must be audible and clear. This is not optional and is a hard federal requirement as of February 2024.

**Recommended opening script:**

> "Hi, I'm an AI assistant calling on behalf of [Chef/Business Name]. This call may be recorded. I'm calling to check on ingredient availability and pricing - do you have a moment?"

This single sentence covers: AI disclosure, caller identity, recording consent notification, and purpose of call.

**Recording consent - state law map:**

12 states require all-party consent: California, Connecticut, Delaware, Florida, Illinois, Maryland, Massachusetts, Montana, Nevada, New Hampshire, Pennsylvania, and Washington.

The safest approach for a nationwide business: treat every call as a two-party consent call. The opening disclosure script above ("this call may be recorded") with the vendor continuing the call constitutes implied consent in most jurisdictions.

**TCPA considerations:**

TCPA applies to robocalls and auto-dialed calls. A supplier call made by a business to another business's landline or published business number is generally lower TCPA risk than consumer outbound calling. However, the AI-voice trigger in the FCC ruling applies regardless of B2B vs B2C. Prior express consent or an established business relationship reduces (but does not eliminate) liability.

**Risk summary:**

- B2B calls to known suppliers with established relationships: lower risk
- Cold calls to new vendors with no prior relationship: higher risk, document consent process
- Calling a vendor who has previously said "stop calling": zero tolerance, must flag as do-not-call immediately
- Penalty exposure: $500-$1,500 per violation, no cap

---

### 6. Pricing: Conversational AI vs Current TwiML Approach

| Component               | Current TwiML (Twilio)  | Full Conversational AI (Retell + ElevenLabs) |
| ----------------------- | ----------------------- | -------------------------------------------- |
| Telephony               | ~$0.014/min             | ~$0.01-$0.03/min                             |
| STT                     | Twilio built-in (basic) | ~$0.01-$0.02/min                             |
| LLM                     | None (static script)    | ~$0.01-$0.04/min                             |
| TTS                     | Twilio Polly/Basic      | ~$0.01-$0.03/min (ElevenLabs)                |
| Platform fee            | $0                      | $0.07/min (Retell)                           |
| **Total per minute**    | **~$0.014/min**         | **~$0.13-$0.25/min**                         |
| **30-second call cost** | **~$0.007**             | **~$0.065-$0.125**                           |
| **100 supplier calls**  | **~$0.70**              | **~$6.50-$12.50**                            |

**The conversational jump costs roughly 10x more per call.** For 100 supplier calls per week, that is roughly $25-$50/week vs $3/week. At current scale this is negligible. At 10,000 calls/week it becomes a real budget line.

**Value proposition of the upgrade:** eliminates the keypress limitation (vendors don't have to press 1 or 2), handles natural conversation flows, captures actual prices instead of just yes/no availability, handles IVR navigation and hold automatically.

---

## Gaps and Unknowns

1. **Hold detection reliability:** Retell AI claims hold detection with delay guards, but real-world reliability with diverse hold music (music vs silence vs beeps) is not documented in reviewed sources. Needs live testing.

2. **Vendor hostility edge cases:** No platform documentation covers what happens when a vendor actively disrupts the call (talking over the agent, playing music themselves, handing the phone to a coworker mid-call). Needs live testing.

3. **Price extraction accuracy:** The LLM-based transcript parsing for prices ("it's market price today, around 4 and a half a pound") requires a dedicated extraction prompt. No out-of-the-box solution exists - this is custom work.

4. **ElevenLabs + Retell integration latency:** Using ElevenLabs premium voices with Retell adds a TTS API hop. Combined latency may exceed the 600ms Retell advertises (which uses their default voices). Needs benchmarking.

5. **Dasha.ai off-script handling:** Reportedly better than LLM-only platforms for unscripted conversations, but pricing and API access are less transparent. Worth a direct evaluation.

---

## Recommendations

**Quick wins (immediate, no spec needed):**

1. Add the AI disclosure line to the existing TwiML script immediately. The FCC requirement applies to the current system too. One-line change to `app/api/calling/twiml/route.ts`.

2. Add a do-not-call flag to the `supplier_calls` table and surface it in the vendor call queue UI. Required for TCPA compliance.

**Needs a spec before building:**

3. Full conversational AI upgrade using Retell AI + ElevenLabs. This is the recommended path when ready to invest. The conversation design above can become the spec's behavioral spec. Retell's API is well-documented and compatible with the existing Next.js architecture.

4. Price extraction pipeline: a post-call LLM pass that takes the call transcript and extracts `{ available, price_per_unit, unit, notes }` into structured DB records. This is separate from the calling infrastructure and could be built independently.

**Needs discussion:**

5. Voice cloning: whether to use a cloned voice or a natural-sounding TTS voice (ElevenLabs has non-cloned voices that score very high on realism). Cloning requires 30+ minutes of clean audio from the developer, a 3-4 week training wait, and ongoing ElevenLabs subscription. The naturalness gain over a high-quality non-cloned voice may not justify the overhead.

6. Whether to build on Retell AI (managed platform, ongoing per-minute cost) vs self-hosting an open-source voice agent stack (Whisper for STT, local LLM, Coqui TTS). The self-hosted path is consistent with the project's no-cloud-services philosophy but adds significant infrastructure work.
