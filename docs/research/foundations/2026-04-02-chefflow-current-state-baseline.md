# ChefFlow Current State Baseline

Date: 2026-04-02
Status: reference-only, foundational archive
Purpose: permanent baseline for future research and product planning

## Why This Exists

This document captures the current known shape of ChefFlow at a system level so future research does not have to reconstruct the basics from scattered docs, route trees, and build artifacts.

It is meant to answer four recurring questions quickly:

1. What has ChefFlow actually built?
2. What problem is it trying to solve?
3. What is the repo and platform state right now?
4. Which supporting documents should future work trust first?

## Source Basis

This baseline is grounded in direct repository inspection plus these primary documents:

- [Product Definition](../../chefflow-product-definition.md)
- [System Architecture](../../system-architecture.md)
- [Feature Inventory](../../feature-inventory.md)
- [Repo Structure and Navigation Map - 2026-04-02](./2026-04-02-repo-structure-and-navigation-map.md)
- [Build State](../../build-state.md)
- [Verification Report - 2026-03-31](../../verification-report-2026-03-31.md)
- [OpenClaw Data Pipeline](../../openclaw-data-pipeline.md)
- [API v2 Reference](../../api-v2-reference.md)
- [Environment Variables](../../environment-variables.md)
- [Comprehensive Domain Inventory Phase 1](../../specs/comprehensive-domain-inventory-phase-1.md)
- [Developer and Chef Workflow Research for Surface Classification - 2026-04-02](../developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md)
- [Directory Operator and Developer Workflows - 2026-04-02](../directory-operator-and-developer-workflows-2026-04-02.md)

## Core Findings

### 1. ChefFlow is a broad operating system, not a narrow single-feature app

The repo supports a large multi-surface platform for culinary businesses. It is centered on the chef/operator workspace, then extended into public discovery, client self-service, staff workflows, partner views, admin mission control, and programmatic APIs.

### 2. The chef surface is the center of gravity

The route tree shows:

- 530 chef pages
- 50 public pages
- 36 admin pages
- 36 client pages
- 302 API route handlers

This means ChefFlow should be understood first as an operator system with attached surfaces, not as a marketing site with some back-office tools.

### 3. The repo is extremely large, but mostly because of generated artifacts

Measured root footprint on 2026-04-02:

- project root size: **46.853 GB**
- total files: **209,301**
- total directories: **38,103**
- combined `.next*` directories: **41.046 GB** across **10** directories

The large footprint is operational residue, not authored reference material.

### 4. The documentation set is dense but small

Measured documentation footprint on 2026-04-02:

- `docs/` total size: **6.79 MB**
- `docs/` total files: **417**
- composition: **409 markdown files**, **8 JSON files**

The internal docs are rich and useful, but they are not what is consuming disk.

### 5. The system has a verified green baseline, but the worktree is active

The latest recorded build state says both TypeScript and `next build --no-lint` were green on 2026-04-02. The repo also has active uncommitted work around price catalog, OpenClaw, discovery, and related documentation. That means there is a trustworthy recent baseline, but the exact current working tree should be treated as in motion.

### 6. OpenClaw is a major subsystem, not a side note

OpenClaw is ChefFlow's external pricing intelligence system. It contributes ingredient and price data, store coverage, sync processes, and catalog logic that support food-cost, pricing, procurement, and related operational surfaces.

## What ChefFlow Is

ChefFlow is an attempt to unify the operational stack of a culinary business into one system.

Its intended replacement scope includes:

- inquiries and lead management
- quotes, proposals, and contracts
- event lifecycle management
- calendar and scheduling
- menus, recipes, ingredients, and costing
- vendors, procurement, and inventory
- finance, invoices, expenses, and ledger truth
- client communication and portal workflows
- reviews, loyalty, and post-event follow-up
- discovery and public-facing acquisition

The platform definition also frames ChefFlow as having two top-level product promises:

1. An operator platform for chefs and food operators
2. A public discovery surface for consumers looking for those operators

## What Is Built

Measured codebase counts on 2026-04-02:

- 690 `page.tsx` route files
- 311 `route.ts` API handlers
- 1,493 component files
- 1,710 library and service modules
- 673 migration SQL files
- 918 test files

Top-level route groups present:

- `(chef)`
- `(public)`
- `(client)`
- `(admin)`
- `(partner)`
- `(staff)`
- `(mobile)`
- `(demo)`
- `api`
- `auth`
- `embed`
- `kiosk`
- tokenized and public entrypoint groups such as `book`, `client`, `intake`, and `print`
- additional live top-level app entries including `(bare)`, `beta-survey`, `menus`, `recipes`, `staff-login`, `unauthorized`, and `feed.xml`

