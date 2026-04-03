# Spec: Self-Hosted Deployment Standard

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event            | Date             | Agent/Session | Commit |
| ---------------- | ---------------- | ------------- | ------ |
| Created          | 2026-04-02 00:00 | Codex session |        |
| Status: ready    | 2026-04-02 00:00 | Codex session |        |
| Research refined | 2026-04-02 00:00 | Codex session |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

The public site cannot keep going down just because the developer is actively working and the local server is unavailable. The deployment path must be fully self-hosted. No third-party hosting platforms are acceptable. The next step must be a spec only, with no code changes, no build, and no deployment activity during planning.

### Developer Intent

- **Core goal:** move ChefFlow to a deployment model where the public app is always served from infrastructure the developer controls, independent of the local dev workstation.
- **Key constraints:** self-hosted only; do not rely on public traffic reaching the developer workstation; do not touch application code while planning; do not expand this spec into a full infrastructure rewrite of every outside dependency.
- **Motivation:** the current public path is operationally fragile and has already failed when the local production process was not running.
- **Success from the developer's perspective:** there is one clear self-hosted deployment standard, with a dedicated always-on production machine, a defined deploy flow, rollback, and health checks.

---

## What This Does (Plain English)

After this is built, ChefFlow's public website will run from a dedicated self-hosted production machine instead of depending on the developer workstation. Local development remains on the workstation, but public traffic goes to an always-on server with a real reverse proxy, managed process, release directories, health checks, and rollback. If the developer stops the dev server or shuts down the workstation, the public site stays up.

---

## Why It Matters

The repo already documents the failure mode: the public domain became unreachable when the local production process was not running. This spec fixes the actual problem by separating development from public serving and by defining one self-hosted production standard that does not depend on ad hoc local uptime.

---

## Research and Evidence

### Verified Local Evidence

