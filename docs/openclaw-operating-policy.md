# OpenClaw Operating Policy

## Goal

Use OpenClaw as a sandboxed implementation worker for ChefFlow without giving it a path to damage the real repo, real credentials, or real infrastructure.

## Scope

This policy applies to every OpenClaw session that touches ChefFlow code.

## Hard Rules

1. OpenClaw never edits `C:\Users\david\Documents\CFv1`.
2. OpenClaw only works inside `C:\Users\david\Documents\CFv1-openclaw-sandbox`.
3. The sandbox clone must not contain the real `.env.local`.
4. The sandbox clone must default to local Supabase or test-only services.
5. OpenClaw may not deploy, push to shared remotes, or switch the sandbox to production credentials.
6. OpenClaw may not run destructive database commands unless the user explicitly asks for them in that session.
7. OpenClaw works on one bounded task at a time.
8. No change is accepted without tests and browser verification.

## Workspace Layout

- Real repo: `C:\Users\david\Documents\CFv1`
- OpenClaw sandbox: `C:\Users\david\Documents\CFv1-openclaw-sandbox`
- Task branch format: `oc/<task-name>`
- Sandbox app URL: `http://localhost:3300`
- Sandbox Supabase API URL: `http://127.0.0.1:54421`

## Allowed Task Types

- UI cleanup for a specific route or workflow
- Refactor with existing test coverage
- Bug fix for one identified failure mode
- Targeted route hardening
- Focused onboarding or auth drift repair
- New automated coverage for an already-defined feature

## Forbidden Task Types

- "Improve the whole app"
- Unbounded product redesign
- Live migration work against production data
- Secret rotation in the real repo
- Deployment or release management
- Anything that requires the real repo to be writable

## Blocked Commands

The following commands are blocked by policy even inside the sandbox clone:

- `git push`
- `git remote add`
- `npm run supabase:push`
- `npm run supabase:reset`
- `npm run env:use-prod`
- `npm run beta:deploy`
- `bash scripts/deploy-beta.sh`
- Any direct command that points the sandbox at production credentials

## Sandbox Defaults

The sandbox must use its own local values:

- Next.js dev server on port `3300`
- Supabase `project_id = "CFv1OpenClawSandbox"`
- Supabase API on `54421`
- Supabase DB on `54422`
- Supabase Studio on `54423`
- Supabase Inbucket on `54424`

## Required Verification Loop

Every accepted task must pass this loop:

1. `npm run typecheck`
2. The smallest relevant unit or integration suite
3. The smallest relevant Playwright suite
4. One real browser walkthrough of the changed flow
5. Evidence captured in the task summary

Use these project commands when they match the task:

- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e:smoke`
- `npm run test:interactions`
- `npm run test:journey`
- `npm run test:product`
- `npm run test:mobile:audit`

## Promotion Flow

1. OpenClaw works only in the sandbox clone.
2. OpenClaw commits only to the sandbox task branch.
3. The diff is reviewed by a human.
4. Accepted changes are cherry-picked or manually ported into the real repo.
5. The real repo remains the only source of truth.

## First Pilot Tasks

Start with one of these:

- Fix one onboarding drift issue
- Harden one client portal workflow
- Repair one auth or routing boundary
- Clean up one route cluster and add missing coverage

## Rejection Criteria

Reject the task if any of the following are true:

- The change only "looks right" and is not verified
- The UI can still claim success without confirmation
- The task widened beyond the original scope
- OpenClaw touched blocked commands
- The diff depends on real credentials or real infrastructure