## Functional Breadth

The current platform spans these major domains:

- event lifecycle and service execution
- inquiry intake and conversion
- quotes, proposals, and contracts
- calls and consultations
- menus, recipes, ingredients, and culinary components
- pricing, food cost, and price intelligence
- vendors, procurement, and inventory
- client CRM, preferences, recurring service, and loyalty
- surveys, reviews, reputation, and proof
- analytics, reporting, insights, and intelligence
- finance, ledger, invoices, expenses, disputes, and tax
- staffing, tasks, queueing, daily ops, and scheduling
- document generation, snapshots, and print outputs
- marketing, social, public directory, and discovery
- safety, compliance, incidents, and protection
- admin oversight and cross-tenant control surfaces

## Technical Architecture

### Core stack

- Next.js 14 App Router
- TypeScript
- React 18
- Tailwind CSS
- PostgreSQL
- Drizzle ORM
- `postgres.js`
- Auth.js v5
- Stripe
- Resend
- Sentry
- PostHog
- Playwright

### Structural layout

- `app/`: UI surfaces and route ownership
- `app/api/`: internal APIs, scheduled jobs, health, integrations, documents, and service endpoints
- `components/`: shared UI layer
- `lib/`: business logic and service modules
- `database/`: migrations and schema-related assets
- `types/`: shared TypeScript contracts and system-level type definitions
- `public/`: static assets
- `scripts/`: local tooling, ingest, maintenance, sync, and audit scripts
- `tests/`: Playwright plus unit and integration coverage
- `docs/`: product, architecture, audit, spec, and research references
- `memory/`: persistent project memory and operator notes

## Top-Level Folder Taxonomy

The root folder is easier to navigate if it is understood in five buckets:

### 1. Authored product source

- `app`
- `components`
- `lib`
- `database`
- `types`
- `public`
- `hooks`

This is the core implementation surface.

### 2. Authored planning, research, and context

- `docs`
- `memory`
- `prompts`

This is where planning artifacts, audits, specs, research, and persistent context live.

### 3. Tooling, tests, and execution support

- `tests`
- `scripts`
- Playwright config files at the root
- local helper scripts such as watchdog, cleanup, and launch files

These files support verification, imports, automation, and local operations.

### 4. Generated or machine-local residue

- `.next*`
- `test-results`
- `screenshots*`
- `qa-screenshots`
- `.tmp-*`
- root-level logs and output files
- `tsconfig*.tsbuildinfo`

These folders are important operationally, but they are not the product source of truth.

### 5. Local-machine and environment-specific state

- `.auth`
- `.claude`
- `.cloudflared`
- `.github`
- `.husky`
- `.vscode`
- `.openclaw-*`
- `backups`
- `storage`

These folders reflect machine state, local auth, deployment support, or local data. They matter, but they should not be confused with authored feature code.

## App Entry Point Map

The `app/` tree is broad enough that a flat route-group list is not enough for orientation. At the top level, the current entrypoints break down like this:

### Canonical surface groups

- `(chef)`: primary operator workspace
- `(public)`: public marketing, discovery, intake, and token-delivered external access
- `(client)`: authenticated client portal
- `(admin)`: internal mission-control delivery lane
- `(partner)`: partner self-service
- `(staff)`: staff-specific delivery lane for chef-owned operational work

### Secondary product or presentation groups

- `(mobile)`: mobile-specific flow handling
- `(demo)`: demo-only route lane
- `(bare)`: minimal shell route lane

### Platform and auth infrastructure

- `api`: internal APIs and service endpoints
- `auth`: authentication routes and auth-adjacent pages
- `embed`: embedded and externalized delivery
- `kiosk`: kiosk-specific UI

### Public and tokenized entrypoints

- `book`
- `client`
- `intake`
- `print`
- `staff-login`
- `beta-survey`

### Standalone top-level pages or utility entrypoints

- `menus`
- `recipes`
- `unauthorized`
- `feed.xml`

The important navigation rule is that top-level app placement is only one signal. Some top-level public and tokenized routes are delivery paths for client, partner, or chef-owned staff experiences rather than proof that the feature is canonically public-owned.

### API families

Largest API families observed:

- `v2`: 148 handlers
- `scheduled`: 27 handlers
- `documents`: 17 handlers
- `cron`: 14 handlers
- `integrations`: 10 handlers
- `social`: 6 handlers
- `remy`: 5 handlers

This confirms that ChefFlow is not only a browser UI. It also exposes a substantial internal service layer and a formal external API structure.

## How Data Enters the System

ChefFlow receives input from several channels:

### Direct human input

