# Research Library

This directory is the long-lived reference library for ChefFlow research.

Use it for:

- foundational baselines
- topical research findings
- audits that inform future product work
- external landscape and operator-behavior research

Do not use it for:

- implementation specs
- active build checklists
- temporary scratch notes
- session-only reports that have no future reference value

## Structure

### `foundations/`

Canonical reference documents that future research and product work should start from.

These files should:

- synthesize findings across multiple sources
- explain what is true at a system level
- point to the most important supporting documents
- remain stable reference points over time

### Top-level dated research files

Topical or stream-specific research documents that support a domain, question, or investigation.

Examples:

- pricing and OpenClaw research
- workflow and operator research
- security and infrastructure audits
- UX and discoverability audits

## Start Here

### Canonical foundational references

- [ChefFlow Current State Baseline - 2026-04-02](./foundations/2026-04-02-chefflow-current-state-baseline.md)
- [ChefFlow Repo Structure and Navigation Map - 2026-04-02](./foundations/2026-04-02-repo-structure-and-navigation-map.md)
- [Website Build Research and Spec Cross-Reference - 2026-04-02](./foundations/2026-04-02-website-build-research-and-spec-cross-reference.md)

### Core supporting docs outside this folder

- [Canonical Project Definition and Scope](../project-definition-and-scope.md)
- [Product Definition](../chefflow-product-definition.md)
- [System Architecture](../system-architecture.md)
- [Feature Inventory](../feature-inventory.md)
- [Build State](../build-state.md)
- [Current Builder Start Handoff - 2026-04-02](./current-builder-start-handoff-2026-04-02.md)
- [Verification Report - 2026-03-31](../verification-report-2026-03-31.md)
- [OpenClaw Data Pipeline](../openclaw-data-pipeline.md)

## Recent Research Set

These are the most relevant recent supporting documents for current-state understanding and future planning:

- [Website Build Research and Spec Cross-Reference - 2026-04-02](./foundations/2026-04-02-website-build-research-and-spec-cross-reference.md)
- [Competitive Intelligence: Take a Chef and Private Chef Manager - 2026-04-02](./competitive-intelligence-takeachef-privatechefmanager-2026-04-02.md)
- [Competitive Intelligence: ChefFlow Improvement Opportunities - 2026-04-02](./competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md)
- [Competitive Intelligence Gap-Closure Builder Handoff - 2026-04-02](./competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md)
- [Cross-Persona Workflow Patterns and Breakpoints - 2026-04-02](./cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md)
- [Multi-Persona Workflows for Food Discovery, Private-Chef Booking, and Dinner Planning - 2026-04-02](./multi-persona-workflows-for-food-discovery-private-chef-booking-and-planning-2026-04-02.md)
- [Developer and Chef Workflow Research for Surface Classification - 2026-04-02](./developer-and-chef-workflow-research-for-surface-classification-2026-04-02.md)
- [Directory Operator and Developer Workflows - 2026-04-02](./directory-operator-and-developer-workflows-2026-04-02.md)
- [Route Discoverability Report](./route-discoverability-report.md)
- [Cross System Continuity Audit](./cross-system-continuity-audit.md)
- [Chef Shell Clarity Intent Audit](./chef-shell-clarity-intent-audit.md)
- [Production Reachability Report](./production-reachability-report.md)

## Research Streams

### System and product shape

- architecture
- surface classification
- feature inventory
- current-state baselines

### Operator and market behavior

- chef workflow research
- competitive intelligence
- food operator patterns
- communication pain points
- competitive landscape

### Pricing and OpenClaw

- grocery pricing intelligence
- store and catalog coverage
- sync architecture
- refresh and operator workflows

### Quality, infrastructure, and trust

- verification and reachability
- security and attack-surface audits
- infrastructure state
- abuse and reliability reviews

## Archival Rules

1. Foundational documents go in `foundations/` and should be date-stamped.
2. New foundational documents should not overwrite earlier baselines.
3. If a baseline is superseded, create a new dated file and link back to the earlier one.
4. Add every new foundational document to this index.
5. Keep titles explicit enough that a future agent can identify the right file without opening ten others first.

## Retrieval Rule

If someone asks for the current shape of ChefFlow, start with the foundational baseline in `foundations/`, then read the supporting docs linked from that file before opening narrower research threads.

If someone asks what research/specs matter for the website build specifically, start with:

- [Website Build Research and Spec Cross-Reference - 2026-04-02](./foundations/2026-04-02-website-build-research-and-spec-cross-reference.md)
