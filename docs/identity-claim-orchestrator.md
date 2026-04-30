# ChefFlow Identity Claim Orchestrator

This is the controlled runner for securing ChefFlow identity handles across external platforms and ChefFlow internal accounts. It automates only the parts that can be safely automated, then pauses at CAPTCHA, SMS, email, legal, payment, or platform-specific verification checkpoints.

## Inputs

Set these environment variables before execution:

```powershell
$env:CHEFFLOW_IDENTITY_EMAIL='operator@example.com'
$env:CHEFFLOW_IDENTITY_PASSWORD='replace-with-strong-password'
$env:CHEFFLOW_IDENTITY_PHONE='+15555550123'
$env:CHEFFLOW_IDENTITY_VAULT_KEY='replace-with-long-local-vault-key'
```

Generated credentials are encrypted at `system/identity-claims/vault.enc.json`. Do not commit that generated file.

## Commands

Plan every platform without opening browsers:

```powershell
npx tsx scripts/identity/claim-orchestrator.ts plan
```

Run claim-now, reserve-soon, and internal capture jobs:

```powershell
npx tsx scripts/identity/claim-orchestrator.ts run
```

Run only claim-now plus internal jobs:

```powershell
npx tsx scripts/identity/claim-orchestrator.ts run --claim-now-only
```

Resume a single platform after human verification:

```powershell
npx tsx scripts/identity/claim-orchestrator.ts resume --platform tiktok
```

Refresh the stored table:

```powershell
npx tsx scripts/identity/claim-orchestrator.ts report
```

## Human Checkpoint Format

When blocked, the runner prints:

```text
Platform: TikTok
Username: ChefFlowHQ
Status: Awaiting human verification
Action: Complete CAPTCHA and SMS verification
URL: https://www.tiktok.com/signup
Then run: npx tsx scripts/identity/claim-orchestrator.ts resume --platform tiktok
```

The action line is intentionally a single next step.

## Safety

- CAPTCHA and verification are never bypassed.
- Browser sessions are isolated per platform under `system/identity-claims/browser-sessions/`.
- Default concurrency is capped at 2.
- Default rate limit is 30 seconds between platform starts.
- Create-when-needed and infra/dev platforms are stored as deferred, not created.
- ChefFlow internal account credentials are captured, but database provisioning pauses until the exact internal role mapping is confirmed.

## Output

The report is stored at:

```text
system/identity-claims/identity-claim-report.md
```

Columns:

- Platform name
- Classification
- Final handle
- Status
- Verification status
- Credentials stored
- Notes
