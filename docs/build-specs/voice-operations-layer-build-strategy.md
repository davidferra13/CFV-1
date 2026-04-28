# Voice Operations Layer Build Strategy

Date: 2026-04-28

## Executive Thesis

ChefFlow should not copy generic AI calling products by trying to pass as a human caller. The strategic target is a compliant voice operations layer that answers, qualifies, remembers, routes, and follows up for the chef without inventing facts or crossing the recipe boundary.

The market leaders have converged on the same pattern:

- Low-latency speech loop
- Natural turn-taking and interruption handling
- Strict call pathways
- Tool execution during the call
- Transcript, extraction, summary, QA, and outcome logging after every call
- Human handoff when confidence drops or policy boundaries are reached
- Simulation testing before production release
- Enterprise-grade observability, guardrails, and compliance

ChefFlow already has a foundation in `lib/calling/voice-agent-contract.ts`, `lib/calling/voice-helpers.ts`, `lib/calling/twilio-actions.ts`, `app/api/calling/gather/route.ts`, and `tests/unit/voice-agent-contract.test.ts`. The build is an expansion of that contract into a first-class front-office operator.

## Companies Studied

| Company | What To Learn | ChefFlow Translation |
| --- | --- | --- |
| Retell AI | Low-latency voice orchestration, turn-taking, human-quality phone flow | Optimize the call loop so callers can interrupt, correct themselves, and continue without robotic pauses |
| Bland AI | Pathway-based call design, enterprise call analytics, bulk call operations, guardrails | Model every call as a bounded workflow with explicit objectives, allowed actions, and failure exits |
| Vapi | Developer-first voice agent infrastructure, swappable STT, LLM, TTS, telephony, and tools | Keep provider integration modular so ChefFlow can test voice stacks without rewriting business logic |
| ElevenLabs | Realistic voice synthesis, low-latency voice agents, voice quality controls | Use high-quality voices where permitted, but always disclose AI identity and avoid deceptive human mimicry |
| PolyAI | Enterprise voice CX, branded agents, multilingual support, containment metrics | Treat voice as a production support channel with CSAT, containment, handoff, and resolution metrics |
| Sierra | Outcome-oriented customer service agents with strong governance | Give the voice layer clear success states: inquiry created, task created, callback routed, vendor answer captured |
| Parloa | Voice agent lifecycle management, simulation, evaluations, compliance | Add pre-release call simulations and regression tests for chaotic chef workflows |
| Cognigy | Contact-center integrations, multilingual voice agents, enterprise observability | Connect voice outcomes to existing ChefFlow CRM, events, tasks, inquiries, and notifications |
| Kore.ai | Human-like service agents with interruption handling and autonomous task execution | Allow safe operational actions only when backed by real ChefFlow data and reversible workflow rules |
| Google Duplex | Narrowly scoped real-world calling with very natural phone behavior | Keep high automation narrow and useful. Do not let the agent wander into broad concierge behavior |

## Non-Negotiable ChefFlow Boundaries

The voice layer must preserve the project rules already encoded in `VOICE_AGENT_CONTRACT`.

- The assistant must disclose that it is an AI assistant.
- The assistant must disclose recording or transcription when applicable.
- The assistant must honor opt-out requests.
- The assistant must never pretend to be human.
- The assistant must never generate recipes, menu ideas, dish ideas, or chef creative IP.
- The assistant must never invent prices, availability, confirmations, policies, or financial numbers.
- The assistant must never collect payment card details by voice.
- The assistant must never bypass tenant scoping or trust tenant IDs from callers.
- The assistant must hand off allergy, medical, legal, refund, dispute, pricing, and custom menu topics.

## Product Positioning

ChefFlow Voice Operations is the chef's front-office operator.

It should handle:

- Inbound booking intake
- Missed-call capture
- Vendor availability calls
- Vendor delivery confirmation
- Venue logistics confirmation
- Client callback triage
- Event detail collection
- Follow-up task creation
- Linked inquiry creation
- Call summary and transcript storage
- Chef notification and live alert routing

It should not handle:

- Recipe creation
- Menu invention
- Binding quotes
- Final availability confirmation unless backed by deterministic data and explicit chef policy
- Payment collection by voice
- Sensitive disputes without human handoff
- Broad open-ended personal assistant behavior

## Architecture Pattern To Adopt

### 1. Voice Loop

Goal: conversational responsiveness close enough that the caller does not experience a legacy IVR.

Required capabilities:

- Streaming speech-to-text
- Fast deterministic classification before model calls
- Streaming text-to-speech where supported
- Interruption handling
- Barge-in support
- Short answers optimized for phone pacing
- Silence, hesitation, and unclear-audio recovery

Build implication: the business contract must stay provider-agnostic. Twilio, Vapi, Retell, Bland, ElevenLabs, or another voice stack should plug into ChefFlow call decisions without owning ChefFlow policy.

