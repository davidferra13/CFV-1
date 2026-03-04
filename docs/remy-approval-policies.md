# Remy Approval Policies

Remy approval policy rules are stored in `remy_approval_policies` and resolved centrally before any physical action commit.

## Resolution order

1. System safety: `restricted` actions are always blocked.
2. Tenant override: enabled row for `task_type` can `block` or `require_approval`.
3. Default: non-restricted actions require approval.

## Integration points

- `runCommand(...)` loads tenant policy map once and applies it while building action previews.
- `approveTask(...)` re-checks policy before commit and logs final outcome.
- Every approved/blocked/error action path finalizes an audit row in `remy_action_audit_log`.

## Server actions

- `listRemyApprovalPolicies()`
- `upsertRemyApprovalPolicy(...)`
- `deleteRemyApprovalPolicy(taskType)`

These are tenant-scoped and use chef session context.
