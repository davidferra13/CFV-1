---
name: OpenClaw Social Media Orchestration
description: Persistent note for the policy-safe social planning and publishing direction across Instagram, Facebook, and TikTok.
type: project
---

This note captures the current direction for turning OpenClaw into a serious social media operations layer without crossing into platform-risky automation.

## Current Truth

- The repo already has a meaningful `/social` subsystem:
  - annual planner
  - queue settings
  - OAuth platform connections
  - encrypted token storage
  - scheduled publishing engine
- The next job is not "invent a scheduler from scratch."
- The next job is "make the current scheduler safe, explicit, and marketable."

## Important Numbers

- 5 posts per week x 52 weeks = 260 posts per year.
- A 300-post year is possible, but it should be treated as a higher-frequency calendar, not as the default math.

## Strong Recommendation

Do not aim for a frozen year of final assets.

Use:

- annual slot planning
- monthly campaign themes
- 4 to 8 weeks fully approved
- 8 to 12 weeks drafted and editable
- 1 to 2 open slots per month for reactive content

## Product Boundary

ChefFlow should remain:

- the system of record
- the asset vault
- the post metadata editor
- the approval and schedule layer
- the OAuth credential holder
- the official publisher

OpenClaw should become:

- the content operator
- the planner that fills the calendar
- the drafter that prepares captions, tags, CTA, and platform variants
- the upstream worker that feeds ChefFlow finished or near-finished packages

Important: do not turn ChefFlow into a full media-editing suite in the first pass unless the existing product boundary proves insufficient.

## Creative Policy

- Prefer real chef-owned food photos and videos.
- Only use stock or support imagery for non-food atmosphere or seasonal context when needed.
- Do not default to stock food photography as proof of the chef's work.

## Safety Boundary

OpenClaw should only publish through:

- official OAuth connections
- official APIs
- approved third-party publishing partners

OpenClaw should never rely on:

- shared passwords
- headless browser posting bots
- consumer UI scraping

## Current Research-Based Read

- Facebook and Instagram are the easiest direct-publish targets.
- TikTok is possible, but needs stricter gating and likely a phased rollout.
- Partner-first publishing is the lowest-risk business path if direct TikTok publishing is not fully verified yet.

## Repo Gaps To Remember

- TikTok adapter looks older than the current TikTok docs and still assumes video-only.
- Current preflight is generic, not policy-aware.
- Current UI language is stronger than the proven platform reality in some places.
- Existing event-content drafting exists, but it still stops short of the fully safe queue/publish workflow.

## Best Next Assignment

OpenClaw should be assigned a compliance-hardening pass on the existing social planner:

- per-platform policy matrix
- explicit delivery modes
- owner approval checkpoint
- TikTok direct-vs-draft gating
- partner handoff fallback
- asset readiness and unsupported-feature checks

## Build Order

1. Fix truth and drift in the existing `/social` UI and routing.
2. Add a central platform policy and publishability layer.
3. Wire privacy/disclosure checks into the actual queue gate.
4. Add a normalized OpenClaw-to-ChefFlow ingestion boundary.
5. Harden platform adapters and live-publish behavior after policy and truth are correct.
