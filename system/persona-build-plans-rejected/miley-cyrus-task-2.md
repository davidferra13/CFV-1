<!-- REJECTED: all 3 referenced files are missing -->
<!-- 2026-04-28T00:30:37.675Z -->

# Build Task: Mandatory Multi-Signature Approval:

**Source Persona:** miley-cyrus
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement a multi-signature approval workflow for gratuity framing drafts within the ChefFlow application. This will ensure that before sending any gratuity-related messages or requests, they are reviewed and approved by both the chef and another designated signatory.

## Files to Modify

- `lib/integrations/social/platform-adapters/x.ts` -- Add a function to handle multi-signature approval for gratuity framing drafts.
- `pages/api/integrations/social/callback/x.ts` -- Update the callback handler to check for multi-signature approval before proceeding with social platform integration.

## Files to Create (if any)

- `lib/utils/multiSignatureApproval.ts` -- Create a utility module to encapsulate the logic for checking and managing multi-signature approvals.

## Implementation Notes

- Use existing authentication mechanisms to verify the identities of the chef and designated signatory.
- Implement a secure, asynchronous approval workflow that does not block the main thread while waiting for approvals.
- Handle scenarios where one or both parties fail to approve within a reasonable time frame.

## Acceptance Criteria

1. A gratuity framing draft cannot be sent until it has been approved by both the chef and another designated signatory.
2. The multi-signature approval workflow does not block the main thread, allowing other parts of the application to continue functioning normally while approvals are pending.
3. If either the chef or designated signatory fails to approve within a specified time frame, an alert is sent, and the draft is flagged for follow-up.
4. `npx tsc --noEmit --skipLibCheck` passes without errors related to the newly added functionality.

## DO NOT

- Modify existing social platform integration code outside of the specified files.
- Add new npm dependencies or alter the project's external dependencies.
- Change any database schema or queries related to user data.
- Remove or modify existing functionality in the application unrelated to this gap.
