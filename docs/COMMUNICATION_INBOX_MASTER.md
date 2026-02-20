# Communication Inbox Master Document (ChefFlow)

## 1) Purpose
Build a communication-aware signal layer that helps the chef:
- Never miss inbound communication
- See what needs attention now
- Reduce dropped leads
- Improve close rate
- Keep full manual control

This is additive. It does not replace existing manual workflows.

---

## 2) Non-Negotiables
- Manual state changes always remain possible.
- Automation cannot gate or block lifecycle transitions.
- No auto-confirm/auto-cancel/auto-approve menu/auto-mark payments unless deterministic system event (e.g., webhook, explicit client confirmation).
- Automated suggestions are non-binding and reversible.
- All manual + automated actions are audit logged with:
  - `actor`
  - `timestamp`
  - `source` (`manual`, `webhook`, `automation`, `import`)
  - `previous_state`
  - `new_state`

---

## 3) Product Decision: One Page, Multi-Filter
## 3.1 Page Strategy
- Keep one primary inbox page for operations.
- Show both dimensions together:
  - Where message came from (source)
  - Where conversation stands (stage)

## 3.2 Why
- One working surface reduces context switching.
- Faster triage decisions.
- Prevents “split-brain” between source feed and follow-up feed.

---

## 4) Information Architecture (Single Inbox Surface)
## 4.1 Top Row: Quick Preset Tabs
- `Needs Attention`
- `Unlinked`
- `Snoozed`
- `Resolved`

These are presets, not separate systems. They should map to filter combinations.

## 4.2 Filter Bar (Combinable)
Required in V1:
1. `Source`
2. `Conversation Stage`
3. `Response Turn` (who is on the clock)
4. `Follow-up`

Optional in V2 (do not block V1):
1. `Priority` (`urgent`, `normal`, `low`)
2. `Assigned` (`me`, `unassigned`)

---

## 5) Full Filter Catalog
## 5.1 Required V1 Filters
### `Source`
- `chat`
- `message`
- `wix`
- `notification`
- `email`
- `website_form`
- `sms`
- `instagram`
- `takeachef`
- `manual_log`

### `Conversation Stage`
- `unlinked`
- `needs_attention`
- `snoozed`
- `resolved`

### `Response Turn`
- `chef_to_respond`
- `waiting_on_client`
- `no_action`

Rule:
- Latest inbound => `chef_to_respond`
- Latest outbound => `waiting_on_client`
- Snoozed/closed/resolved => `no_action`

### `Follow-up`
- `overdue`
- `due_soon`
- `none`

## 5.2 Optional V2 Filters (only after V1 proves stable)
### `Priority`
- `urgent`
- `normal`
- `low`

Deterministic derivation only (example signals):
- overdue timer
- explicit urgent keywords
- high-confidence booking intent

### `Assigned`
- `me`
- `unassigned`

---

## 6) Inbox Item Content
Each item should show:
- Sender identity / resolved client name
- Source
- Last activity timestamp
- Latest message preview
- Stage badge
- Response-turn badge
- Follow-up badge (if overdue/due soon)
- Link status (linked inquiry/event or unlinked)
- Suggestion count/confidence (if any)

---

## 7) One-Click Actions (Reversible)
Every item supports:
- Link to existing Inquiry
- Create new Inquiry
- Attach to Event
- Add internal note
- Snooze
- Mark resolved
- Reopen (reverse resolve)
- Unsnooze (reverse snooze)

All actions must be logged in communication action audit.

---

## 8) Canonical Data Model
Core entities:
- `CommunicationEvent`
- `ConversationThread`
- `SuggestedLink`
- `FollowUpTimer`

Supporting:
- `communication_action_log` (explicit action audit trail)
- `communication_classification_rules` (editable deterministic rules)

---

## 9) Pipeline Contract (Deterministic)
`Ingest -> Normalize -> Identity Resolve -> Thread Group -> Classify -> Suggest -> Surface`

Rules:
- No AI hallucination in triage decisions.
- Classification is rule-based and editable.
- Silence creates follow-up timers only.
- No implicit lifecycle mutation.

---

## 10) Response-Turn Logic (Critical)
Derived from latest event in thread:
- Latest `inbound` => chef owes response.
- Latest `outbound` => waiting on client.
- Thread `snoozed` or `closed`, or event `resolved` => no action.

This must be first-class in UI because it answers “who needs to respond next?”

---

## 11) UX Layout Recommendation
Single page layout:
1. Header: inbox title + count
2. Preset tab row
3. Filter chips row (multi-select)
4. Optional secondary row for sort (`newest`, `overdue first`, `highest confidence`)
5. Feed list of communication threads/events
6. Item action row (one-click controls)

No nested pages required for basic triage operation.

---

## 12) Operational Guardrails
- Keep existing `/inbox` behavior intact during rollout.
- Add triage features behind feature flag until validated.
- Zero coupling to event/inquiry lifecycle transitions except explicit user action.
- Deterministic external event writes only from verified integrations/webhooks.

---

## 13) Analytics / Visibility
Track at minimum:
- New inbound volume by source
- Unlinked backlog count + age
- `chef_to_respond` count
- Overdue follow-up count
- Time-to-first-response
- Suggestion accept/reject rates

---

## 14) V1 Scope Lock (Do Not Expand)
V1 includes only:
1. Source filter
2. Conversation stage filter
3. Response turn filter
4. Follow-up filter
5. Reversible one-click actions
6. Full audit logging

Everything else is deferred.

---

## 15) Acceptance Criteria
V1 is complete when:
1. Chef can identify both source and stage from one page.
2. Chef can instantly see who owes next response.
3. No existing manual workflow is removed or blocked.
4. No implicit lifecycle mutation occurs.
5. Every triage action is auditable with previous/new state.
6. Actions are reversible.

