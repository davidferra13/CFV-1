# Chef Navigation Overhaul Research Brief

Status: research only  
Scope: information architecture and navigation-system normalization guidance  
Basis:

- [chef-navigation-map.md](/c:/Users/david/Documents/CFv1/chef-navigation-map.md)
- [chef-navigation-normalization-plan.md](/c:/Users/david/Documents/CFv1/chef-navigation-normalization-plan.md)
- [chef-navbar-icon-inventory.md](/c:/Users/david/Documents/CFv1/chef-navbar-icon-inventory.md)

## Goal

Transform the current navigation system from a fragmented feature-exposure graph into a coherent operating model where:

- every major entity has one canonical home
- every repeated entry point has a distinct reason to exist
- actions are separated from destinations
- reference/history surfaces are separated from active workflow
- admin/internal surfaces are isolated from chef-facing mental models
- visibility is controlled by relevance, not by whether a feature exists

This is not a visual redesign brief. It is a research and decision framework for future navigation work.

## Current System Facts

From the audited map:

- total navigation items: 1066
- total unique routes: 487
- total unique pages/components tied to navigation: 459
- deepest nesting level: 2
- chef navbar nodes: 444
- explicit chef-navbar icons: 183
- chef-navbar nodes with no icon declared: 261

Confirmed systemic issues:

- duplicate entry points for the same entities and routes
- same route with multiple labels
- same label pointing to multiple routes
- admin/internal routes exposed alongside chef workflow routes
- action routes mixed with domain destinations
- page-level contextual navigation mixed conceptually with global navigation
- orphan pages not reachable from confirmed navigation
- at least one unresolved target: `/social/compose`

## Research Principles

These are the operating principles to use when evaluating future options.

### 1. Canonical Home

Every major concept should have one canonical route and one canonical label.

Implications:

- `Clients` should have one primary destination
- `Events` should have one primary destination
- `Finance` should have one primary destination
- alternate entry points must be justified as contextual, action, or internal

### 2. Actions Are Not Places

Create flows should not compete with entity homes in the same navigation layer.

Examples:

- `New Event`
- `New Quote`
- `Add Client`
- `Upload Menu`
- `Add Expense`

These are actions, not core destinations.

### 3. Workflow Over Architecture

Navigation should mirror how chefs think about work:

- what needs attention now
- what event is active
- which client relationship matters
- what culinary work is in progress
- what financial state needs action

Not:

- internal storage structures
- backend modules
- implementation partitions

### 4. Visibility Is A Control Layer

A feature existing does not mean it belongs in persistent global navigation.

Allowed exposure layers:

- primary workflow navigation
- secondary system navigation
- contextual/local navigation
- action launchers
- hidden/admin/internal surfaces

### 5. Reference And History Should Not Dominate

Historical, archival, and analytical views are important, but they are not the same as active working surfaces.

These need deliberate placement:

- reports
- history
- logs
- analytics
- templates
- archives

### 6. Admin Is Its Own System

Admin routes should not shape the chef user’s mental model unless the user is explicitly working in admin mode.

## External Research Alignment

The current direction is supported by established navigation and IA guidance.

### Material Design

Material guidance supports limiting the number of primary destinations and using drawers or lower-emphasis surfaces for deeper structures.

Relevant implications:

- top-level chef navigation should be intentionally small
- deep destination graphs should not all be visible at once
- bottom/mobile surfaces should only carry a few top-level destinations

References:

- https://m1.material.io/patterns/navigation.html
- https://m1.material.io/layout/structure.html

### Baymard Institute

Baymard research supports:

- avoiding redundant and overlapping categories
- making parent categories meaningful destinations
- preserving labeling consistency
- reducing overcategorization
- using sibling/context navigation instead of duplicating global entry points

References:

- https://baymard.com/learn/ecommerce-ux-best-practices
- https://baymard.com/blog/kohls-category-navigation-ux
- https://baymard.com/blog/links-accessibility
- https://baymard.com/blog/ecommerce-sub-category-pages
- https://baymard.com/blog/sibling-categories

## Canonical Navigation Model To Research Against

This is not the final nav. It is the research model against which future structures should be evaluated.

### Layer 1: Primary Workflow Navigation

Small, persistent, high-frequency destinations.

Candidate domains from the audit:

- Dashboard or Today
- Inbox
- Events
- Clients
- Culinary
- Finance

Conditional candidates depending on actual chef behavior:

- Operations
- Network

### Layer 2: Secondary System Navigation

Valid destinations that should remain available, but not compete with the primary workflow.

Candidate domains:

- Analytics
- Commerce
- Marketing
- Supply Chain
- Tools
- Protection
- Settings

### Layer 3: Contextual Navigation

Shown only when relevant inside a domain or page.

Examples already present:

- event detail tabs
- network tabs
- quotes filter tabs
- activity filters
- settings subsection cards
- client preview tabs
- professional development tabs
- HACCP tabs

### Layer 4: Action Surfaces

Launchers for creation and quick execution.

Examples:

- create dropdown
- quick create
- command palette quick actions

### Layer 5: Internal/Admin Surfaces

Role-gated and explicitly separate from chef workflow navigation.

Examples:

- admin sidebar
- admin-only entries in chef-config surfaces
- internal health/reconciliation/directory routes

## Decision Framework

Every navigation item should be tested with the following questions, in order.

### A. What is it?

Assign one type only:

