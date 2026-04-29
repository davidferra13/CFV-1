---
name: ledger-safety
description: Protect ChefFlow ledger-first financial behavior. Use when work touches ledger entries, balances, payments, refunds, payouts, credits, invoices, event financial state, monetary calculations, or database changes that affect financial records.
---

# Ledger Safety

Use this skill before changing any money-moving or balance-related code.

## Workflow

1. Locate the real source of truth: ledger append code, ledger compute code, event FSM, server action, route, webhook, or UI surface.
2. Trace the full money path from user action or external event to persisted ledger entry to displayed balance.
3. Verify all amounts are integer cents and never floats, formatted dollars, or mixed units in storage.
4. Confirm balances are computed from immutable entries, not stored or patched directly.
5. Check tenant isolation on every query with `tenant_id` or `chef_id`, using authenticated user context.
6. For mutations, confirm input validation happens before DB work and cache invalidation happens after success.
7. Add or update focused tests when behavior changes, especially for idempotency, duplicate actions, refunds, reversals, and partial payments.

## Guardrails

- Never edit `types/database.ts`.
- Never add destructive migrations or mutate historical ledger rows.
- Never use destructive row removal, table truncation, object drops, column type changes, or balance rewrites without explicit developer approval.
- Never silently convert a load failure to `$0.00`, an empty ledger, or a successful balance.
- Use compensating ledger entries for corrections.
- Keep notification, email, activity log, and calendar side effects non-blocking with `try/catch`.
- Do not let AI generate recipes or food suggestions while working in related flows.

## Closeout

Run the narrowest useful checks for the touched path. Include ledger-specific evidence in the final response: files changed, validations run, any untested financial edge case, and whether unrelated dirty files were left alone.
