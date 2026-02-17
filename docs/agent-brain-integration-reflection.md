# Agent Brain Integration — Reflection

**Date:** 2026-02-17
**Scope:** Consolidation of 40 operational documents into 7 structured agent-brain files

---

## What Changed

Created `docs/agent-brain/` directory with 8 files (index + 7 topic files) consolidating 40 operational documents from the CHEF_CORE_BRAIN archive into a structured intelligence layer for ChefFlow's AI correspondence engine.

### Files Created

| File | Consolidates From | Purpose |
|------|------------------|---------|
| `INDEX.md` | — | Master index, authority hierarchy, how docs relate to codebase |
| `01-BRAND_VOICE.md` | BRAND_VOICE_LIBRARY, CONVERSATION_DEPTH_TONE_RULES | David's voice, tone shifts, sign-offs, boundaries |
| `02-LIFECYCLE.md` | LIFECYCLE_STATE_CONTROLLER, REQUIRED_DATA_BY_LIFECYCLE_STATE | 11-state engagement lifecycle mapped to codebase FSMs |
| `03-EMAIL_RULES.md` | CLIENT_EMAIL_OUTPUT_FIREWALL, FINAL_OUTPUT_AUTHORITY, ChefFlow_PreDraft_Gatekeeper, EMAIL_STAGE_DECISION_MATRIX, CLIENT_STATUS_CONFIRMATION_SUMMARY_RULES, REQUIRED_DINNER_OUTPUTS | Firewall, gatekeeper, output authority, format rules |
| `04-PRICING.md` | PRICING_POLICIES_DEEP_REFERENCE, PRICING_TRIGGER_RULES, PRICING_PRESENTATION_RULES, PRICING_PERMISSION_RULES, PRICING_AND_SERVICES | Full rate card, trigger/permission/presentation rules |
| `05-DISCOVERY.md` | EARLY_MENU_INTENT_DISCOVERY, MENU-FIRST_CLIENT_DISCOVERY, CLIENT_DATA_REQUIREMENTS_BY_STAGE, SERVICE_TYPE_CLASSIFICATION_RULES | Menu-first philosophy, data collection by stage, service classification |
| `06-BOOKING_PAYMENT.md` | BOOKING_PAYMENT_EXECUTION_RULES, MASTER_BOOKING_AGREEMENT_AND_TOS | Booking execution, deposit rules, cancellation policy, legal terms |
| `07-EDGE_CASES.md` | GUEST_COUNT_AMBIGUITY_RULES, DATE_PRECISION_TRIGGER_RULES, REFERRAL_CONTEXT_HANDLING_RULES | Situational handling for common ambiguities |

### Documents Not Directly Integrated (Lower Priority)

| Document | Reason |
|----------|--------|
| CODE.docx | Old code reference for previous AI system |
| COMMAND_ GENERATE CANONICAL SYSTEM SPECIFICATION V1.docx | GPT prompt, not applicable to Next.js codebase |
| ChefFlow_Core_System_Spec.docx | 5-phase architecture for GPT workflow; codebase has its own architecture |
| ChefFlow_Master_Logic.docx | Reasoning patterns subsumed by lifecycle + email rules |
| MASTER_ADMIN_RULES_MANIFESTO.docx | Internal ops rules already reflected in CLAUDE.md |
| CLIENT_FACING_EMAIL_OUTPUT_FIREWALL.docx | Duplicate of the combined firewall doc, fully merged into 03-EMAIL_RULES.md |
| EMAIL_RENDER_TEMPLATES.docx | Template formats — will be integrated when building the email rendering system |
| Spreadsheets (6 files) | Real operational data — import separately into Supabase |

---

## What Was Improved

### 1. Lifecycle States Reconciled with Codebase
The original 12-state lifecycle was designed for a monolithic GPT workflow. The codebase uses three separate FSMs (inquiry, quote, event). The new `02-LIFECYCLE.md` maps each lifecycle state to the corresponding codebase state, creating a bridge between the conceptual engagement arc and the actual database states.

### 2. Deposit Changed from 30% to 50%
The original PRICING_POLICIES document listed 30% standard deposits. The MASTER_BOOKING_AGREEMENT and BOOKING_PAYMENT_EXECUTION_RULES both specify 50%. The legal document wins — standardized to 50% non-refundable.

### 3. Inquiry Arrival Cascade Defined
The original documents described what emails should say but not what the system should do automatically when an inquiry arrives. `05-DISCOVERY.md` now includes an 11-step automatic cascade (parse, classify, create record, create client profile, check calendar, score priority, surface to queue, draft response, tentative hold, notify chef).

### 4. Multi-Tenant Awareness Added
The original documents assumed a single-tenant GPT workflow. All references now account for ChefFlow's multi-tenant architecture where every query is tenant-scoped.

### 5. Codebase Features Referenced
The original documents had no awareness of the priority queue, preparable work engine, ledger-first financials, or real-time chat. The new documents reference these systems where relevant (e.g., pricing computation deferred to codebase's deterministic engine, not AI estimation).

### 6. Edge Cases Expanded
Added handling for: repeat clients, cannabis preference, budget mentions, platform inquiries, multiple inquiries from same client, ambiguous/invalid inquiries, and AI uncertainty defaults.

---

## What Still Needs to Be Built

These documents define the rules. The following codebase work is needed to make them operational:

1. **Wire into AI correspondence engine** — `lib/ai/correspondence.ts` needs to consume these docs as system prompt context, selecting relevant sections based on lifecycle state
2. **Auto-client creation** — Create client record from inquiry lead data (currently stored in `unknown_fields` JSON)
3. **Outbound Gmail send** — Gmail API write integration to send approved responses
4. **Notification system** — Alert chef when new inquiry arrives
5. **Tentative schedule holds** — Inquiry dates visible on calendar as potential
6. **Thread view** — Email conversation history linked by `gmail_thread_id`
7. **Follow-up automation** — Auto-schedule follow-ups, escalate when overdue
8. **Pricing computation engine** — Deterministic pricing calculation from rate card + holiday premiums + guest count

---

## How This Connects to the System

These documents sit between the Gmail sync pipeline (which captures emails) and the AI drafting engine (which generates responses). They are the intelligence layer — the rules that determine what gets said, what gets blocked, and how it sounds.

The flow: `Email → Parse → Classify → Determine State → Check Rules → Draft → Firewall → Chef Review → Send`

Without these rules, the AI is guessing. With them, it's enforcing David's actual business logic and voice.