### 2. Pathways

Every call must have an explicit pathway.

Initial pathways:

- `inbound_booking_intake`
- `inbound_vendor_callback`
- `inbound_unknown_message`
- `vendor_availability`
- `vendor_delivery`
- `venue_confirmation`
- `client_follow_up`
- `opt_out`
- `human_handoff`

Each pathway needs:

- Entry condition
- Allowed questions
- Allowed actions
- Required disclosures
- Data extraction schema
- Handoff triggers
- Success condition
- Failure condition
- Cache and notification effects

### 3. Tool Execution

Voice tools should only execute actions that are safe, scoped, and auditable.

Allowed early tools:

- Create inbound inquiry from call
- Update existing call record
- Create chef task
- Create quick note
- Link call to inquiry, event, vendor, venue, or client
- Send chef alert
- Mark number as AI call opt-out
- Store transcript and extracted fields

Later tools:

- Check deterministic calendar availability
- Confirm vendor delivery window
- Draft follow-up SMS or email for chef approval
- Queue quote-prep task
- Queue dietary review task
- Queue event logistics review task

Blocked tools:

- Create recipe
- Update recipe
- Add ingredients to recipe
- Generate menu
- Send binding quote
- Charge payment method
- Confirm event without deterministic availability and chef policy
- Delete records

### 4. Memory And Audit Trail

Every call should produce a durable record:

- Call direction
- Caller phone
- Caller label
- Role and pathway
- AI disclosure timestamp
- Recording disclosure timestamp
- Opt-out status
- Transcript
- Structured extraction
- Voice-agent decision
- Confidence
- Handoff reason
- Action log
- Linked inquiry, event, vendor, venue, client, or task IDs
- Chef notification result
- QA flags

No displayed number or claim should come from the model alone. Financial values, dates, event statuses, and availability must come from database-backed records or deterministic calculations.

### 5. Handoff Model

Handoff is a first-class success state, not a failure.

Immediate handoff triggers:

- Caller asks for a human, chef, manager, or callback
- Pricing or quote request
- Allergy, medical, dietary safety, or cross-contact issue
- Refund, chargeback, or payment dispute
- Legal or contract concern
- Recipe, menu invention, or creative culinary request
- Caller anger or repeated confusion
- Unknown request after two recovery attempts
- Low confidence in caller intent or extracted data

Handoff output:

- Short summary
- Exact caller ask
- Extracted facts
- Missing facts
- Risk flags
- Recommended next action
- Link to call transcript

### 6. Evaluation And Simulation

Before any production rollout, create a deterministic simulation suite.

Required scenarios:

- Calm booking inquiry
- Caller interrupts the assistant mid-sentence
- Caller changes date after giving details
- Caller asks for a price
- Caller asks for recipe or menu ideas
- Caller discloses a severe allergy
- Caller says stop calling
- Vendor gives partial availability
- Vendor gives price in dollars and units
- Venue confirms with a constraint
- Caller asks whether the assistant is human
- Caller gives unusable audio
- Caller is angry and demands a person
- Caller provides conflicting details
- Caller calls from a number already linked to a client

Each simulation should assert:

- Correct disclosure
- Correct pathway
- Correct allowed or blocked action
- Correct handoff trigger
- No invented facts
- No recipe generation
- Tenant scoping preserved
- Follow-up task created when needed
- Transcript and extracted fields persisted

### 7. Metrics Dashboard

Track the same quality signals the market leaders optimize.

Core metrics:

- Average response latency
- Turn interruption recovery rate
- Containment rate by pathway
- Handoff rate by pathway
- Opt-out rate
- Successful extraction rate
- Missing-field rate
- Caller correction rate
- Repeat-call rate
- Vendor answer capture rate
- Inquiry creation rate
- Task completion after voice handoff
- Chef response time after handoff
- QA failure rate

Never optimize for containment alone. A low handoff rate can mean the assistant is overreaching.

## Build Sequence

### Build 1: Voice Operations Policy And Pathway Registry

Create a canonical pathway registry beside the existing voice-agent contract.

Deliverables:

- `lib/calling/voice-pathways.ts`
- Strongly typed pathway definitions
- Required disclosure metadata
- Allowed action list per pathway
- Handoff trigger list per pathway
- Tests proving restricted actions stay blocked

Acceptance:

- Every voice role maps to exactly one default pathway.
- Unknown pathways fail closed.
- Recipe, pricing, payment, and safety concerns hand off.

### Build 2: Structured Call Outcome Contract

Normalize the post-call object used by call logs, alerts, tasks, and inquiries.

Deliverables:

- Shared `VoiceCallOutcome` type
- Extraction schema for caller, event, vendor, venue, and risk fields
- Decision confidence and QA flags
- Tests for invalid and partial extraction

Acceptance:

