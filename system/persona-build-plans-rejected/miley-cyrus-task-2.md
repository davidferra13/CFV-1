<!-- REJECTED: all 3 referenced files are missing -->
<!-- 2026-04-28T00:24:39.089Z -->

# Build Task: Mandatory Multi-Signature Approval:
**Source Persona:** miley-cyrus
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement a multi-signature approval workflow for gratuity framing messages, ensuring that before any message is sent, it requires approval from both the chef and the client. This will add an extra layer of transparency and ensure that the communication aligns with the preferences of both parties.

## Files to Modify
- `lib/integrations/social/platform-adapters/tiktok.ts` -- Add a function to handle multi-signature approval for sending messages.
- `lib/integrations/social/platform-adapters/x.ts` -- Similarly, add a function in this file to manage multi-signature approval before sending messages.

## Files to Create (if any)
- `lib/services/multiSignatureApprovalService.ts` -- This service will be responsible for handling the logic of getting approvals from both chef and client before proceeding with message sending. It will include functions like `awaitChefApproval()`, `awaitClientApproval()`, and `sendIfApproved()`.

## Implementation Notes
- Ensure that the multi-signature approval process does not introduce significant delays in the communication flow.
- Handle cases where one party is unavailable for approval by implementing a timeout mechanism or fallback strategy.
- Integrate seamlessly with existing message sending logic without disrupting current functionalities.

## Acceptance Criteria
1. The chef and client can no longer send messages without mutual approval.
2. A new "Approval Pending" status is introduced for messages awaiting both parties' signatures.
3. Messages are only sent once approved by both the chef and the client, with a proper audit trail of approvals.
4. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the multi-signature approval logic.

## DO NOT
- Modify other files not directly related to implementing the multi-signature approval workflow.
- Introduce any changes that could potentially break existing functionalities or alter the database schema.
- Add new npm dependencies as part of this specific task.