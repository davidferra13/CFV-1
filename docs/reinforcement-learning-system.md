# ChefFlow V1 - Reinforcement Learning System

> **Created:** 2026-03-17 | **Status:** Implementation Guide
> **Target:** `https://beta.cheflowhq.com/` (ONLY - never dev, never production)
> **Runtime:** Developer's PC (local, self-contained, zero cloud cost)
> **Maintainer:** Claude Code (Lead Engineer)

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [Architecture Overview](#2-architecture-overview)
3. [Environment Design](#3-environment-design)
4. [Agent Architecture](#4-agent-architecture)
5. [User Archetypes and Behavioral Profiles](#5-user-archetypes-and-behavioral-profiles)
6. [State Representation](#6-state-representation)
7. [Action Space](#7-action-space)
8. [Reward Functions](#8-reward-functions)
9. [Exploration Strategy](#9-exploration-strategy)
10. [Sub-Agent Specialization](#10-sub-agent-specialization)
11. [Data Collection and Storage](#11-data-collection-and-storage)
12. [Analysis Pipeline](#12-analysis-pipeline)
13. [Checkpointing and Resumption](#13-checkpointing-and-resumption)
14. [Dashboard and Reporting](#14-dashboard-and-reporting)
15. [Integration with Existing Infrastructure](#15-integration-with-existing-infrastructure)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [File Structure](#17-file-structure)

---

## 1. Purpose and Scope

### What This Is

A locally-run reinforcement learning system that simulates thousands of diverse users interacting with ChefFlow through `beta.cheflowhq.com`. The agent explores the application autonomously, learns optimal and problematic interaction patterns, and produces actionable insights for product refinement.

### What This Is NOT

- Not a replacement for existing tests (soak, stress, journey, coverage, interaction). Those verify known behaviors. This discovers unknown ones.
- Not a cloud service. Everything runs on the developer's PC: the agent logic, data storage, analysis, and reporting.
- Not production testing. The agent ONLY interacts with `https://beta.cheflowhq.com/`.

### Goals

| Goal                       | Metric                                                    | Target                                         |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Discover UI dead ends      | Pages/flows with no forward navigation                    | 0 dead ends                                    |
| Find inefficient workflows | Click count for common tasks vs. optimal                  | < 1.5x optimal                                 |
| Detect memory leaks        | Heap growth over sustained sessions                       | < 3x baseline (matches soak thresholds)        |
| Identify error states      | Unhandled exceptions, failed transitions                  | 0 uncaught errors                              |
| Map optimal paths          | Shortest successful path per task                         | Documented for all core tasks                  |
| Stress multi-role flows    | Cross-portal interactions (chef creates, client responds) | 100% completion rate                           |
| Validate archetype fit     | Feature usage alignment per persona                       | Each archetype can complete its core workflows |

### Relationship to Existing Test Infrastructure

```
Existing Tests (deterministic, known scenarios):
  tests/coverage/     - Route existence verification
  tests/interactions/  - State mutation correctness
  tests/journey/       - Scripted user workflows (335+ scenarios)
  tests/soak/          - Memory/DOM leak detection (100 loops)
  tests/stress/        - AI queue concurrency
  lib/simulation/      - AI pipeline quality evaluation

RL System (exploratory, unknown scenarios):
  tests/rl/            - Autonomous exploration agent
                         Discovers paths tests don't cover
                         Finds emergent issues from interaction sequences
                         Learns which paths lead to user success/failure
                         Runs continuously in background
```

The RL system complements existing tests by exploring the space between scripted scenarios. Journey tests verify "does the happy path work?" The RL agent asks "what happens when users don't follow the happy path?"

---

## 2. Architecture Overview

```
+------------------------------------------------------------------+
|  Developer's PC (AMD Ryzen 9 7900X, 128GB DDR5, RTX 3050)       |
|                                                                   |
|  +---------------------+     +----------------------------+      |
|  | RL Controller        |     | Playwright Browser Pool    |      |
|  | (Node.js process)    |---->| (Chromium instances)       |      |
|  |                      |     |                            |      |
|  | - Agent orchestrator |     | - Max 3 concurrent tabs    |      |
|  | - Reward calculator  |     | - CDP metrics collection   |      |
|  | - Policy updater     |     | - Screenshot on anomaly    |      |
|  | - Checkpoint manager |     | - Network request logging  |      |
|  +----------+-----------+     +-------------+--------------+      |
|             |                               |                     |
|  +----------v-----------+     +-------------v--------------+      |
|  | SQLite Database       |     | beta.cheflowhq.com         |      |
|  | (local, zero cost)    |     | (Cloudflare Tunnel)        |      |
|  |                       |     |                            |      |
|  | - Episodes            |     | - Real Next.js app         |      |
|  | - State transitions   |     | - Real Supabase backend    |      |
|  | - Rewards             |     | - Real Stripe (test mode)  |      |
|  | - Anomalies           |     | - Real Ollama AI           |      |
|  | - Optimal paths       |     +----------------------------+      |
|  | - Policy weights      |                                        |
|  +-----------------------+                                        |
|                                                                   |
|  +---------------------+     +----------------------------+      |
|  | Analysis Engine      |     | Report Generator           |      |
|  | (runs after episodes)|     | (Markdown + JSON)          |      |
|  |                      |     |                            |      |
|  | - Sequence mining    |     | - docs/rl-reports/         |      |
|  | - Path clustering    |     | - data/rl-sessions/        |      |
|  | - Anomaly detection  |     | - Interactive HTML dash    |      |
|  +---------------------+     +----------------------------+      |
+------------------------------------------------------------------+
```

### Why SQLite (Not Supabase)

The RL system generates massive amounts of interaction data (thousands of state transitions per session). Writing this to Supabase would:

- Cost money (row writes)
- Pollute the shared dev/beta database
- Create network latency on every log entry
- Risk hitting rate limits

SQLite is local, instant, free, and keeps all RL data completely isolated from app data.

---

## 3. Environment Design

### Target Environment

| Property | Value                                          |
| -------- | ---------------------------------------------- |
| URL      | `https://beta.cheflowhq.com/`                  |
| Auth     | Agent account (`.auth/agent.json` credentials) |
| Database | Shared Supabase (dev/beta)                     |
| AI       | Ollama on `localhost:11434` (shared)           |
| Network  | Real internet via Cloudflare Tunnel            |

### Environment Parameters

The agent varies these parameters across episodes to test robustness:

| Parameter        | Range                      | Purpose                     |
| ---------------- | -------------------------- | --------------------------- |
| Viewport width   | 375, 768, 1024, 1440, 1920 | Responsive layout testing   |
| Viewport height  | 667, 1024, 768, 900, 1080  | Scroll behavior coverage    |
| Network throttle | None, Fast 3G, Slow 3G     | Latency resilience          |
| CPU throttle     | 1x, 2x, 4x                 | Performance under load      |
| Color scheme     | light, dark                | Theme testing               |
| Locale           | en-US, es-ES, fr-FR        | i18n (if supported)         |
| Touch mode       | true, false                | Mobile interaction patterns |

### Simulation Parameters

| Parameter               | Value                                            | Rationale                                                                        |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Max concurrent browsers | 3                                                | Prevents PC resource exhaustion (128GB RAM gives headroom, but Ollama needs GPU) |
| Episode length          | 50-200 actions                                   | Balances depth vs. breadth                                                       |
| Session timeout         | 30 minutes                                       | Prevents infinite episodes                                                       |
| Action delay            | 200-800ms (randomized)                           | Simulates human timing, avoids overwhelming beta                                 |
| Page load timeout       | 15 seconds                                       | Matches Playwright defaults                                                      |
| Screenshot frequency    | On anomaly + every 10th action                   | Storage-efficient documentation                                                  |
| Checkpoint interval     | Every 100 completed episodes OR every 60 minutes | Enables resume after interruption                                                |

### Safety Boundaries

The agent MUST NOT:

| Boundary                         | Enforcement                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| Delete real data                 | Block all delete/remove buttons unless on agent-created test data |
| Modify developer's account       | Only use agent account credentials                                |
| Trigger real payments            | Stripe is in test mode on beta, but verify `pk_test_` prefix      |
| Send real emails                 | Resend test mode on beta, but log and verify                      |
| Push notifications to real users | Only agent's push subscription                                    |
| Overwhelm beta server            | Max 3 concurrent requests, 200ms minimum between actions          |
| Touch production                 | Hardcoded URL allowlist: only `beta.cheflowhq.com`                |

---

## 4. Agent Architecture

### Policy Model

The agent uses a tabular Q-learning approach (not neural network). This is deliberate:

- The state-action space, while large, is discrete (pages x elements x actions)
- No GPU needed for the RL model itself (GPU stays free for Ollama)
- Fully interpretable (every decision can be traced to a Q-value)
- Fast updates (no backpropagation)
- Easy to checkpoint and resume

```
Q(state, action) = Q(state, action) + alpha * (reward + gamma * max_a Q(next_state, a) - Q(state, action))
```

| Hyperparameter             | Value                  | Rationale                                                               |
| -------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| alpha (learning rate)      | 0.1                    | Standard for tabular Q-learning                                         |
| gamma (discount factor)    | 0.95                   | Values future rewards (task completion) over immediate (click feedback) |
| epsilon (exploration rate) | 0.3 -> 0.05 (decaying) | High initial exploration, settling into exploitation                    |
| epsilon decay              | 0.999 per episode      | Gradual shift from exploration to exploitation                          |
| min epsilon                | 0.05                   | Always maintain 5% random exploration                                   |

### Decision Loop

```
for each episode:
  1. Select archetype (weighted round-robin)
  2. Select goal from archetype's goal set
  3. Initialize browser with archetype's viewport/settings
  4. Sign in with appropriate role credentials

  for each step in episode:
    5. Observe current state (page, elements, data)
    6. Select action via epsilon-greedy policy
    7. Execute action in browser
    8. Observe next state
    9. Calculate reward
    10. Update Q-table
    11. Log transition to SQLite
    12. Check termination conditions:
        - Goal achieved -> positive terminal reward
        - Dead end (no available actions) -> negative terminal reward
        - Error state (crash, 500, unhandled exception) -> negative terminal reward
        - Max steps reached -> neutral termination
        - Session timeout -> neutral termination
```

### Action Selection

The agent uses epsilon-greedy with UCB1 (Upper Confidence Bound) tie-breaking:

1. With probability epsilon: choose random available action (exploration)
2. With probability (1-epsilon): choose action with highest Q-value
3. When Q-values are tied: prefer less-visited actions (UCB1 bonus)

This ensures the agent systematically explores under-visited paths even during exploitation phases.

---

## 5. User Archetypes and Behavioral Profiles

### Core Archetypes

Built on existing presets from `lib/archetypes/presets.ts`, extended with behavioral characteristics:

#### 1. Private Chef (Primary)

```json
{
  "id": "private-chef",
  "role": "chef",
  "description": "Solo private chef managing 5-15 clients",
  "technical_proficiency": "medium",
  "usage_frequency": "daily",
  "primary_workflows": [
    "dashboard_review",
    "inquiry_response",
    "event_creation",
    "quote_building",
    "menu_planning",
    "client_communication",
    "financial_review",
    "calendar_check"
  ],
  "goal_set": [
    "respond_to_inquiry",
    "create_event_from_inquiry",
    "build_and_send_quote",
    "create_menu_for_event",
    "review_weekly_finances",
    "update_client_dietary_info",
    "schedule_event_on_calendar",
    "generate_invoice",
    "record_payment",
    "complete_event_lifecycle"
  ],
  "pain_points": ["too many clicks to create quote", "finding client history"],
  "viewport": { "width": 1440, "height": 900 },
  "session_duration_minutes": 15
}
```

#### 2. Caterer

```json
{
  "id": "caterer",
  "role": "chef",
  "description": "Catering company handling 20+ events/month",
  "technical_proficiency": "high",
  "usage_frequency": "daily",
  "primary_workflows": [
    "bulk_event_management",
    "staff_scheduling",
    "multi_event_calendar",
    "inventory_tracking",
    "financial_reporting",
    "grocery_ordering"
  ],
  "goal_set": [
    "create_multi_day_event",
    "assign_staff_to_event",
    "build_grocery_list",
    "review_monthly_revenue",
    "manage_equipment_inventory",
    "send_campaign_email"
  ],
  "viewport": { "width": 1920, "height": 1080 },
  "session_duration_minutes": 30
}
```

#### 3. Meal Prep Service

```json
{
  "id": "meal-prep",
  "role": "chef",
  "description": "Weekly meal prep for recurring clients",
  "technical_proficiency": "low",
  "usage_frequency": "weekly",
  "primary_workflows": [
    "recurring_event_setup",
    "recipe_management",
    "dietary_restriction_tracking",
    "simple_invoicing"
  ],
  "goal_set": [
    "set_up_recurring_event",
    "add_recipe_to_book",
    "check_client_allergies",
    "send_simple_invoice"
  ],
  "viewport": { "width": 768, "height": 1024 },
  "session_duration_minutes": 10
}
```

#### 4. Client (Hiring a Chef)

```json
{
  "id": "client-hiring",
  "role": "client",
  "description": "Client booking a private dinner",
  "technical_proficiency": "low",
  "usage_frequency": "occasional",
  "primary_workflows": [
    "view_event_details",
    "respond_to_quote",
    "submit_dietary_info",
    "make_payment",
    "message_chef"
  ],
  "goal_set": [
    "view_upcoming_event",
    "accept_quote",
    "submit_guest_dietary_form",
    "view_invoice",
    "send_message_to_chef"
  ],
  "viewport": { "width": 375, "height": 667 },
  "session_duration_minutes": 5
}
```

#### 5. Restaurant Owner

```json
{
  "id": "restaurant",
  "role": "chef",
  "description": "Restaurant using ChefFlow for catering side-business",
  "technical_proficiency": "medium",
  "usage_frequency": "weekly",
  "primary_workflows": [
    "analytics_review",
    "staff_management",
    "menu_management",
    "expense_tracking"
  ],
  "goal_set": [
    "review_analytics_dashboard",
    "add_staff_member",
    "update_menu",
    "log_expense",
    "run_financial_report"
  ],
  "viewport": { "width": 1024, "height": 768 },
  "session_duration_minutes": 20
}
```

#### 6. New User (Onboarding)

```json
{
  "id": "new-user",
  "role": "chef",
  "description": "First-time user going through onboarding",
  "technical_proficiency": "low",
  "usage_frequency": "first-time",
  "primary_workflows": [
    "complete_onboarding",
    "explore_dashboard",
    "try_demo_data",
    "navigate_settings"
  ],
  "goal_set": [
    "complete_profile_setup",
    "explore_all_nav_sections",
    "understand_event_flow",
    "configure_first_settings"
  ],
  "viewport": { "width": 1440, "height": 900 },
  "session_duration_minutes": 20
}
```

### Behavioral Modifiers

Each archetype instance gets randomized behavioral modifiers:

| Modifier             | Range     | Effect                                                          |
| -------------------- | --------- | --------------------------------------------------------------- |
| Patience             | 0.0 - 1.0 | Low patience = abandon after fewer failed attempts              |
| Attention span       | 0.0 - 1.0 | Low = jump between sections, high = complete tasks sequentially |
| Technical skill      | 0.0 - 1.0 | Low = more likely to click wrong elements, misread forms        |
| Error recovery       | 0.0 - 1.0 | Low = give up on errors, high = retry/navigate back             |
| Exploration tendency | 0.0 - 1.0 | Low = stick to main nav, high = click everything                |

---

## 6. State Representation

### State Vector

Each state is a composite of observable features:

```typescript
interface RLState {
  // Page identity
  route: string // Current URL path (normalized)
  pageTitle: string // Document title
  routeGroup: string // chef | client | admin | staff | public

  // UI state
  visibleModals: string[] // Open modal/dialog IDs
  activeTab: string | null // Currently selected tab
  expandedSections: string[] // Open collapsibles/accordions
  toastVisible: boolean // Active toast notification
  toastType: string | null // success | error | info
  loadingSpinners: number // Count of visible loading indicators

  // Form state
  formPresent: boolean // Is there a form on the page
  formFieldCount: number // Number of form fields
  formFilledCount: number // Number of filled fields
  formErrors: string[] // Visible validation errors

  // Data state
  listItemCount: number // Items in any visible list/table
  emptyState: boolean // Is the page showing an empty state
  errorState: boolean // Is the page showing an error state

  // Navigation context
  breadcrumbs: string[] // Breadcrumb trail
  sidebarExpanded: boolean // Sidebar open/collapsed

  // Performance signals
  domNodeCount: number // Via CDP
  heapUsedMB: number // Via CDP
  consoleErrors: number // Accumulated console errors
  networkFailures: number // Failed network requests
}
```

### State Hashing

States are hashed for Q-table lookup using a reduced representation:

```
hash = route + "|" + routeGroup + "|" + modalCount + "|" + activeTab + "|" + formPresent + "|" + emptyState + "|" + errorState
```

This groups similar states (e.g., the same page with different data) while distinguishing meaningfully different UI configurations.

---

## 7. Action Space

### Available Actions

The agent can perform these categories of actions:

#### Navigation Actions

| Action             | Description                         | Parameters   |
| ------------------ | ----------------------------------- | ------------ |
| `click_nav_item`   | Click a sidebar/top navigation link | `{selector}` |
| `click_breadcrumb` | Navigate via breadcrumb             | `{index}`    |
| `go_back`          | Browser back button                 | None         |
| `go_home`          | Navigate to dashboard               | None         |

#### Interaction Actions

| Action                | Description                   | Parameters         |
| --------------------- | ----------------------------- | ------------------ |
| `click_button`        | Click a visible button        | `{selector, text}` |
| `click_link`          | Click a visible anchor        | `{selector, text}` |
| `click_tab`           | Switch tab                    | `{selector, text}` |
| `click_dropdown_item` | Open dropdown and select item | `{trigger, item}`  |
| `toggle_checkbox`     | Toggle a checkbox             | `{selector}`       |
| `click_card`          | Click a card/list item        | `{selector}`       |

#### Form Actions

| Action          | Description                     | Parameters          |
| --------------- | ------------------------------- | ------------------- |
| `fill_text`     | Type into a text input          | `{selector, value}` |
| `fill_number`   | Type a number                   | `{selector, value}` |
| `fill_date`     | Set a date input                | `{selector, value}` |
| `select_option` | Choose from a select/dropdown   | `{selector, value}` |
| `fill_textarea` | Type into textarea              | `{selector, value}` |
| `submit_form`   | Click the primary submit button | None                |
| `clear_field`   | Clear an input                  | `{selector}`        |

#### Modal/Dialog Actions

| Action           | Description                    | Parameters |
| ---------------- | ------------------------------ | ---------- |
| `confirm_dialog` | Click confirm/OK in a dialog   | None       |
| `cancel_dialog`  | Click cancel/close in a dialog | None       |
| `dismiss_toast`  | Dismiss a toast notification   | None       |

#### Scroll Actions

| Action              | Description                 | Parameters      |
| ------------------- | --------------------------- | --------------- |
| `scroll_down`       | Scroll the page down        | `{pixels: 500}` |
| `scroll_up`         | Scroll the page up          | `{pixels: 500}` |
| `scroll_to_element` | Scroll an element into view | `{selector}`    |

### Action Discovery

At each step, the agent scans the current page to discover available actions:

```typescript
async function discoverActions(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []

  // Find all clickable elements
  const buttons = await page.locator('button:visible:not(:disabled)').all()
  const links = await page.locator('a:visible[href]').all()
  const inputs = await page.locator('input:visible, textarea:visible, select:visible').all()
  const navItems = await page.locator('nav a:visible, [role="navigation"] a:visible').all()
  const tabs = await page.locator('[role="tab"]:visible').all()

  // Build action list from discovered elements
  // ... (map each element to its action type)

  // Always available: go_back, go_home, scroll_down, scroll_up
  actions.push({ type: 'go_back' }, { type: 'go_home' })

  return actions
}
```

### Action Filtering (Safety)

Before executing, actions pass through a safety filter:

```typescript
function isSafeAction(action: RLAction): boolean {
  // Block destructive actions on non-agent data
  if (action.text?.match(/delete|remove|destroy|purge/i)) {
    return isAgentCreatedData(action.target)
  }

  // Block navigation to production URLs
  if (action.type === 'click_link' && action.href) {
    return action.href.includes('beta.cheflowhq.com') || action.href.startsWith('/')
  }

  // Block form submissions that could send real communications
  // (emails are in test mode on beta, but extra caution)
  if (action.type === 'submit_form' && currentPage.includes('/campaigns/')) {
    return false // Skip campaign sends
  }

  return true
}
```

---

## 8. Reward Functions

### Reward Structure

Rewards are a weighted combination of immediate and deferred signals:

#### Immediate Rewards (per action)

| Signal                  | Reward | Condition                                  |
| ----------------------- | ------ | ------------------------------------------ |
| Successful navigation   | +1     | Page loaded, no errors                     |
| Form submission success | +5     | Toast success or redirect to new page      |
| Form validation error   | -1     | Visible validation error appeared          |
| Console error           | -3     | New console.error logged                   |
| Network failure (5xx)   | -5     | Server returned 500+ status                |
| Unhandled exception     | -10    | Uncaught error in browser                  |
| Page crash              | -20    | Page became unresponsive                   |
| Dead end                | -5     | No available actions (excluding back/home) |
| Redundant action        | -1     | Clicked the same element twice in a row    |
| Loading timeout         | -3     | Page/element didn't load within 15s        |

#### Deferred Rewards (per episode)

| Signal                     | Reward | Condition                                      |
| -------------------------- | ------ | ---------------------------------------------- |
| Goal completed             | +50    | Archetype's target goal was achieved           |
| Goal completed efficiently | +100   | Goal achieved in fewer steps than current best |
| New page discovered        | +10    | Visited a route not seen in any prior episode  |
| New interaction discovered | +5     | Triggered a UI state not seen before           |
| Full workflow completed    | +30    | Completed a multi-step workflow end-to-end     |
| Session stability          | +10    | Zero console errors for entire episode         |

#### Performance Rewards (measured via CDP)

| Signal         | Reward | Condition                                 |
| -------------- | ------ | ----------------------------------------- |
| Memory stable  | +5     | Heap stayed within 1.5x of initial        |
| Memory growing | -5     | Heap grew beyond 2x initial               |
| DOM stable     | +3     | DOM node count stayed within 1.5x initial |
| DOM bloat      | -3     | DOM nodes grew beyond 2x initial          |
| Fast page load | +2     | Page loaded in < 2s                       |
| Slow page load | -2     | Page took > 5s to load                    |

### Goal Detection

Each archetype goal has a completion detector:

```typescript
const goalDetectors: Record<string, (page: Page) => Promise<boolean>> = {
  respond_to_inquiry: async (page) => {
    // Check: started on inquiries page, ended with a response sent
    return page.url().includes('/inquiries/') && (await page.locator('.toast-success').isVisible())
  },

  create_event_from_inquiry: async (page) => {
    // Check: an event page is showing with status "draft"
    return page.url().includes('/events/') && (await page.locator('text=Draft').isVisible())
  },

  build_and_send_quote: async (page) => {
    // Check: quote was created and status changed
    return page.url().includes('/quotes/') && (await page.locator('text=Sent').isVisible())
  },

  complete_event_lifecycle: async (page) => {
    // Check: event reached "completed" status
    return (await page.locator('text=Completed').isVisible()) && page.url().includes('/events/')
  },

  // ... more detectors per goal
}
```

### Reward Normalization

Raw rewards are normalized to [-1, 1] range per episode to prevent Q-value explosion:

```
normalized_reward = reward / max(|max_observed_reward|, |min_observed_reward|)
```

---

## 9. Exploration Strategy

### Epsilon-Greedy with Decay

```
epsilon(episode) = max(0.05, 0.3 * 0.999^episode)
```

- Episodes 1-100: High exploration (~30% random actions)
- Episodes 100-500: Moderate exploration (~20% random)
- Episodes 500+: Low exploration (~5% random, mostly exploiting learned policy)

### Directed Exploration Bonuses

Beyond pure random exploration, the agent prioritizes under-explored areas:

```typescript
function explorationBonus(state: string, action: string): number {
  const visitCount = getVisitCount(state, action)
  if (visitCount === 0) return 10 // Never tried this state-action pair
  return 1 / Math.sqrt(visitCount) // Decreasing bonus as visits increase
}
```

### Coverage-Driven Exploration

The agent maintains a coverage map of all discovered routes and interactions. When exploration rate is low, it periodically triggers "coverage sweeps" that specifically target unvisited routes:

```typescript
function shouldTriggerCoverageSweep(episode: number): boolean {
  const coveragePercent = getRouteCoverage()
  return episode % 50 === 0 && coveragePercent < 0.9
}
```

### Curiosity Bonus

States that produce unexpected outcomes (large prediction error between expected and actual next state) get bonus exploration weight:

```
curiosity_bonus = |predicted_next_state - actual_next_state| * curiosity_weight
```

This drives the agent toward surprising behavior (which is often where bugs live).

---

## 10. Sub-Agent Specialization

### Sub-Agent Architecture

The main controller spawns specialized sub-agents that focus on specific domains. Each sub-agent runs in its own browser context with its own Q-table partition.

```
+------------------+
| Main Controller   |
| (orchestrator)    |
+--------+---------+
         |
    +----+----+----+----+----+----+
    |         |         |         |
+---v---+ +---v---+ +---v---+ +---v---+
|Onboard| |Payment| |Error  | |Perf   |
|Agent  | |Agent  | |Agent  | |Agent  |
+-------+ +-------+ +-------+ +-------+
```

### Sub-Agent Definitions

#### 1. Onboarding Agent

| Property       | Value                                                                         |
| -------------- | ----------------------------------------------------------------------------- |
| Focus          | Signup flow, profile setup, first-use experience                              |
| Archetype      | new-user exclusively                                                          |
| Routes         | `/auth/*`, `/dashboard` (first visit), `/settings/profile`, onboarding modals |
| Goal           | Complete onboarding in minimum steps with zero confusion                      |
| Special reward | +20 for completing each onboarding step, -10 for getting stuck                |

#### 2. Payment Agent

| Property       | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Focus          | Quote acceptance, invoice viewing, payment flow           |
| Archetype      | client-hiring                                             |
| Routes         | `/my-events/*`, quote acceptance pages, invoice pages     |
| Goal           | Complete payment cycle (view quote, accept, view invoice) |
| Special reward | +50 for successful payment flow completion                |

#### 3. Error Recovery Agent

| Property         | Value                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Focus            | Deliberately triggering and recovering from error states                                         |
| Archetype        | All (cycles through)                                                                             |
| Routes           | All                                                                                              |
| Goal             | Find error states and verify recovery is possible                                                |
| Special behavior | Higher probability of: malformed input, rapid clicking, back-forward spam, empty form submission |
| Special reward   | +30 for finding a new error state, +20 for successful recovery, -5 for unrecoverable crash       |

#### 4. Performance Agent

| Property         | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Focus            | Long sessions, memory leaks, DOM bloat, slow pages       |
| Archetype        | caterer (longest sessions)                               |
| Routes           | Heavy pages: dashboard, analytics, calendar, event lists |
| Goal             | Sustained usage without degradation                      |
| Special behavior | 200+ actions per episode, repeats navigation cycles      |
| Special reward   | Based entirely on CDP performance metrics                |

#### 5. Cross-Portal Agent

| Property         | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Focus            | Chef-client interaction flows                                          |
| Archetype        | Alternates between private-chef and client-hiring                      |
| Routes           | Chef creates event/quote, client views/responds                        |
| Goal             | Complete a full chef-client interaction cycle                          |
| Special behavior | Switches between chef and client browser contexts                      |
| Special reward   | +100 for complete cycle (chef creates, client responds, chef confirms) |

### Sub-Agent Scheduling

```
Main loop (continuous):
  - 40% General exploration (main agent, all archetypes)
  - 15% Onboarding agent
  - 15% Payment agent
  - 10% Error recovery agent
  - 10% Performance agent
  - 10% Cross-portal agent
```

Scheduling weights adjust based on findings: if a sub-agent discovers many issues in its domain, its weight increases temporarily.

---

## 11. Data Collection and Storage

### SQLite Schema

```sql
-- Episode tracking
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  archetype_id TEXT NOT NULL,
  goal_id TEXT,
  goal_achieved BOOLEAN DEFAULT FALSE,
  total_steps INTEGER DEFAULT 0,
  total_reward REAL DEFAULT 0,
  terminal_reason TEXT,     -- goal_achieved | dead_end | error | timeout | max_steps
  viewport_width INTEGER,
  viewport_height INTEGER,
  network_throttle TEXT,
  cpu_throttle REAL,
  sub_agent TEXT            -- null for main agent, or sub-agent name
);

-- State transitions (the core learning data)
CREATE TABLE transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL REFERENCES episodes(id),
  step_number INTEGER NOT NULL,
  timestamp TEXT NOT NULL,

  -- State before action
  state_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  route_group TEXT,
  page_title TEXT,
  dom_node_count INTEGER,
  heap_used_mb REAL,

  -- Action taken
  action_type TEXT NOT NULL,
  action_selector TEXT,
  action_text TEXT,
  action_value TEXT,

  -- Result
  next_state_hash TEXT,
  next_route TEXT,
  reward REAL NOT NULL,
  reward_breakdown TEXT,     -- JSON: {"navigation": 1, "console_error": -3, ...}

  -- Anomaly flags
  console_errors TEXT,       -- JSON array of new console errors
  network_failures TEXT,     -- JSON array of failed requests
  screenshot_path TEXT,      -- Path if screenshot was taken

  -- Timing
  action_duration_ms INTEGER,
  page_load_ms INTEGER
);

-- Discovered routes and interactions
CREATE TABLE discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discovered_at TEXT NOT NULL,
  episode_id INTEGER NOT NULL REFERENCES episodes(id),
  discovery_type TEXT NOT NULL,  -- route | interaction | error_state | dead_end
  route TEXT,
  description TEXT,
  screenshot_path TEXT
);

-- Anomalies (things that need human attention)
CREATE TABLE anomalies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  detected_at TEXT NOT NULL,
  episode_id INTEGER REFERENCES episodes(id),
  severity TEXT NOT NULL,        -- critical | warning | info
  category TEXT NOT NULL,        -- crash | memory_leak | dead_end | slow_page | console_error | network_failure
  route TEXT,
  description TEXT,
  reproduction_steps TEXT,       -- JSON array of actions to reproduce
  screenshot_path TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TEXT
);

-- Optimal paths (best known way to achieve each goal)
CREATE TABLE optimal_paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id TEXT NOT NULL UNIQUE,
  archetype_id TEXT NOT NULL,
  step_count INTEGER NOT NULL,
  total_reward REAL NOT NULL,
  steps TEXT NOT NULL,           -- JSON array of {action, route, ...}
  discovered_at TEXT NOT NULL,
  episode_id INTEGER NOT NULL REFERENCES episodes(id)
);

-- Q-table (persisted policy)
CREATE TABLE q_table (
  state_hash TEXT NOT NULL,
  action_key TEXT NOT NULL,
  q_value REAL NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL,
  PRIMARY KEY (state_hash, action_key)
);

-- Session metrics (aggregated per episode)
CREATE TABLE session_metrics (
  episode_id INTEGER PRIMARY KEY REFERENCES episodes(id),
  avg_page_load_ms REAL,
  max_heap_mb REAL,
  max_dom_nodes INTEGER,
  total_console_errors INTEGER,
  total_network_failures INTEGER,
  unique_routes_visited INTEGER,
  actions_per_minute REAL,
  goal_completion_time_s REAL
);

-- Coverage tracking
CREATE TABLE route_coverage (
  route TEXT PRIMARY KEY,
  first_visited_at TEXT NOT NULL,
  visit_count INTEGER DEFAULT 1,
  last_visited_at TEXT NOT NULL,
  avg_load_time_ms REAL,
  error_count INTEGER DEFAULT 0
);

-- Indexes for query performance
CREATE INDEX idx_transitions_episode ON transitions(episode_id);
CREATE INDEX idx_transitions_route ON transitions(route);
CREATE INDEX idx_transitions_state ON transitions(state_hash);
CREATE INDEX idx_anomalies_severity ON anomalies(severity, resolved);
CREATE INDEX idx_episodes_archetype ON episodes(archetype_id);
CREATE INDEX idx_episodes_goal ON episodes(goal_id, goal_achieved);
```

### Data Retention

| Data Type      | Retention                      | Rationale                                 |
| -------------- | ------------------------------ | ----------------------------------------- |
| Episodes       | Indefinite                     | Lightweight metadata                      |
| Transitions    | Last 10,000 episodes           | Bulk of storage; older data less valuable |
| Q-table        | Indefinite                     | The learned policy                        |
| Anomalies      | Indefinite                     | Must track all discovered issues          |
| Optimal paths  | Indefinite                     | Reference for efficiency improvements     |
| Screenshots    | Last 1,000 anomaly screenshots | Storage management                        |
| Route coverage | Indefinite                     | Lightweight, always valuable              |

### Storage Estimates

| Component             | Per Episode               | After 10,000 Episodes                        |
| --------------------- | ------------------------- | -------------------------------------------- |
| Episode metadata      | ~500 bytes                | ~5 MB                                        |
| Transitions (100 avg) | ~50 KB                    | ~500 MB                                      |
| Q-table entries       | ~200 bytes/entry          | ~50 MB (est. 250K unique state-action pairs) |
| Screenshots           | ~200 KB each (compressed) | ~200 MB (1,000 screenshots)                  |
| **Total**             |                           | **~755 MB**                                  |

Well within the PC's 128GB RAM and local disk capacity.

---

## 12. Analysis Pipeline

### Real-Time Analysis (per episode)

After each episode completes:

1. **Anomaly detection:** Flag any new console errors, crashes, or performance degradations
2. **Path efficiency:** Compare goal completion steps to current optimal, update if better
3. **Coverage update:** Mark any newly visited routes
4. **Q-table persistence:** Flush updated Q-values to SQLite

### Periodic Analysis (every 100 episodes)

1. **Sequence Mining**
   - Extract common action sequences that lead to success vs. failure
   - Identify "friction patterns" (sequences where users frequently go back or abandon)
   - Output: ranked list of problematic sequences

2. **Path Clustering**
   - Group episodes by behavioral similarity (using edit distance on action sequences)
   - Identify clusters that consistently succeed vs. fail
   - Output: cluster descriptions with success rates

3. **Trend Analysis**
   - Track anomaly frequency over time (are we finding fewer bugs?)
   - Track average goal completion efficiency (are paths getting shorter?)
   - Track route coverage growth (diminishing returns signal saturation)

4. **Dead End Mapping**
   - Identify routes where the agent frequently gets stuck
   - Rank by frequency and severity
   - Output: prioritized list for UX improvement

### Deep Analysis (every 1,000 episodes)

1. **Heatmap Generation**
   - Page visit frequency across all episodes
   - Click heatmaps per page (most/least clicked elements)
   - Time-on-page distribution

2. **Funnel Analysis**
   - For each goal, build a funnel showing drop-off at each step
   - Identify the step with highest abandonment rate
   - Compare across archetypes

3. **Regression Detection**
   - Compare recent 100 episodes to previous 100
   - Flag any routes where error rate increased
   - Flag any goals where completion rate decreased

4. **Comprehensive Report**
   - Generate full Markdown report to `docs/rl-reports/`
   - Include top 10 findings, trend charts (ASCII), and recommended actions

---

## 13. Checkpointing and Resumption

### Checkpoint Contents

A checkpoint captures:

```
data/rl-checkpoints/
  checkpoint-{timestamp}/
    q_table.db            -- SQLite Q-table dump
    episode_counter.json  -- Current episode number, epsilon value
    coverage_map.json     -- Route coverage state
    archetype_weights.json -- Current sub-agent scheduling weights
    optimal_paths.json    -- Best known paths per goal
    meta.json             -- Checkpoint metadata (timestamp, episode, total_reward)
```

### Checkpoint Triggers

| Trigger                               | Action                                            |
| ------------------------------------- | ------------------------------------------------- |
| Every 100 completed episodes          | Full checkpoint                                   |
| Every 60 minutes (wall clock)         | Full checkpoint                                   |
| Before controller shutdown (graceful) | Full checkpoint + flush all pending writes        |
| After critical anomaly detected       | Quick checkpoint (Q-table + episode counter only) |

### Resumption Protocol

```
1. Scan data/rl-checkpoints/ for most recent valid checkpoint
2. Validate checkpoint integrity (all files present, Q-table readable)
3. Load Q-table into memory
4. Restore episode counter and epsilon value
5. Restore coverage map
6. Restore archetype weights
7. Log: "Resumed from checkpoint {id} at episode {n}"
8. Continue training from episode n+1
```

### Crash Recovery

If the process crashes without a graceful checkpoint:

1. The SQLite database has WAL (Write-Ahead Log) mode enabled for crash safety
2. Last committed episode data is preserved
3. Only the in-flight episode (current) is lost
4. Q-table updates from the lost episode are gone, but the impact is negligible (one episode out of thousands)

---

## 14. Dashboard and Reporting

### CLI Dashboard (Terminal)

A live-updating terminal dashboard for monitoring during runs:

```
+---------------------------------------------------------------+
| ChefFlow RL Agent - Episode 1,247 / Running                   |
+---------------------------------------------------------------+
| Epsilon: 0.089 | Avg Reward: 12.4 | Goal Rate: 67%           |
| Routes: 189/265 (71%) | Anomalies: 23 (3 critical)           |
+---------------------------------------------------------------+
| Current: private-chef -> build_and_send_quote                  |
| Step 34/200 | Route: /events/abc123/quotes                     |
| Last Action: click_button "Add Line Item" -> +1 reward        |
+---------------------------------------------------------------+
| Sub-Agents:                                                    |
|   Onboarding: 89 episodes, 12 anomalies, 78% goal rate       |
|   Payment:    67 episodes, 3 anomalies, 91% goal rate        |
|   Error:      45 episodes, 8 new error states found           |
|   Perf:       34 episodes, 2 memory leak candidates           |
|   Cross:      22 episodes, 1 critical: client can't see quote |
+---------------------------------------------------------------+
| Recent Anomalies:                                              |
|   [CRITICAL] /events/new - form submit returns 500 (ep 1,241) |
|   [WARNING]  /calendar - 8s load time (ep 1,238)              |
|   [INFO]     /analytics - new route discovered (ep 1,235)     |
+---------------------------------------------------------------+
```

### Markdown Reports

Generated to `docs/rl-reports/`:

```
docs/rl-reports/
  summary-latest.md           -- Always-current summary
  report-{date}.md             -- Daily detailed report
  anomalies-unresolved.md      -- Current open anomalies
  optimal-paths.md             -- Best known paths per goal
  coverage-map.md              -- Route coverage status
  archetype-performance.md     -- Per-archetype metrics
```

### JSON Data Export

Raw data for further analysis:

```
data/rl-sessions/
  episodes.jsonl               -- One JSON object per line per episode
  anomalies.json               -- All anomalies with reproduction steps
  q-table-export.json          -- Full Q-table for external analysis
  coverage.json                -- Route coverage data
```

---

## 15. Integration with Existing Infrastructure

### Playwright Reuse

The RL system uses the same Playwright infrastructure as existing tests:

```typescript
// Reuse existing auth setup
import { agentCredentials } from '../tests/helpers/auth'
import { createAuthenticatedContext } from '../tests/helpers/browser'

// Reuse existing page helpers
import { waitForPageLoad, takeScreenshot } from '../tests/helpers/page-utils'

// Reuse existing selectors
import { navSelectors, formSelectors } from '../tests/helpers/selectors'
```

### Soak Test Metric Collection

Reuse CDP metric collection from `tests/soak/soak-utils.ts`:

```typescript
import { collectMetrics, MetricSnapshot } from '../tests/soak/soak-utils'
```

### PostHog Integration

If PostHog is configured on beta, the RL agent's interactions will appear in PostHog analytics. The agent identifies itself with a distinct user property so its traffic can be filtered:

```typescript
// The agent sets a custom property to distinguish its traffic
await page.evaluate(() => {
  if (window.posthog) {
    window.posthog.identify('rl-agent', { is_rl_agent: true })
  }
})
```

### Anomaly-to-Issue Pipeline

When a critical anomaly is found, the system can optionally create a structured issue file:

```
data/rl-issues/
  issue-{anomaly-id}.md
```

Format:

```markdown
## [RL-{id}] {description}

**Severity:** critical
**Route:** /events/new
**Detected:** Episode 1,241 (2026-03-17 14:32:00)
**Archetype:** private-chef

### Reproduction Steps

1. Navigate to /events
2. Click "New Event" button
3. Fill event_name with "Test Dinner"
4. Click "Create Event"
5. Server returns 500

### Console Errors
```

TypeError: Cannot read property 'id' of undefined
at createEvent (actions.ts:142)

```

### Screenshot
![](../data/rl-screenshots/anomaly-1241.png)
```

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Week 1)

| Task              | Description                                         |
| ----------------- | --------------------------------------------------- |
| SQLite schema     | Create database, tables, indexes                    |
| State observer    | Implement `observeState()` using Playwright + CDP   |
| Action discoverer | Implement `discoverActions()` page scanner          |
| Action executor   | Implement safe action execution with error handling |
| Episode runner    | Basic episode loop (observe, act, observe, reward)  |
| Q-table           | In-memory Q-table with SQLite persistence           |
| Checkpointing     | Save/restore agent state                            |

**Deliverable:** Agent can run episodes, learn Q-values, and checkpoint.

### Phase 2: Intelligence (Week 2)

| Task                | Description                                      |
| ------------------- | ------------------------------------------------ |
| Archetype profiles  | Define all 6 archetypes with goals and behaviors |
| Goal detectors      | Implement completion detection for all goals     |
| Reward tuning       | Calibrate reward weights based on Phase 1 data   |
| Exploration bonuses | UCB1, curiosity bonus, coverage sweeps           |
| Safety filters      | Action filtering, URL allowlisting               |
| CDP metrics         | Memory, DOM, timing collection                   |

**Deliverable:** Agent explores intelligently with archetype-specific goals.

### Phase 3: Scale (Week 3)

| Task                | Description                                 |
| ------------------- | ------------------------------------------- |
| Sub-agents          | Implement 5 specialized sub-agents          |
| Scheduler           | Sub-agent scheduling with adaptive weights  |
| Concurrent browsers | Multi-tab execution (max 3)                 |
| Analysis pipeline   | Sequence mining, clustering, trend analysis |
| Report generator    | Markdown reports, anomaly tracking          |

**Deliverable:** Full multi-agent system with automated reporting.

### Phase 4: Polish (Week 4)

| Task               | Description                                 |
| ------------------ | ------------------------------------------- |
| CLI dashboard      | Live terminal monitoring                    |
| Crash recovery     | WAL mode, graceful shutdown                 |
| Data retention     | Automatic cleanup of old transitions        |
| Performance tuning | Optimize for sustained 24/7 operation       |
| Documentation      | Complete this document with lessons learned |

**Deliverable:** Production-ready RL system running autonomously.

---

## 17. File Structure

```
tests/rl/
  README.md                    -- Quick-start guide

  # Core
  controller.ts                -- Main orchestrator (entry point)
  agent.ts                     -- Q-learning agent logic
  environment.ts               -- Playwright environment wrapper

  # Observation
  state-observer.ts            -- Page state extraction
  action-discoverer.ts         -- Available action scanning
  action-executor.ts           -- Safe action execution

  # Learning
  q-table.ts                   -- Q-table with SQLite persistence
  reward-calculator.ts         -- Reward function implementation
  goal-detectors.ts            -- Goal completion detection

  # Exploration
  exploration-strategy.ts      -- Epsilon-greedy + UCB1 + curiosity
  coverage-tracker.ts          -- Route coverage tracking

  # Archetypes
  archetypes/
    types.ts                   -- Archetype type definitions
    private-chef.ts
    caterer.ts
    meal-prep.ts
    client-hiring.ts
    restaurant.ts
    new-user.ts

  # Sub-Agents
  sub-agents/
    base-sub-agent.ts          -- Shared sub-agent logic
    onboarding-agent.ts
    payment-agent.ts
    error-recovery-agent.ts
    performance-agent.ts
    cross-portal-agent.ts
    scheduler.ts               -- Sub-agent scheduling

  # Data
  database.ts                  -- SQLite schema and queries
  checkpoint-manager.ts        -- Save/restore state

  # Analysis
  analysis/
    sequence-mining.ts
    path-clustering.ts
    trend-analysis.ts
    anomaly-detector.ts
    funnel-builder.ts

  # Reporting
  reporting/
    cli-dashboard.ts           -- Terminal dashboard
    markdown-reporter.ts       -- Markdown report generator
    issue-generator.ts         -- Anomaly-to-issue converter

  # Safety
  safety-filter.ts             -- Action safety validation
  url-allowlist.ts             -- Only beta.cheflowhq.com

data/
  rl-db/
    chefflow-rl.sqlite         -- Main SQLite database
  rl-checkpoints/
    checkpoint-{timestamp}/    -- Checkpoint directories
  rl-screenshots/
    anomaly-{id}.png           -- Anomaly screenshots
  rl-sessions/
    episodes.jsonl             -- Episode data export
    anomalies.json             -- Anomaly export
  rl-issues/
    issue-{id}.md              -- Generated issue files

docs/rl-reports/
  summary-latest.md
  report-{date}.md
  anomalies-unresolved.md
  optimal-paths.md
  coverage-map.md
  archetype-performance.md
```

### Entry Point

```bash
# Start the RL agent (runs continuously until stopped)
npx tsx tests/rl/controller.ts

# Start with specific sub-agent only
npx tsx tests/rl/controller.ts --sub-agent=error-recovery

# Resume from checkpoint
npx tsx tests/rl/controller.ts --resume

# Run analysis only (no new episodes)
npx tsx tests/rl/controller.ts --analyze-only

# Generate report from existing data
npx tsx tests/rl/controller.ts --report
```

### npm Scripts (to add to package.json)

```json
{
  "rl:start": "tsx tests/rl/controller.ts",
  "rl:resume": "tsx tests/rl/controller.ts --resume",
  "rl:analyze": "tsx tests/rl/controller.ts --analyze-only",
  "rl:report": "tsx tests/rl/controller.ts --report",
  "rl:dashboard": "tsx tests/rl/controller.ts --dashboard-only"
}
```

---

## Appendix A: Hardware Resource Budget

The RL agent shares the PC with dev server, beta server, Ollama, and Mission Control. Resource allocation:

| Resource  | RL Agent Budget                   | Remaining for Other                                            |
| --------- | --------------------------------- | -------------------------------------------------------------- |
| CPU cores | 4 of 24 threads                   | 20 threads (dev, beta, Ollama, IDE)                            |
| RAM       | 8 GB                              | 120 GB (Ollama 30B models need ~20GB, dev/beta need ~4GB each) |
| GPU       | 0 (CPU-only Q-learning)           | Full 6GB VRAM for Ollama                                       |
| Disk I/O  | SQLite WAL (minimal)              | No contention                                                  |
| Network   | Max 3 concurrent requests to beta | Beta serves other traffic normally                             |

### Ollama Coexistence

The RL agent does NOT call Ollama directly. It interacts with beta.cheflowhq.com, which calls Ollama internally. To prevent RL-triggered AI requests from saturating Ollama:

- RL agent avoids triggering Remy (skips the Remy chat drawer)
- RL agent avoids AI-heavy pages during Ollama-intensive work (if Ollama health check shows high load)
- If Ollama queue depth > 5, RL agent pauses for 30 seconds

## Appendix B: Non-Negotiable Constraints

| Constraint                    | Enforcement                                                |
| ----------------------------- | ---------------------------------------------------------- |
| ONLY beta.cheflowhq.com       | Hardcoded URL allowlist in `url-allowlist.ts`              |
| Never touch production        | URL check on every navigation action                       |
| Never delete real data        | Safety filter blocks destructive actions on non-agent data |
| Zero cloud cost               | SQLite local storage, no external APIs, no cloud compute   |
| Self-contained on PC          | No external dependencies beyond what's already installed   |
| Checkpoint every 100 episodes | Enforced in controller loop                                |
| Max 3 concurrent browsers     | Semaphore in controller                                    |
| Graceful shutdown on Ctrl+C   | Process signal handlers save checkpoint before exit        |

## Appendix C: Success Criteria

The RL system is considered successful when:

1. **Coverage:** Agent has visited 90%+ of all routes accessible to its roles
2. **Goal completion:** 80%+ of archetype goals are achievable by the learned policy
3. **Bug discovery:** At least 10 previously unknown issues found in the first 1,000 episodes
4. **Efficiency insights:** Optimal paths documented for all core workflows
5. **Stability:** Agent runs for 24+ hours continuously without crashing
6. **Actionability:** Every anomaly report includes reproduction steps that a developer can follow