- UI reads structured outcomes separately from transcript text.
- Missing data is represented as missing, not empty truth.
- Failed extraction creates a review state, not a fake clean summary.

### Build 3: First-Class Handoff Work Queue

Turn handoff into an operational queue.

Deliverables:

- Handoff task creation helper
- Chef alert payload
- Call-sheet inbox integration
- Quick note linkage
- Inquiry linkage when booking intent is detected

Acceptance:

- Every handoff has a next action.
- The chef can open the linked object from the alert.
- No handoff is buried only in transcript text.

### Build 4: Voice Simulation Harness

Build deterministic tests for the scenarios listed above.

Deliverables:

- `tests/unit/voice-agent-simulation.test.ts`
- Fixture-based caller transcripts
- Assertions for policy, extraction, and side effects

Acceptance:

- Pricing request never returns a quote.
- Recipe request never creates or drafts recipe content.
- Opt-out blocks future AI assistant calls to the number.
- Allergy request marks urgent chef review.

### Build 5: Provider Abstraction Layer

Separate ChefFlow call policy from telephony and voice vendors.

Deliverables:

- `lib/calling/provider-contract.ts`
- Adapter interface for Twilio-first implementation
- Capability flags: streaming, barge-in, voice choice, recording, transcript, outbound batch
- Provider-neutral event log

Acceptance:

- Business logic does not import provider SDKs directly.
- Provider can be swapped in tests without changing pathway logic.
- Unsupported provider capabilities fail gracefully.

### Build 6: Low-Latency Conversation Upgrade

Improve the real-time feel after the policy foundation is safe.

Deliverables:

- Short phone-optimized response templates
- Interruption handling contract
- Silence recovery rules
- Latency measurement on each turn
- QA flag when latency crosses threshold

Acceptance:

- Each turn records latency.
- Slow calls are visible in the dashboard.
- The assistant stops talking when interrupted where provider supports it.

### Build 7: Voice QA Dashboard

Give chefs and operators visibility into call performance.

Deliverables:

- Calls dashboard panel
- Handoff queue summary
- Pathway outcome stats
- QA flags
- Transcript review
- Opt-out list

Acceptance:

- Chef can see what happened without listening to the entire recording.
- Risk calls are surfaced first.
- Failed extraction and low-confidence calls are not hidden.

### Build 8: Controlled Outbound Expansion

Only after inbound and vendor workflows are stable, expand outbound use cases.

Allowed expansion:

- Vendor availability
- Vendor delivery
- Venue logistics
- Client reminder with consent
- Client callback only from explicit chef action

Still blocked:

- Cold outbound client sales
- Undisclosed AI calls
- Automated quote negotiation
- Recipe or menu pitching
- Payment collection

Acceptance:

- Outbound requires feature flag and consent policy.
- AI identity disclosure is first-turn behavior.
- Opt-out is honored globally for AI assistant calls.

## Data Model Needs

Prefer additive migrations only, and show SQL before writing any migration.

Likely additive fields or tables:

- `voice_pathway`
- `voice_agent_decision`
- `voice_agent_confidence`
- `voice_handoff_reason`
- `voice_qa_flags`
- `voice_latency_ms`
- `voice_disclosure_events`
- `voice_call_outcomes`
- `voice_call_opt_outs`
- `voice_simulation_results`

Do not store balances or derived financial facts from calls. Store raw call facts and compute financial meaning from existing ledger and quote systems.

## Compliance Notes

The U.S. regulatory posture treats AI-generated voice calls as artificial or prerecorded voice calls under TCPA-related rules. ChefFlow should assume AI voice calls require clear consent, identification, disclosure, and opt-out behavior. The product should not optimize toward fooling people into thinking a caller is human.

Product rule:

- Sound natural.
- Act useful.
- Disclose clearly.
- Never deceive.

## Source References

- Retell AI: https://www.retellai.com/
- Bland AI: https://www.bland.ai/
- Vapi: https://vapi.ai/
- ElevenLabs voice agents: https://elevenlabs.io/voice-agents
- PolyAI: https://poly.ai/en
- Sierra Voice: https://sierra.ai/voice
- Parloa voice agents: https://www.parloa.com/landing-page/ai-voice-agents-scale/
- Cognigy Voice AI Agents: https://www.cognigy.com/platform/conversational-ivr
- Kore.ai Voice AI Agents: https://www.kore.ai/ai-for-service/voice-ai-agents
- Google Duplex reporting: https://www.cnbc.com/2018/06/26/google-duplex-preview-i-answered-the-phone-when-googles-ai-called.html
- PLOS One voice clone realism study: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0332692
- FCC AI voice call ruling: https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf

## Final Build Principle

The winning version of this product is not a fake human. It is a disciplined operator that answers faster than a human, remembers better than a human, escalates more reliably than a human, and never fabricates the chef's reality.
