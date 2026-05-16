# Intensify: Communication Zone

## Run 2026-05-16

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
