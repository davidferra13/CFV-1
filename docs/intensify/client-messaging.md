# Intensify: client-messaging

## Run 2026-05-16 (#2, adjacent to sms-auto-triage)

STATUS: partially-mined
DEPTH: normal
YIELD_TREND: stable

SURFACED:

- cadence-scheduler.ts ALREADY implements 7 lifecycle-anchored emails (deposit_confirmed through event_day) with smart-skip, chef overrides, template interpolation
- Spec's 5 lifecycle texts are a SUBSET of existing 7-point cadence; wire as SMS channel variant, not parallel system
- Spec's engagement counter = COUNT query on existing cadence_schedule rows (no new table)
- clients.preferred_contact_method already exists (phone/email/text/instagram); passive update is 3-line write in pipeline.ts
- follow-up-actions.ts has post_event trigger with channel='sms' support; IS the post-event text
- scheduled_messages status='scheduled' IS the "chef reviews draft" approval pattern
- CIL-to-Communication Action Bridge terminates at signal emission, never dispatches to senders
- Rail sources read scheduled_messages but NOT cadence_schedule (invisible to chef surface)
- journey-orchestrator already triggers cadence scheduling (stable tether)
- pipeline.ts no_reply_after_24h timer = mechanism for channel-switch escalation

MOVES:

- rank 1: Add SMS channel variant to cadence-scheduler.processDueCadenceItems (HIGH, stable)
- rank 2: Wire CIL-to-Communication Action Bridge dispatch to channel-router (HIGH, stable)
- rank 3: Add cadence_schedule as rail source in rail-item-lifecycle (MED, stable)
- rank 4: Passive channel preference writer from communication_events reply histogram (MED, stable)

ACTED ON:

- rank 1: SMS channel variant in cadence-scheduler (BUILT 2026-05-16). Migration: 20260517000003_cadence_sms_channel.sql

SKIPPED:

- New cadence counter table: redundant with COUNT on cadence_schedule
- New client_channel_preferences table: redundant with clients.preferred_contact_method
- New messaging cadence module: 80% already in lib/communication/
- Daily cap enforcement: premature, no SMS cadence sending exists yet
- 48h unanswered escalation: premature, depends on rank 1
- Between-engagement silence rule: premature, needs rank 1 first
- sms-auto-triage wiring: already-saturated (covered in prior run)

CROSS_REFS:

- [[sms-auto-triage]]: SMS ingest/triage pipeline (prior run, same day)
- [[lifecycle]]: journey-orchestrator triggers cadence scheduling
- [[cil]]: signal-actions processDueCadenceItems on dormant/atRisk
- [[rail]]: sources/communication.ts reads scheduled_messages only
- [[clients]]: interaction-ledger tracks 11 sources; preferred_contact_method exists

NEXT TRIGGER: After rank 1 ships (SMS channel variant sends real texts). Unlocks cap enforcement, silence guards, escalation logic.
