# Contracts & Legal System

## What Changed

Added a full contract template and e-signature workflow to ChefFlow, replacing the informal "cancellation policy field" with a proper legal layer.

## Why

Private chef businesses run on contractual relationships. Before this change, ChefFlow had no mechanism for:

- Chefs to define legal terms of service
- Clients to formally acknowledge and accept those terms
- An auditable record of what was agreed and when

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000003_contracts_system.sql`

Two new tables:

**`contract_templates`** — Chef-owned reusable templates with Markdown body. Supports `{{merge_fields}}` for dynamic values. One can be marked as default.

**`event_contracts`** — One per event. Stores:

- Rendered body snapshot (merge fields already substituted — immutable after signing)
- Status lifecycle: `draft → sent → viewed → signed | voided`
- Signature capture: base64 PNG data URL
- Audit trail: `signer_ip_address`, `signer_user_agent`, timestamps for each state change

A database trigger (`trg_event_contracts_immutable`) prevents any mutation of the body, signature, or timestamps after signing.

### Server Actions

**File:** `lib/contracts/actions.ts`

| Action                   | Who    | What                                                           |
| ------------------------ | ------ | -------------------------------------------------------------- |
| `createContractTemplate` | Chef   | Create a new template                                          |
| `updateContractTemplate` | Chef   | Edit template (increments version)                             |
| `listContractTemplates`  | Chef   | List all templates                                             |
| `deleteContractTemplate` | Chef   | Remove a template                                              |
| `generateEventContract`  | Chef   | Render template with event merge fields, create draft contract |
| `sendContractToClient`   | Chef   | Set status=sent, email client with signing link                |
| `recordClientView`       | Client | Set status=viewed on page load                                 |
| `signContract`           | Client | Capture signature, set status=signed                           |
| `voidContract`           | Chef   | Void unsigned contracts                                        |
| `getEventContract`       | Chef   | Get active contract for event                                  |
| `getClientEventContract` | Client | Get contract for client's event                                |

### Available Merge Fields

```
{{client_name}}         → client.full_name
{{event_date}}          → events.event_date (formatted)
{{quoted_price}}        → events.quoted_price_cents (formatted as $)
{{deposit_amount}}      → events.deposit_amount_cents (formatted as $)
{{cancellation_policy}} → events.cancellation_reason or default text
{{occasion}}            → events.occasion
{{guest_count}}         → events.guest_count
{{event_location}}      → address + city + state
```

### UI

- **`app/(chef)/settings/contracts/page.tsx`** — Template management. Chef creates/edits/deletes templates with a Markdown editor and merge field chips.
- **`components/contracts/contract-template-editor.tsx`** — Markdown editor with merge field helper buttons.
- **`components/contracts/send-contract-button.tsx`** — Placed on event detail page. Handles generate → send → void flow with status display.
- **`components/contracts/contract-status-badge.tsx`** — Color-coded badge for draft/sent/viewed/signed/voided.
- **`components/contracts/signature-pad.tsx`** — HTML5 canvas signature capture with mouse + touch support.
- **`app/(client)/my-events/[id]/contract/page.tsx`** — Client-facing signing page. Renders body, captures signature.
- **`app/(client)/my-events/[id]/contract/contract-signing-client.tsx`** — Interactive client component for signing.

### Email

**`lib/email/templates/contract-sent.tsx`** — Sent to client when contract is ready to sign. Includes a CTA button linking to the signing page.

## How It Connects to the System

The contract system is **parallel** to the event lifecycle — it does not block state transitions. A chef can confirm an event whether or not a contract is signed. This is intentional: the system records reality, not enforces a rigid workflow that could block legitimate operations.

**Integration point:** The `SendContractButton` component is meant to be embedded in the event detail page (`app/(chef)/events/[id]/page.tsx`) to surface contract status alongside event status.

## Security Model

- **RLS** ensures chefs can only access their own templates and contracts
- **Clients** can only read and sign their own contracts (where `client_id = get_current_client_id()`)
- **Signed contracts** are immutable: a database trigger prevents alteration of body, signature, or timestamps
- **Voiding**: A chef can void any unsigned contract but cannot delete or alter a signed one

## Fallback Behavior

If a chef has no templates configured, `generateEventContract()` automatically uses a built-in fallback template. This means the feature works out of the box without requiring settings configuration first.

## Future Considerations

- PDF export of signed contracts (via Puppeteer or @react-pdf/renderer)
- Counter-signature by chef
- Webhook/automation trigger: "when contract signed → proceed to event confirmation"
- DocuSign/HelloSign integration if legal robustness is required at scale