- Current dev server is `next dev -p 3100`: [package.json:6](c:/Users/david/Documents/CFv1/package.json#L6)
- Current production start is `next start -p 3000`: [package.json:15](c:/Users/david/Documents/CFv1/package.json#L15), [package.json:16](c:/Users/david/Documents/CFv1/package.json#L16)
- Current framework version is `next ^14.2.18`: [package.json:249](c:/Users/david/Documents/CFv1/package.json#L249)
- Repo still includes beta tunnel helpers: [package.json:135](c:/Users/david/Documents/CFv1/package.json#L135), [package.json:136](c:/Users/david/Documents/CFv1/package.json#L136), [package.json:137](c:/Users/david/Documents/CFv1/package.json#L137)
- Checked-in tunnel config routes `beta.cheflowhq.com` to `localhost:3100`: [.cloudflared/config.yml:20](c:/Users/david/Documents/CFv1/.cloudflared/config.yml#L20)
- Repo still includes a legacy PM2 beta config with memory restart and autorestart behavior: [ecosystem.config.cjs:6](c:/Users/david/Documents/CFv1/ecosystem.config.cjs#L6), [ecosystem.config.cjs:13](c:/Users/david/Documents/CFv1/ecosystem.config.cjs#L13), [ecosystem.config.cjs:18](c:/Users/david/Documents/CFv1/ecosystem.config.cjs#L18)
- Current-state docs still describe public exposure through tunnel-based local serving: [docs/architecture/current-state.md:113](c:/Users/david/Documents/CFv1/docs/architecture/current-state.md#L113)
- The March 31, 2026 verification report records the real outage:
  - `localhost:3000` not running: [docs/verification-report-2026-03-31.md:42](c:/Users/david/Documents/CFv1/docs/verification-report-2026-03-31.md#L42)
  - public domain unreachable: [docs/verification-report-2026-03-31.md:43](c:/Users/david/Documents/CFv1/docs/verification-report-2026-03-31.md#L43)
- The app requires a real server runtime:
  - auth layer: [lib/auth/auth-config.ts:12](c:/Users/david/Documents/CFv1/lib/auth/auth-config.ts#L12)
  - Node runtime SSE route: [app/api/realtime/[channel]/route.ts:9](c:/Users/david/Documents/CFv1/app/api/realtime/%5Bchannel%5D/route.ts#L9)
  - realtime stream: [app/api/realtime/[channel]/route.ts:91](c:/Users/david/Documents/CFv1/app/api/realtime/%5Bchannel%5D/route.ts#L91)
  - streaming AI route: [app/api/remy/stream/route.ts:318](c:/Users/david/Documents/CFv1/app/api/remy/stream/route.ts#L318)
- Production env guidance already treats local Ollama as non-production and expects graceful degradation when it is absent: [docs/environment-variables.md:42](c:/Users/david/Documents/CFv1/docs/environment-variables.md#L42), [docs/environment-variables.md:47](c:/Users/david/Documents/CFv1/docs/environment-variables.md#L47)
- Local env examples still describe AI features as running on local Ollama by default: [.env.local.example:93](c:/Users/david/Documents/CFv1/.env.local.example#L93), [.env.local.example:104](c:/Users/david/Documents/CFv1/.env.local.example#L104)

### Verified External Evidence

- Next.js version-14 deployment guidance for App Router confirms that `next start` supports all features when self-hosted, distinguishes build-time vs runtime env, documents self-hosted cache behavior, and explains build-ID/version-skew concerns.
  - https://nextjs.org/docs/14/app/building-your-application/deploying
  - https://nextjs.org/docs/14/app/building-your-application/configuring/environment-variables
- Next.js version-14 output tracing can produce a minimal `.next/standalone` runtime, but `public/` and `.next/static/` still need to be copied if that mode is adopted.
  - https://nextjs.org/docs/14/app/api-reference/next-config-js/output
- Next.js `generateBuildId` is documented for version 14, and `deploymentId` was stabilized in `v14.1.4`, which keeps the version-skew recommendation compatible with this repo's current major version.
  - https://nextjs.org/docs/14/pages/api-reference/next-config-js/generateBuildId
  - https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId
- Cloudflare Quick Tunnels are intended for testing and development only.
  - https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/
- Caddy's `reverse_proxy` supports active/passive health checks and streaming controls, and Caddy's automatic HTTPS handles certificate provisioning, renewal, and HTTP->HTTPS redirects with built-in defaults.
  - https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
  - https://caddyserver.com/docs/automatic-https
- Nginx documents that disabling proxy buffering passes the upstream response to the client immediately, and `X-Accel-Buffering` can also control that behavior.
  - https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- systemd credentials are the official secure alternative to passing sensitive material through environment variables; they are exposed via `LoadCredential=` and `$CREDENTIALS_DIRECTORY`.
  - https://systemd.io/CREDENTIALS/
- PM2 remains a common self-hosted Node workflow and officially supports memory-based restarts, ecosystem files, and boot persistence.
  - https://pm2.keymetrics.io/docs/usage/restart-strategies/
  - https://pm2.keymetrics.io/docs/usage/startup/
  - https://pm2.keymetrics.io/docs/usage/application-declaration/
- Coolify represents the current self-hosted PaaS pattern: preview deployments with scoped env variables are supported, but Docker deployments can accidentally expose ports unless they are explicitly bound to loopback.
  - https://coolify.io/docs/applications/ci-cd/github/preview-deploy
  - https://coolify.io/docs/knowledge-base/environment-variables
  - https://coolify.io/docs/knowledge-base/docker/compose
- CapRover represents the current self-hosted PaaS-with-rollbacks pattern: CLI/webhook deploys, one-click rollback, and zero-downtime deploys depend on health checks and start-first behavior, with caveats for apps using persistent volumes.
  - https://caprover.com/docs/deployment-methods.html
  - https://caprover.com/docs/zero-downtime.html
  - https://caprover.com/docs/service-update-override.html

### Unverified but Relevant

- The exact current DNS records for the production domain were not inspected in this spec-writing session.
- The exact hardware that will be used for the dedicated production node is not yet chosen.
- The full list of remaining non-hosting outside dependencies is documented, but replacing them is intentionally deferred to a later sovereignty spec.

---

## Decision Summary

### Final Decision

ChefFlow will adopt a **dedicated self-hosted production node** as the single public origin for the application.

### Mandatory Outcomes

1. The developer workstation is never the public production host.
2. Local development remains on port `3100` and is development-only.
3. Public production runs on a dedicated machine the developer controls.
4. Public ingress terminates on a self-hosted reverse proxy on that production machine.
5. Deployments use immutable release directories plus rollback.
6. Tunnel-based local exposure is removed from the public production path.

### Explicit Non-Decisions

- This spec does not replace every outside runtime dependency.
- This spec does not redesign application code.
- This spec does not mandate containers if native Node is simpler and safer.

---

## Current Self-Hosted Workflow Patterns

Current primary-source documentation shows three real patterns developers use to solve this problem today:

1. **Bare-metal Node.js service**
   - reverse proxy in front of `next start`
   - `systemd` or PM2 for restart-at-boot and crash recovery
   - manual or scripted SSH-based deploys
   - common breakpoints: proxy buffering breaks SSE, env/secrets handling is ad hoc, rollback is missing or slow
2. **Self-hosted PaaS on top of containers**
   - Git/webhook deploys into Docker-managed workloads
   - preview environments and scoped env vars are easier
   - common breakpoints: extra control-plane complexity, accidental host-port exposure, volume semantics affecting zero-downtime rollout behavior
3. **Artifact/image deployment**
   - build once into an immutable artifact or image
   - promote the same artifact across environments
   - common breakpoints: build-time config gets frozen incorrectly, static assets are omitted in standalone packaging, release metadata is inconsistent

This spec chooses **pattern 1** for phase 1 because it is the smallest reliable step away from workstation-hosted public traffic while staying inside a fully self-hosted policy.

---

## Target Architecture

### Topology

```text
Developer workstation
  - Source editing
  - Local dev server on :3100
  - Optional local test runs
  - Never serves public production traffic

Dedicated production node
  - Linux x86_64 host
  - Reverse proxy on :80/:443
  - ChefFlow Node.js app bound to loopback
  - systemd-managed app service
  - Release directories + current symlink
  - Health checks + rollback

Optional staging service
  - Same host or second host
  - Separate loopback port, env file, and systemd unit
  - Only if a stable non-production URL is genuinely required
```

### Hosting Mode

- **Recommended runtime:** native Node.js plus `systemd`
- **Recommended reverse proxy:** Caddy
- **Alternative reverse proxy:** Nginx
- **Deployment pattern:** immutable releases under `/srv/chefflow/releases/<timestamp>-<sha>/`
- **Live pointer:** `/srv/chefflow/current`
- **Shared state path:** `/srv/chefflow/shared/`
- **Optional future optimization:** Next.js standalone runtime artifact, after the initial cutover is stable

### Why Native Node First

This repo already has a working Node.js runtime model (`next build`, `next start`) and a legacy PM2 process definition. The research pass shows that teams commonly solve this class of problem either with bare-metal Node plus a reverse proxy or by introducing a self-hosted container control plane. For ChefFlow phase 1, native Node plus `systemd` is the correct choice because it removes the workstation dependency without also introducing Docker lifecycle, image registries, container networking, and a second control plane.

### Why Caddy First

Caddy is preferred because it gives ChefFlow the smallest reliable reverse-proxy surface:

- automatic HTTPS, certificate renewal, and HTTP->HTTPS redirect behavior are built in
- reverse-proxy health checks and streaming controls are first-class
- it reduces the amount of hand-configured TLS and buffering behavior required for a single-node deployment

Nginx remains acceptable, but only if the implementation explicitly disables response buffering for streaming/SSE paths and verifies end-to-end chunked delivery during rollout.

### Alternatives Considered

| Pattern                                    | Status             | Why It Was Not Chosen For Phase 1                                                                                                |
| ------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Native Node + PM2 + reverse proxy          | secondary fallback | Valid and already hinted at by the repo, but duplicates service-management concerns that `systemd` already solves on Linux hosts |
| Self-hosted PaaS (Coolify/CapRover)        | deferred           | Real workflow, but adds Docker/control-plane complexity before the core workstation-dependency problem is solved                 |
| Standalone artifact/image deployment first | deferred           | Useful optimization later, but not necessary before the first stable self-hosted cutover                                         |

### Known Operational Gaps Before Full Sovereignty

Self-hosted web serving and self-hosted feature execution are not identical in this repo:

- the public web app can be moved to a dedicated host now
- local Ollama-backed AI behavior is currently documented as non-production and may degrade gracefully when absent
- if AI-backed endpoints must be fully available in production later, they need their own controlled model-serving plan on infrastructure you operate

This is why the production-hosting migration is phase 1, while model-host and broader dependency sovereignty stay in follow-up scope.

---

## Files to Create

_List every NEW file with its full path and a one-line description._

| File                                     | Purpose                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `ops/caddy/Caddyfile`                    | Reverse proxy config for production TLS termination and upstream proxy  |
| `ops/systemd/chefflow-prod.service`      | systemd unit for the production ChefFlow app process                    |
| `ops/systemd/chefflow-prod.env.example`  | Example environment file layout for the production app service          |
| `scripts/package-release.ps1`            | Workstation-side script to package an exact release payload             |
| `scripts/deploy-self-hosted.ps1`         | Workstation-side deployment entrypoint over SSH to the production host  |
| `scripts/rollback-self-hosted.ps1`       | Workstation-side rollback trigger                                       |
| `scripts/server/install-release.sh`      | Server-side release installer that unpacks, installs, builds, and links |
| `scripts/server/activate-release.sh`     | Server-side cutover script that flips `current` and restarts service    |
| `scripts/server/rollback-release.sh`     | Server-side rollback script to the previous good release                |
| `docs/runbooks/self-hosted-ops.md`       | Operations runbook for deploy, rollback, restart, and recovery          |
| `docs/runbooks/self-hosted-bootstrap.md` | First-time host provisioning checklist                                  |

---

## Files to Modify

_List every EXISTING file that needs changes. Be specific about what changes._

| File                                    | What to Change                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/environment-variables.md`         | Split environment guidance into local vs dedicated self-hosted production and optional staging     |
| `README.md`                             | Replace ambiguous local/public serving language with the new self-hosted topology summary          |
| `CLAUDE.md`                             | Update deployment references so future guidance matches the self-hosted production standard        |
| `docs/beta-server-setup.md`             | Rewrite or supersede the tunnel-era beta guidance once the new staging decision is implemented     |
| `docs/architecture/current-state.md`    | Add a note that tunnel-based local-origin public serving is legacy and being replaced              |
| `docs/architecture/unification-plan.md` | Align the target deployment model with a dedicated production node rather than workstation serving |

---

## Database Changes

None.

---

## Data Model

This is an infrastructure spec. No application database schema changes are required.

Operational entities introduced by this spec:

- **Production host:** the always-on self-hosted machine serving public traffic
- **Release directory:** immutable deployment artifact unpacked to a timestamped directory
- **Current symlink:** points the app service to the active release
- **Shared directory:** persistent path for env files, uploads if needed, and ops metadata
- **Health contract:** loopback and public checks that must pass before a release is considered live
- **Release metadata:** release-scoped commit/build/deployment identifiers written during packaging and install
- **Credential source:** host-managed secret material presented to the service at runtime, preferably through systemd credentials

Constraints:

- Releases are immutable after build.
- The app process never runs directly from a mutable workspace checkout.
- Rollback must only switch to a previously successful release.

---

## Server Actions

None. This spec does not add application server actions.

---

## UI / Component Spec

None. This spec does not change the user-facing UI.

### States

- **Loading:** not applicable
- **Empty:** not applicable
- **Error:** not applicable
- **Populated:** not applicable

### Interactions

No new product interactions. All behavior is operational.

---

## Deployment Workflow Spec

### Release Packaging

The workstation packages a deployment from an exact repo state into a release payload.

Rules:

1. Package from a specific commit or exact working tree snapshot selected by the operator.
2. Do not package build artifacts from the workstation.
3. The packaged payload is transferred to the production host over SSH.
4. The package must include release metadata: commit SHA, package timestamp, and an operator-visible release ID.
5. Public build-time configuration must be decided before packaging. Runtime-only changes are not sufficient for `NEXT_PUBLIC_*` values.

### Server Build and Activation

The production host receives the payload and performs the build in a new release directory.

Sequence:

1. Create `/srv/chefflow/releases/<timestamp>-<sha>/`
2. Unpack the payload into that release directory.
3. Materialize runtime configuration from host-managed secrets/config outside the repo.
4. Persist release metadata inside the release directory for audit and rollback clarity.
5. Run dependency install using the lockfile.
6. Run the production build in that release directory.
7. Start a temporary loopback-only validation process on an unused port.
8. Hit the health endpoint locally.
9. Hit at least one streaming endpoint locally through the temporary validation port.
10. If health succeeds, switch `/srv/chefflow/current` to the new release.
11. Restart the production systemd service.
12. Verify the public health endpoint.

If any step fails before cutover, the live release remains unchanged.

### Build and Runtime Configuration Rules

- `NEXT_PUBLIC_*` values are build-time inputs. Changing them requires a rebuild of the release.
- Server-only secrets are runtime inputs and must come from host-managed configuration, not committed repo files.
- If this repo later adopts `output: 'standalone'`, the deployment process must also copy `public/` and `.next/static/` into the standalone directory before activation.
- If multi-instance or rolling deployments are added later, the build must set a consistent build/deployment identifier to reduce version-skew problems.

### Rollback

Rollback is symlink-based.

Rules:

1. Keep at least the previous three successful releases.
2. Rollback changes only the `current` symlink plus service restart.
3. Rollback never rebuilds code in the middle of an incident.
4. Rollback is successful only after loopback and public health checks pass.

---

## Runtime / Service Spec

### Reverse Proxy

The production node runs a reverse proxy on ports `80` and `443`.

Responsibilities:

- terminate TLS
- redirect HTTP to HTTPS
- proxy requests to the ChefFlow app on loopback
- preserve upgrade and streaming behavior
- expose access logs and error logs

Proxy-specific rules:

- Caddy is the preferred implementation for phase 1.
- If Nginx is used, response buffering must be explicitly disabled or upstream `X-Accel-Buffering: no` behavior must be honored for streaming routes.
- Reverse-proxy config must be tested against both `/api/realtime/*` and `/api/remy/stream` behavior, not only a basic health endpoint.
- The public proxy must never forward traffic directly to a mutable workstation or tunnel endpoint.

### App Service

The ChefFlow application runs as a non-root `systemd` service.

Requirements:

- bind only to `127.0.0.1`
- restart on failure
- use a dedicated service account
- prefer host-managed credentials over committed env files for sensitive data
- allow a host-managed env file only as a transitional compatibility layer, outside the repo and with strict file permissions
- write logs to `journald`

Secrets guidance:

- Preferred: `LoadCredential=` or related systemd credential features, with the app or wrapper reading from `$CREDENTIALS_DIRECTORY`
- Acceptable transition: `EnvironmentFile=` referencing a root-owned file outside the repo
- Not acceptable: storing live production secrets in the repository or inside release directories

### Host Requirements

- Linux x86_64
- minimum 16 GB RAM
- recommended 32 GB RAM
- SSD storage
- static LAN IP or stable DHCP reservation

Rationale:

- the repo has already documented high local memory pressure under automation
- the app is large enough that a dedicated lightweight host is preferable to the dev workstation

---

## Staging Policy

### Default Recommendation

Do **not** create a second always-on staging environment unless there is a real testing need that preview-on-demand cannot solve.

For this spec, "preview-on-demand" means a temporary self-hosted branch deployment on controlled infrastructure, not a third-party preview service.

### If Staging Is Required

Use one of these two self-hosted patterns:

1. Same host, second service:
   - separate env file
   - separate loopback port
   - separate reverse-proxy site block
2. Second host:
   - same deployment model
   - lower-risk isolation

This decision should be made after production is stable. It is not a prerequisite for the production cutover.

---

## Monitoring and Recovery

### Health Contract

Required health checks:

1. loopback app health before cutover
2. public readiness health after cutover
3. periodic uptime probes
4. explicit streaming/SSE verification through the reverse proxy during rollout validation

Minimum endpoints:

- `/api/health`
- `/api/health/readiness?strict=1`

### Monitoring

Required:

- HTTPS uptime monitor against public readiness endpoint
- disk usage alerting on the production node
- service restart visibility
- log retention and rotation

Recommended:

- memory usage alerting
- deploy notification on success/failure

### Recovery Rules

- If build fails: abort release, keep current live version
- If temporary validation port fails health: abort release, keep current live version
- If temporary validation passes basic health but streaming fails: abort release, keep current live version
- If live cutover fails readiness: immediate rollback to previous successful release
- If host is down: recover host first, then restore the latest successful release

---

## Sovereignty Gaps

This spec only solves **self-hosted application serving**.

It does **not** in this phase replace every outside service documented in [docs/environment-variables.md](c:/Users/david/Documents/CFv1/docs/environment-variables.md).

Known categories that still require a future sovereignty review:

- database and auth backend
- payment processing
- email delivery
- OAuth providers
- analytics
- AI providers
- local model-serving or internal AI-node placement
- external rate-limit infrastructure

These are tracked as a follow-up architecture problem, not a blocker for separating public serving from the developer workstation.

---

## Edge Cases and Error Handling

| Scenario                                  | Correct Behavior                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Workstation is shut down                  | Public production stays up because it is hosted on the dedicated production node               |
| Production build fails                    | New release is discarded; current live release remains                                         |
| Health check fails before cutover         | New release is discarded; current live release remains                                         |
| Health check fails after cutover          | Roll back immediately to the previous successful release                                       |
| Production env file is missing            | Release activation must fail hard before service restart                                       |
| Build uses wrong `NEXT_PUBLIC_*` values   | Discard release and rebuild; runtime env changes alone are not sufficient                      |
| TLS renewal fails                         | Alert operator; do not silently leave the site in a broken cert state                          |
| Disk fills with old releases/logs         | Prune old releases and rotate logs according to runbook                                        |
| SSE/streaming route stalls under proxy    | Reverse proxy config is incorrect; buffering/streaming settings must be fixed before cutover   |
| AI model host is absent in production     | Web host may remain healthy, but AI behavior must follow documented graceful-degradation rules |
| Reverse proxy starts but app is unhealthy | Public health check must fail and trigger rollback/recovery                                    |

---

## Verification Steps

_How does the builder agent confirm this works? Be specific._

1. Provision the dedicated production host with Linux, Node.js, and the selected reverse proxy.
2. Install the production systemd unit and reverse-proxy config.
3. Deploy a release to a new timestamped release directory without changing the current live release.
4. Verify temporary loopback validation returns `200` on `/api/health/readiness?strict=1`.
5. Verify at least one SSE/streaming route works through the temporary validation port and through the public reverse proxy without buffering.
6. Activate the release and confirm the public readiness endpoint returns success.
7. Stop the developer workstation dev server and confirm the public production site remains available.
8. Trigger a second deployment and confirm the new release activates cleanly.
9. Trigger a rollback and confirm the previous release is restored without rebuild.
10. Reboot the production host and verify the service comes back automatically.
11. Confirm live secrets are not present in the repo checkout or release tree.
12. Capture the final directory layout, systemd status, reverse-proxy status, and health-check results in the runbook.

---

## Out of Scope

- Replacing every outside dependency in the same phase
- Any application feature work
- Any UI redesign
- Any database schema change
- Multi-node clustering or high-availability load balancing
- Containers or orchestration unless native Node proves insufficient
- Deleting legacy tunnel-era scripts or docs before the new self-hosted path is proven live

---

## Notes for Builder Agent

- Treat this as an infrastructure migration, not a product feature.
- Do not touch application code unless an implementation blocker proves it is impossible to deploy under the existing Node runtime model.
- Prefer the smallest reliable ops footprint: reverse proxy, systemd, release directories, health checks, rollback.
- Keep the production app bound to loopback; only the reverse proxy should listen publicly.
- Preserve streaming and realtime behavior during proxy configuration.
- Treat build-time public env and runtime server secrets as different classes of configuration.
- Do not commit live production env files; prefer systemd credentials for sensitive material.
- Remember that stable web hosting does not automatically make local-model AI paths production-resident.
- Build and validate every new release before cutover.
- The first implementation pass should optimize for reliability and reversibility, not novelty.
