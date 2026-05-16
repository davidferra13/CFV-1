# Intensify: Communication Zone

## Run 2026-05-16 (original)

STATUS: fresh
DEPTH: deep
YIELD_TREND: stable

SURFACED:

- CIL actOnSignal() is no-op; signals exist for overdue-invoice, expired-quote, follow-up-needed but dispatch to nothing
- brand-voice.ts fully built (3 tone presets, greeting/signoff generators, forbidden-phrase lint) with zero importers
- Dual payment reminder paths: lib/invoices/reminder-actions.ts (raw pre body) vs lib/email/notifications.ts (proper React template)
- Dual push systems: lib/communication/push-notify.ts vs lib/notifications/channel-router.ts#deliverPush
- Dual follow-up engines: lib/communication/follow-up-actions.ts vs lib/follow-up/sequence-engine.ts
- cadence-trigger-handler.ts built but zero importers; deposit-actions.ts is natural trigger point
- PIE/pricing fully disconnected from communication (zero cross-domain edges)

ACTED ON:

- (none yet)

SKIPPED:

- Returning Client Recognition: net-new build, not intensification
- A/B test infra: extension, not intensification
- Provider status webhook: requires external integration design
- Playwright verification: testing infra, not structural wiring

NEXT TRIGGER: CIL bridge wired + brand-voice imported in 3+ templates -> partially-mined

---

## Deep-Pass Run 2026-05-16

STATUS: partially-mined
DEPTH: deep (3 Opus agents: calling system, SMS/text, AI boundary enforcement)

SURFACED:

- runPostCallActions (complete module, zero callers) never wired into call completion
- CIL has no signal source for call outcomes (vendor reliability data discarded)
- No agent.send_sms restriction (Remy blocked from email but not SMS)
- Notification channel-router fires SMS to clients from automated paths without chef review
- Client re-engagement cron auto-sends AI-personalized emails (worst boundary violation)
- Journey orchestrator stage notifications bypass consent framework
- Cadence scheduler auto-sends 7 milestone emails without per-message review
- Scheduled SMS messages stored but no dispatch worker exists (silent data loss)
- getSmartVendorQueue (vendor memory scoring) built but never used in session creation
- cost-tracker data captured but never surfaced in UI
- Keyword-extracted prices discarded when Ollama offline (not fed to vendor-memory)
- delivery-coordinator + EventCallDashboard complete but unmounted

LENSES_USED:

- TCPA Compliance Counsel: AI phone calls + auto-SMS = immediate legal exposure
- Twilio Platform Architect: dead wiring, cost visibility, vendor memory scoring
- AI Ethics Researcher: autonomous calls with late disclosure, auto-send bypassing stated policy
- Notification UX Designer: cadence auto-fire, preview windows, progressive trust
- Private Chef (End User): control vs automation, reputation risk from AI-sent messages

EXPERT_VALIDATION:

- agent.send_sms restriction: endorsed (all 5) - "SMS more intrusive than email; phone presence != consent"
- Re-engagement draft conversion: endorsed (all 5) - "AI-generated content auto-sent is textbook policy violation"
- runPostCallActions wiring: endorsed (Twilio, Chef) - "Post-call automation is 80% of calling ROI"
- CIL call signal source: endorsed (Ethics, UX, Twilio) - "Passive intelligence justifies AI system"
- Scheduled SMS worker: endorsed (Twilio) - "Accepted schedules that never fire = silent data loss"
- Cadence 30-min preview window: endorsed (UX) - "Gold standard: send unless cancelled"
- getSmartVendorQueue: endorsed (Twilio, Chef) - "Calling no-answer vendors first burns money"

EXPERT_ADDITIONS:

- AI disclosure at START of call (not end): several US states + FCC 2024 rule require it
- CommunicationGate middleware: unify agent (drafts) + cron (auto-sends) into one gate
- TCPA consent audit trail: timestamped consent records before automated SMS

REJECTED:

- Phone verification in onboarding: "Don't slow down signup. Phone is optional." (Chef, UX)
- Mount orphaned UI components: "Display is downstream of wiring. Wire first." (all)
- Ingredient lifecycle from call signals: "Low signal value for one vendor call." (Twilio)

ACTED ON:

- Added agent.send_sms to restricted-actions.ts (closes Remy SMS gap)
- Added origin field + automated client SMS suppression to channel-router.ts
- Converted client-reengagement cron from auto-send to draft-then-notify pattern

SKIPPED:

- Unifying old/new SMS ingest paths: consolidation, low yield, risk
- Cadence scheduler SMS channel: fix boundary gaps first before expanding automation

CROSS_REFS:

- [[lifecycle]]: journey-orchestrator stage notifications bypass consent framework
- [[calling]]: runPostCallActions + CIL signal source are highest-yield next moves
- [[notifications]]: CommunicationGate middleware would unify boundary enforcement

NEXT TRIGGER: CommunicationGate middleware implemented + runPostCallActions wired -> near-saturated

---

## Run 2026-05-16 (#3)

STATUS: near-saturated
DEPTH: normal
YIELD_TREND: declining

RESETS:

- brand-voice.ts zero importers: INVALID (now 5 importers, fully wired)

SURFACED:

- reminder-actions.ts orphan: lifecycle route used inline sendPaymentReminderEmail bypassing spam guard
- cadence-trigger-handler partially wired (deposit-actions only, trigger-engine dispatch table missing)
- lifecycle->communication is one-way (communication has no lifecycle-state awareness)

ACTED ON:

- Wired sendPaymentReminder into app/api/scheduled/lifecycle/route.ts (replaces inline sendPaymentReminderEmail, adds spam guard + invoice_sends recording)

SKIPPED:

- cadence-trigger-handler full wiring: blocked on trigger-engine dispatch table
- lifecycle-state awareness in communication: no callable utility exposes stage
- SMS auto-triage: premature (0/12 steps, net-new feature)
- CIL bridge: blocked on trigger-engine

NEXT TRIGGER: trigger-engine dispatch table built -> SATURATED until new communication module added or CIL phase 3 lands