- action
- project/workflow destination
- area/domain destination
- reference/resource
- archive/history
- admin/internal

If an item cannot be classified cleanly, it is structurally ambiguous.

### B. What is its canonical entity?

Assign one owning domain:

- Dashboard
- Inbox
- Events
- Clients
- Culinary
- Finance
- Operations
- Pipeline
- Network
- Analytics
- Commerce
- Marketing
- Protection
- Supply Chain
- Tools
- Settings
- Admin

If ownership is unclear, the route is likely misplaced or underspecified.

### C. Does it need persistent global visibility?

Allowed answers:

- yes, primary workflow
- yes, secondary system
- no, contextual only
- no, action-only
- no, internal-only

### D. Is there already another valid path?

If yes, determine whether the duplicate path is:

- justified contextual access
- justified action shortcut
- justified internal/admin access
- unjustified duplication

### E. What should happen?

Allowed outcomes:

- leave as-is
- promote
- merge
- rename
- deprecate
- mark internal-only

## Dependency-Aware Research Sequence

This is the correct order for downstream navigation work.

### Phase 1: Normalize

Prerequisite: complete

Inputs:

- audited nav map
- normalization plan

Output:

- one canonical route and label per concept

Why first:

- structural concepts cannot be designed until duplicates and ownership are resolved

### Phase 2: Classify By Role

Prerequisite:

- canonical route set

Output:

- each item classified as primary, secondary, contextual, action, or internal

Why second:

- exposure cannot be decided while actions and destinations are mixed

### Phase 3: Define Entity Homes

Prerequisite:

- classification complete

Output:

- single home for each major entity/domain
- explicit owner for edge and orphan routes

Why third:

- “one home” must be resolved before nav grouping can stabilize

### Phase 4: Reduce Exposure

Prerequisite:

- entity homes defined

Output:

- persistent nav contains only core workflow domains
- contextual surfaces absorb domain-specific depth
- action surfaces carry create flows

Why fourth:

- otherwise feature reduction becomes arbitrary instead of principled

### Phase 5: Validate Against Real Chef Work

Prerequisite:

- candidate structure exists

Output:

- evidence that the proposed structure reflects actual usage and cognition

Validation questions:

- can a chef predict where to find a feature?
- can a chef distinguish actions from destinations?
- can a chef understand where they are and what comes next?
- do duplicate entry points each have a distinct reason to exist?

## Research Questions Still To Answer

These questions should be resolved before design.

### 1. What are the real primary chef destinations?

Audit suggests:

- Dashboard or Today
- Inbox
- Events
- Clients
- Culinary
- Finance

Need confirmation from actual usage, not only code structure.

### 2. Should Pipeline remain a top-level chef domain?

Open question:

- does pipeline behavior belong as a first-class working area
- or does it split into Clients + Events + Actions

### 3. Should Operations remain globally persistent?

Open question:

- is this daily core workflow for most chefs
- or a secondary system area

### 4. What belongs in Settings versus domain-owned surfaces?

The settings hub currently acts as both:

- account/system configuration
- feature index
- alternate access path for domain-owned functionality

That needs explicit boundary decisions.

### 5. Which admin/internal routes should never appear in chef navigation?

Some are currently exposed in multiple surfaces and should be treated as internal until proven otherwise.

## Risk Areas

These are the biggest structural risks for a future overhaul.

### Duplicate Route Identity Risk

Same route, different labels:

- `/admin`
- `/calendar`
- `/clients`
- `/clients/new`
- `/culinary`
- `/daily`
- `/dashboard`
- `/events/new`
- `/financials`
- `/network`

### Duplicate Label Risk

Same label, different routes:

- `Clients`
- `Notifications`
- `Templates`
- `Reports`
- `Overview`
- `Daily Ops`

### Cross-Layer Mixing Risk

Current nav mixes:

- destinations
- create actions
- filters
- tabs
- admin routes
- system configuration

This makes global nav larger than it should be and harder to reason about.

### Orphan Risk

Known orphan routes:

- `/chef/cannabis/handbook`
- `/chef/cannabis/rsvps`
- `/prospecting/openclaw`
- `/stations/orders/print`

These require explicit ownership decisions before structural cleanup.

### Unresolved Route Risk

Known unresolved target:

- `/social/compose`

This needs route verification before any canonical IA decisions involving that flow.

## Research Deliverables Already Available

- audited map: [chef-navigation-map.md](/c:/Users/david/Documents/CFv1/chef-navigation-map.md)
- normalization layer: [chef-navigation-normalization-plan.md](/c:/Users/david/Documents/CFv1/chef-navigation-normalization-plan.md)
- chef-navbar icon inventory: [chef-navbar-icon-inventory.md](/c:/Users/david/Documents/CFv1/chef-navbar-icon-inventory.md)

## Recommended Next Research Artifact

The next non-implementation deliverable should be:

`chef-navigation-ia-options-study.md`

That artifact should compare 2-4 candidate IA models against this research brief using the same evaluation criteria:

- canonical home clarity
- workflow alignment
- action vs destination separation
- contextual depth handling
- admin isolation
- duplication reduction
- discoverability under controlled exposure

## Bottom Line

The evidence supports a shift from “everything visible everywhere” to a controlled operating model:

- primary workflow navigation for high-frequency chef work
- secondary index for system domains
- contextual surfaces for depth
- action surfaces for creation
- internal/admin isolation for non-chef tasks

That is the research-backed path from a fragmented feature list to a usable chef operating system.