- chef/operator forms and workflows
- public booking and intake flows
- client portal interactions
- admin mission-control tools

### Imports and captured assets

- CSV and history imports
- document generation and snapshots
- uploaded receipts and OCR-related processing
- recipe and menu import flows

### Integrations

Observed integration families include:

- Google and Gmail
- Stripe
- social connectors
- Square
- QuickBooks
- DocuSign
- Zapier
- Wix processing

### Scheduled jobs and automation

Observed scheduled families include:

- automations
- reminders
- campaigns
- lifecycle jobs
- review sync
- loyalty expiry
- waitlist sweeps
- follow-up systems
- social publishing
- integration pull and retry
- simulation and monitoring

### External pricing intelligence

OpenClaw adds:

- price catalog and product coverage
- store and geography-aware pricing inputs
- lookup and sync APIs
- nightly or scheduled refresh patterns

## AI and Intelligence Model

ChefFlow uses a split model:

- local/private AI through Ollama for sensitive workflows
- cloud AI only for non-sensitive or generic tasks
- deterministic business logic for financial, lifecycle, and operational truth where possible

This is important because many research and product questions in this repo depend on whether a feature is deterministic, AI-assisted, or entirely degraded when Ollama is unavailable.

## Current Repository State

### Last recorded verified baseline

Per [Build State](../../build-state.md):

- TypeScript check green on 2026-04-02
- `next build --no-lint` green on 2026-04-02
- last recorded green commit in that tracking file: `4743f418`

### Current active state

The repository currently contains uncommitted changes related to:

- price catalog interfaces
- OpenClaw image and sync work
- discovery and crawler data work
- recent architecture and feature documentation
- new tests for golden path and normalization work

Use the green baseline as the last confirmed reference point, but treat the worktree as active.

## Folder and Storage Findings

### Root-level storage breakdown

Largest measured contributors:

- `.next*` directories: **41.046 GB**
- `.git`: **2.589 GB**
- `node_modules`: **1.210 GB**
- `.claude`: **0.814 GB**

For a full folder-centric explanation of the workspace, including top-level directory roles and navigation notes, see [Repo Structure and Navigation Map - 2026-04-02](./2026-04-02-repo-structure-and-navigation-map.md).

### Source and reference footprints

- `public`: **77.35 MB**
- `scripts`: **49.81 MB**
- `tests`: **48.27 MB**
- `lib`: **22.03 MB**
- `data`: **17.29 MB**
- `components`: **10.38 MB**
- `app`: **6.74 MB**
- `docs`: **6.80 MB**
- `database`: **2.40 MB**

### Practical takeaway

If anyone says the repo contains "50 GB of documentation," that is materially inaccurate. The project folder is near 50 GB, but the authored documentation is only a few megabytes. The real storage issue is build and cache residue.

## What To Ignore First During Navigation

If the goal is to understand product structure quickly, de-prioritize these on the first pass:

- `.next*` build directories
- screenshot and test-result folders
- root-level `.log`, `.png`, and temporary debug files
- `tsconfig*.tsbuildinfo`
- backup dumps and machine-local support files

Start with `app`, `components`, `lib`, `database`, `types`, and `docs`. Everything else is either support material, local machine state, or generated residue unless the task specifically points there.

## Canonical Supporting References

For most future research and planning work, start with these files in this order:

1. [Product Definition](../../chefflow-product-definition.md)
2. [System Architecture](../../system-architecture.md)
3. [Feature Inventory](../../feature-inventory.md)
4. [Build State](../../build-state.md)
5. [Verification Report - 2026-03-31](../../verification-report-2026-03-31.md)
6. [OpenClaw Data Pipeline](../../openclaw-data-pipeline.md)

Then open the most relevant recent research files:

- [Developer and Chef Workflow Research for Surface Classification - 2026-04-02](../developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md)
- [Directory Operator and Developer Workflows - 2026-04-02](../directory-operator-and-developer-workflows-2026-04-02.md)
- [Route Discoverability Report](../route-discoverability-report.md)
- [Cross System Continuity Audit](../cross-system-continuity-audit.md)
- [Production Reachability Report](../production-reachability-report.md)

## How To Use This Baseline

Use this document when you need:

- a first-pass understanding of what ChefFlow is
- a high-level map of the platform before deeper research
- a stable reference point for future strategy or architecture work
- a correction against mistaken assumptions about repo size or documentation scale

Do not use this document as the only source for implementation decisions. It is a baseline and routing document, not a substitute for the domain-specific source files it points to.

## Supersession Rule

If a future research pass materially changes the known system shape, create a new dated baseline in `docs/research/foundations/` rather than overwriting this one. Link the new document back to this file and update [Research Library](../README.md).
