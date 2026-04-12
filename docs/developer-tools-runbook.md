# Developer Tools Runbook

## Purpose

`developer_tools` is an exception-only capability for chefs who need a custom outbound integration.

It exposes:

- `/settings/api-keys`
- `/settings/webhooks`
- `/settings/zapier`

It does not change the default chef product. It exists to support explicit integration requests without
reclassifying raw API keys or webhook management as standard settings.

## Default State

- Default: `off`
- Allowlist: empty unless there is an approved account-specific need
- Owner: platform admin enabling the flag

## Enablement Rule

Enable `developer_tools` only when all of the following are true:

1. A specific chef account needs a custom integration that cannot be handled by the normal
   integrations surface.
2. There is a named owner for the integration on the account side.
3. There is a documented reason for exposure.
4. There is a review date or sunset condition.

Do not enable it for curiosity, exploration, or as a default onboarding step.

## Approval Rule

Before enabling the flag, record:

- Chef account
- Business reason
- Requested integration target
- Account owner or operator
- Review date
- Sunset condition

If any of these are missing, keep the flag off.

## Enablement Steps

1. Confirm the account actually needs raw API keys or webhook management.
2. Open `/admin/flags`.
3. Enable `developer_tools` for the specific chef only.
4. Verify the routes open for that account:
   - `/settings/api-keys`
   - `/settings/webhooks`
   - `/settings/zapier`
5. Record the review date.

## Review And Sunset

Review enabled accounts at least quarterly.

Disable the flag when any of the following are true:

- The integration is no longer active.
- The account no longer has an owner for the integration.
- The workflow moved to a first-class built-in integration.
- The account cannot justify continued access.

## Audit Command

Use the dry-run audit before any review:

```bash
npm run audit:developer-tools
```

If a backfill is ever needed for legitimate active usage:

```bash
npm run backfill:developer-tools
```

## Observability

The developer-tools policy is monitored through the systems that already exist.

- Admin flag changes are audit logged as `developer_tools_enabled` and
  `developer_tools_disabled`.
- First use is logged once per tenant for each capability:
  - API key creation
  - Raw webhook creation
  - Zapier webhook subscription creation
- First-use signals land in chef activity with `developer_tools: true` and
  `first_use: true` in context.

## Policy Summary

`developer_tools` stays default-off, account-specific, and reversible.
