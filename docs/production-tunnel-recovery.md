# Production tunnel outage: 2026-09-28

Status: **BLOCKED — production runtime recovery**, not a completed deployment.
Repository baseline: `e944ed554897ddb0d7686b38312c7e28083a3e71`.

## Observed live evidence

- At 19:40 UTC, GET `https://cheflowhq.com/` and
  `https://app.cheflowhq.com/` each returned HTTP 530, body `error code: 1033`.
  Cloudflare defines 1033 as no healthy connector available to receive traffic:
  https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/troubleshoot-tunnels/common-errors/
- Authenticated `cloudflared tunnel list` and `tunnel info` on the documented
  Windows host confirmed `chefflow-prod`, ID
  `9dab6929-68e3-4775-9b8e-17482f714e83`, has zero connections. The beta tunnel
  has connections; that does not establish production reachability.
- At 19:42 UTC, the Windows host's loopback ports 3000, 3100 and 3200 all failed
  `/api/health/ping`. Its `~/.cloudflared` contains `cert.pem`, but no credential
  JSON or `chefflow-prod.yml`. The canonical checkout has no `.next/BUILD_ID`;
  its saved PM2 dump has no ChefFlow/Cloudflare entries. These facts do not
  establish that every possible release directory or service on the host is absent.
- The existing certificate can retrieve the production connector token. This was
  tested with output captured only in process memory; no token was printed,
  saved, committed, rotated or used to start a connector. New owner credentials
  are **not** the current blocker.
- The Windows checkout is on `feat/capability-proof-loop-recovered-20260917`
  with substantial unrelated dirty work. Its in-flight queue directory was
  empty at inspection. This recovery uses an isolated branch from GitHub main.

## Repository findings and fixes

| Surface | Finding / change |
| --- | --- |
| `.cloudflared/config.yml` | Beta-only ingress to port 3200; preserved unchanged. |
| `.cloudflared/production.yml` | Added explicit apex and app ingress for the existing production tunnel, loopback 3100 per historical Windows mapping, and a final 404 catch-all. No other domains exposed. Not activated. |
| `scripts/deploy-prod.sh` | Legacy Docker/3200 path references an absent Dockerfile and previously claimed completion after localhost health, suggesting the beta tunnel. Now fails before service mutation if build inputs are missing and requires both public domains and their ping endpoints to pass. |
| `scripts/production-public-check.mjs` | Read-only, bounded external probe. Rejects redirects and invalid ping JSON; distinguishes 1033 from generic 530. Complements PR #5's origin-aware diagnostics. |
| `ecosystem.prod.config.cjs` | Historical Pi/3000 path; not retargeted without runtime evidence. |
| `docs/build-state.md` | Historical June production claim now clearly marked stale. |
| `.gitignore` | Tunnel JSON credentials and token files excluded from Git. |

## Smallest remaining external gate

Restore a **verified, known-good ChefFlow release runtime** on the documented
Windows origin, then restore its existing production connector. Do not point
the domains at the dirty development checkout or create a new tunnel/DNS record.
The current observations do not identify an intact, release-approved build to
restart. The GitHub release blockers remain independent of connector recovery.

Prepared resumption order:

1. Identify the existing production release/service and deployed revision on
   `DESKTOP-DKCONSS`; preserve the dirty canonical checkout. If no intact release
   exists, produce one through the normal release gates before public exposure.
2. Prove the chosen runtime at `http://127.0.0.1:3100/api/health/ping`, strict
   readiness, and `/api/build-version`. Historical port 3100 is a recovery
   candidate, not current proof. Resolve the conflicting deployment paths using
   that runtime evidence before activation.
3. Verify Cloudflare's per-host routing targets the intended existing tunnel.
   Public 1033 plus a disconnected named tunnel is strong diagnostic evidence,
   but this investigation did not read the authoritative DNS records. No DNS
   changes are authorized by this runbook.
4. Recover the existing connector credential through the working local account
   authorization into the host's protected secret storage. Match the tunnel's
   management mode: a remotely managed token uses dashboard ingress; a locally
   managed tunnel uses credential JSON plus the checked-in production config.
   Do not assume a token automatically applies local ingress. Never put a token
   in Git, a PR, a command log or an owner chat message.
5. Validate the local ingress if applicable, then restore only the owned
   production connector under its established supervisor. Preserve beta and
   unrelated connectors. Reuse the prior service definition if recoverable;
   don't blindly restart the generic Windows cloudflared service.
6. Require `node scripts/production-public-check.mjs` to pass externally. Also
   require strict readiness and expected deployed revision, the normal release
   gate and critical product smoke checks before calling the release healthy.
   Public reachability alone is not proof that a newly built revision deployed.

Validation commands for the prepared local ingress (do not start a connector):

```sh
cloudflared tunnel --config .cloudflared/production.yml ingress validate
cloudflared tunnel --config .cloudflared/production.yml ingress rule https://cheflowhq.com/
cloudflared tunnel --config .cloudflared/production.yml ingress rule https://app.cheflowhq.com/
cloudflared tunnel --config .cloudflared/production.yml ingress rule https://unrelated.invalid/
```

## Verification and limits

- Focused Node suite: 7/7 pass, including a behavioral test proving the legacy
  deploy refuses missing build inputs before calling Docker. Bash syntax and
  `git diff --check` pass.
- Installed Windows cloudflared validated the same ingress content: both public
  domains map to 3100; an unrelated host maps to 404. This used a temporary file,
  with no active configuration or service change.
- `npm run regression:firewall -- --no-restart --step-timeout-ms 10000
  --route-probe-limit 1 --route-probe-timeout-ms 3000` was attempted in the clean
  checkout. It failed: absent tsx/TypeScript dependencies, bounded wiring-audit
  timeout, and absent local runtime. This is not a full passing release gate.
- PRs #5 and #7 remain drafts. Existing separate work in #8–#12 covers test
  enumeration, notification boundaries, route policy and Studio navigation.
  None is merged or bypassed by this recovery. No dependency, auth or customer
  data changes are included.
- No build, deployment, DNS write, service restart or credential rotation was
  performed. The public outage must remain open until both domains pass.
