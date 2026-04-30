# Spec: Universal Interface & Interaction Philosophy

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (governance document, applies to all files)

## Timeline

| Event         | Date             | Agent/Session      | Commit |
| ------------- | ---------------- | ------------------ | ------ |
| Created       | 2026-04-03 16:00 | Planner (Opus 4.6) |        |
| Status: ready | 2026-04-03 16:30 | Planner (Opus 4.6) |        |
| Integrated    | 2026-04-03       | Builder (Opus 4.6) |        |
| Verified      | 2026-04-30 19:15 | Codex Builder      | pending |

---

## Developer Notes

### Raw Signal

The developer described this as a **universal philosophy**, not a UI design, not a layout, not a component library. It governs how a system **behaves** when a human interacts with it.

Key phrases from the prompt:

- "functional, operational, used by real people who are busy"
- "not meant to be explored like a toy"
- "not meant to be cluttered with unnecessary controls"
- "the interface never becomes cluttered"
- "the user only sees what they need in the moment"
- "features do not compete for attention"
- "advanced functionality does not overwhelm basic usage"
- "the system feels simple even when it is powerful"
- "Only strict, enforceable rules"
- "Must be reusable across ANY project"
- "No fluff, no aesthetic commentary, no 'nice to have' language"

The developer also mandated cross-perspective research: chef, consumer, developer, entrepreneur, and business owner. The intent is that this philosophy is validated against how real humans in different roles actually interact with operational software, not theoretical design principles applied in a vacuum.

### Developer Intent

- **Core goal:** Create the governing document that prevents interface degradation before it happens, applicable universally but grounded in real operator needs
- **Key constraints:** No aesthetic commentary. No aspirational language. Only enforceable rules. Must work for any project, not just ChefFlow.
- **Motivation:** ChefFlow grew to 265 pages, 65+ widgets, 100+ nav routes, and 13 nav groups. The UX master plan diagnosed the clutter but did not prevent it. This document exists so that every future spec, every builder, every component addition must pass through these rules first.
- **Success from the developer's perspective:** Any UI built after this document is clean, focused, and intentional. No system degrades into clutter. The interface always prioritizes what matters now.

---

## What This Does (Plain English)

This is a set of strict, enforceable rules that govern how any software system presents itself to a human. It sits above design systems, above component libraries, above individual specs. Every page, widget, button, modal, and notification in the system must comply with these rules. A builder reading this document knows exactly what is allowed, what is forbidden, and how to resolve conflicts between competing interface elements.

---

## Why It Matters

ChefFlow has 265 pages and growing. Without a governing philosophy that prevents clutter at the spec level, every new feature adds visual noise. The UX master plan found the damage. This document prevents it from happening again. It is also portable: any future project the developer builds inherits this philosophy.

---

## Files to Create

| File                                           | Purpose                        |
| ---------------------------------------------- | ------------------------------ |
| `docs/specs/universal-interface-philosophy.md` | This file. The governing spec. |

## Files to Modify

| File                         | What to Change                                                        |
| ---------------------------- | --------------------------------------------------------------------- |
| `CLAUDE.md`                  | Add reference to this spec as a mandatory read for all builder agents |
| `docs/definition-of-done.md` | Add interface philosophy compliance as a release requirement          |

---

## Database Changes

None.

---

## Data Model

Not applicable. This is a governance document.

---

## Server Actions

Not applicable.

---

## THE UNIVERSAL INTERFACE & INTERACTION PHILOSOPHY

Every rule below is enforceable. Every rule applies to every surface. No exceptions unless explicitly scoped.

---

## 1. CORE PHILOSOPHY

Five principles. Everything that follows derives from these.

**1.1. The interface serves the work, never itself.**
The user came to accomplish a task. Every pixel either helps them accomplish it or is in the way. There is no middle ground. The tool is invisible when it works correctly.

**1.2. Show only what matters right now.**
The correct amount of information is the minimum required for the current task. Not the minimum possible (that is unusable). Not the maximum available (that is clutter). The minimum required.

**1.3. Complexity is earned, never imposed.**
Advanced features exist behind simple surfaces. A first-time user and a power user see the same product, but at different depths. The first-time user is never overwhelmed. The power user is never limited.

**1.4. Honest over smooth.**
The system never lies. It never shows fake success, fake data, fake progress, or fake capability. If something failed, it says so. If something is unavailable, it says so. A visible error is always better than an invisible lie.

**1.5. Opinionated by default, flexible on demand.**
The system makes decisions so the user does not have to. Defaults are correct for 80% of users. Customization exists for the 20% but is never required. Every setting is an admission the product team could not decide.

---

## 2. VISIBILITY RULES

### What is visible by default

- The primary action for the current context (exactly one)
- Status indicators that require attention (errors, pending actions)
- Navigation to the user's most-used areas (max 7 top-level items)
- Content the user is actively working with
- The user's current position in the system (breadcrumb, page title, active nav state)

### What is hidden by default

- Advanced settings and configuration
- Historical data, logs, and audit trails
- Bulk operations (until the user has enough items to warrant them)
- Admin and diagnostic tools
- Features the user has never used
- Metrics that do not drive decisions
- Empty feature shells (if data does not exist, the feature surface does not render)

### How secondary features are revealed

- Explicit trigger with descriptive label ("Show advanced options", "More filters")
- Never through unlabeled icons, mystery hamburger menus, or "..." without tooltip
- Expanded sections remember their state within a session
- Maximum two levels of disclosure. If a feature needs three levels, the information architecture is wrong.

### How the system avoids overwhelming the user

- Maximum 7 actionable items visible in any group without sub-grouping (Miller's Law)
- Maximum 7 dashboard cards visible without scrolling on a default viewport
- Dropdowns with > 7 options include search or group headers
- Forms chunk into groups of 5-7 fields. Never 15+ fields on one screen without sectioning.

---

## 3. CONTEXTUAL RENDERING

### How the interface adapts to the current task

The system determines context from three signals:

1. **Location:** What page/route the user is on defines the task domain
2. **State:** What data exists (empty, partial, full) determines what controls are relevant
3. **Temporal mode:** What time-sensitive phase the user is in (planning, executing, reviewing) shifts priority

### How irrelevant elements are removed

- Features outside the current task domain are suppressed, not just de-emphasized
- Empty-state features hide their advanced controls (if a user has 0 items, do not show "Bulk import", "Export CSV", or "Advanced filters")
- Completed workflow steps collapse. In-progress steps expand.
- Navigation highlights the current area and de-emphasizes unrelated areas

### How the system determines "what matters right now"

Priority is determined by this hierarchy (highest to lowest):

1. **Errors and failures** requiring immediate action
2. **Active task** the user is performing right now
3. **Pending decisions** that block progress
4. **Notifications** that are actionable right now
5. **Background status** that is informational only
6. **Historical and analytical data** that supports future planning

If two elements compete for the same visual space, the one higher in this hierarchy wins.

---

## 4. PROGRESSIVE DISCLOSURE

### How advanced features are layered

**Level 1 (default view):** The 20% of features used 80% of the time. This is what every user sees on every visit.

**Level 2 (expanded view):** Accessed via explicit affordance (button, expander, tab). Contains advanced options, detailed settings, power features. The trigger always uses action verbs: "Show advanced options", "Configure columns."

There is no Level 3. If a feature requires three levels of disclosure, the information architecture must be redesigned.

### How users access deeper functionality

- Click/tap on clearly labeled triggers (never vague labels like "More" or "Options" without tooltip)
- Keyboard shortcut layer (Cmd/Ctrl+K command palette) gives instant access to any action without navigating
- Search is always available and reaches every feature, every setting, every action
- Context menus (right-click) provide secondary actions without polluting the primary interface

### How complexity is introduced without clutter

- New users see essential actions only. Advanced options are collapsed.
- Power features surface through usage, not configuration. Example: bulk actions appear after the user has >10 items.
- Return visits restore the user's last state (expanded sections, applied filters, column widths).
- Never show empty power features. If the precondition is not met, the feature does not render.

### When NOT to use progressive disclosure

- When fields are interdependent (changing field A affects field B): show both
- When users frequently need to compare hidden and visible data: show both
- When the total content is 5 items or fewer: show everything

---

## 5. INTERACTION PRIORITY

### What actions are primary vs secondary

Every screen has exactly **one primary action**. This is the thing the user most likely came here to do. All other actions are secondary, tertiary, or contextual.

| Priority        | Visual treatment                                                                        | Examples                          |
| --------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| **Primary**     | `primary` button variant, prominent placement, largest target                           | "Save", "Send", "Create Event"    |
| **Secondary**   | `secondary` or `ghost` button variant, adjacent to primary                              | "Cancel", "Save as Draft"         |
| **Tertiary**    | Text link, icon button, or context menu item                                            | "Delete", "Export", "Archive"     |
| **Destructive** | `danger` variant, physically separated from primary by 16px+ or placed on opposite side | "Delete Account", "Remove Client" |

### How the system emphasizes the most important action

- One `primary` button per view. Never two. If two actions seem equally important, one is wrong.
- The primary action is closest to the user's likely cursor/thumb position (bottom-right on desktop, bottom-center on mobile)
- Destructive actions are never adjacent to confirm actions. Minimum 16px separation or opposite-side placement.
- Modal dialogs: one primary CTA, one cancel. Never three equal-weight buttons.

### How competing actions are prevented

- Actions that apply to different scopes are in different visual groups (page-level actions vs. row-level actions)
- Inline actions (on a row/card) are icon-only with tooltip. They do not compete with page-level actions.
- If more than 3 actions apply to a single item, overflow into a context menu. Show the top 2-3, collapse the rest.

---

## 6. COGNITIVE LOAD CONSTRAINTS

### Maximum number of visible elements

| Surface                          | Maximum | When exceeded                                  |
| -------------------------------- | ------- | ---------------------------------------------- |
| Top-level nav items              | 7       | Overflow into "More" or grouped submenu        |
| Dashboard hero metrics           | 2       | Demote to supporting tier                      |
| Dashboard supporting metrics     | 5       | Move to detail tier (below fold or behind tab) |
| Form fields per visible section  | 7       | Chunk into collapsible groups                  |
| Table columns (default)          | 7       | Additional columns behind "Configure columns"  |
| Buttons on a single toolbar      | 5       | Overflow into context menu                     |
| Simultaneous toast notifications | 2       | Queue the rest                                 |
| Tabs on a single page            | 6       | Use dropdown for overflow                      |

### Limits on simultaneous decisions

- One decision per step in any multi-step flow. Never combine "choose a category" and "fill in details" on the same screen unless the total fields are under 5.
- Settings pages group related toggles. Never present 20+ toggles in a flat list.
- If a choice has > 5 options, restructure as a funnel (step 1: category, step 2: specific choice).
- Binary decisions (yes/no, on/off) use toggles. Multi-option decisions use radio buttons or segmented controls. Never use a dropdown for 2-3 options.

### How the system reduces thinking

- **Opinionated defaults:** Every field that can have a sensible default has one pre-selected
- **Smart pre-fill:** Infer values from context (today's date, user's timezone, most common option)
- **Inline validation:** Show errors as the user types, not after submission
- **Confirmation patterns:** Routine saves do not ask "Are you sure?" Only destructive/irreversible actions require confirmation.
- **Decision classification:** Not all choices deserve equal UI weight. A notification about a new inquiry deserves attention. A system update does not. Weight accordingly.

---

## 7. FEEDBACK & STATE VISIBILITY

### The Five States (mandatory for every data-driven component)

Every component that displays data must handle all five states explicitly. No exceptions.

| State       | Visual Treatment                                   | Constraint                                                                                                    |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Empty**   | Illustration/icon + explanatory text + primary CTA | Never a blank area. Never "0" as if it were real data. Guide the user to create their first item.             |
| **Loading** | Skeleton screen (preferred) or contextual spinner  | No spinner for < 1s. No full-page spinners ever. One failing section does not blank the whole page.           |
| **Loaded**  | Content renders normally                           | Default happy path                                                                                            |
| **Error**   | Error message + retry action + what went wrong     | Never show zeros/defaults on error. Never auto-dismiss errors. Specific messages, not "Something went wrong." |
| **Partial** | Loaded content + inline error for failed sections  | Graceful degradation. Show what loaded. Flag what did not.                                                    |

### Loading state timing

| Duration   | Treatment                                       |
| ---------- | ----------------------------------------------- |
| < 100ms    | Instant render, no indicator                    |
| 100ms - 1s | No indicator (too brief to be useful)           |
| 1 - 2s     | Skeleton screen or subtle spinner               |
| 2 - 10s    | Progress bar or step indicator                  |
| 10s+       | Background task with notification on completion |

### How feedback is immediate and unambiguous

**Urgency model (5 tiers):**

| Urgency              | Mechanism                               | Example                        | Behavior                                |
| -------------------- | --------------------------------------- | ------------------------------ | --------------------------------------- |
| Ambient              | Status dot, muted text                  | "Synced 2m ago"                | Always visible, never demands attention |
| Informational        | Auto-dismissing toast (3s)              | "Changes saved"                | Confirms action, disappears             |
| Action suggested     | Persistent dismissible banner           | "3 inquiries need response"    | Stays until dismissed or resolved       |
| Action required      | Modal or inline alert                   | "Payment failed. Update card." | Blocks progress until resolved          |
| Critical/destructive | Confirmation dialog with explicit input | "Type DELETE to remove"        | Prevents accidental destruction         |

**Success is proportional to significance:**

- Trivial actions (toggle, minor edit): subtle inline change (checkmark, color shift). No toast.
- Standard actions (save, update): auto-dismissing toast (3s)
- Significant actions (publish, send, delete): persistent confirmation with undo option
- Background sync success: no feedback. Toast only on failure.
- Never celebrate routine actions. Confetti on "settings saved" trains users to distrust the interface.

---

## 8. TOGGLE-BASED ENHANCEMENT MODEL

### How optional features can be turned on/off

- Features are grouped into modules. Each module is either active or inactive.
- Inactive modules are invisible: no nav items, no dashboard widgets, no settings sections.
- Activating a module instantly surfaces its UI elements in the appropriate locations.
- Deactivating a module removes all its surfaces. No orphaned menu items, no dead links.

### How the interface remains clean by default

- The default module set is the minimum viable configuration for a new user
- Modules that serve niche workflows (advanced analytics, bulk operations, integrations) are off by default
- Module activation is reversible at any time
- The system never prompts users to activate modules they have not sought out

### How power users expand functionality without affecting simplicity

- Power features live inside modules. Activating a module does not change the base interface for other modules.
- Keyboard shortcuts are the acceleration layer. They are discoverable (shown in tooltips and menus) but never required.
- Command palette (Cmd/Ctrl+K) is the universal access point. Every action, setting, and navigation target is searchable.
- Power users customize through usage patterns, not through settings pages. The system learns what matters to them.

---

## 9. DEFAULT STATE DEFINITION

### What the system looks like when first opened

- Dashboard shows 1-2 hero metrics (or empty state with clear first action)
- Navigation shows the core areas only (max 7 items)
- No banners, no announcements, no "what's new" modals
- The primary action is obvious and prominent
- If no data exists, the empty state guides the user to create their first item

### What a "clean state" means

A clean state is one where:

- Every visible element serves the user's current task
- No orphaned widgets (widgets with no data and no relevance)
- No stale notifications or unresolved alerts
- Navigation reflects only active modules
- The page loads in under 2 seconds on a standard connection

### What must NOT be present by default

- Feature announcements or changelog modals
- Promotional upsells or plan comparison tables
- Metrics the user has never asked for
- Configuration wizards that block access to the app
- Sample/demo data mixed with real data without clear visual distinction
- Tooltips or walkthroughs that fire on every visit
- Empty feature sections ("You have no X yet" for features the user has not activated)

### The walk-away test

If a user creates an account, does one thing, and returns a week later, they see:

- A clear indication of where they left off
- Their most recent work front and center
- A single clear next step
- Not: a wall of empty widgets, a dashboard full of zeros, or a "complete your profile" blocker

### The notepad test

For any routine data entry task (log an expense, note a preference, record a measurement): if a pen and notepad is faster than the software, the software has failed at that task. Routine data entry must be completable in under 10 seconds.

---

## 10. FAILURE & ERROR UX PHILOSOPHY

### How errors are shown

- Errors are shown inline, at the point of failure, with specific language
- "Your card was declined" not "Something went wrong"
- "Email address is already registered" not "Invalid input"
- Form errors appear next to the field that caused them, not in a banner at the top
- Errors never auto-dismiss. The user acknowledges them explicitly.

### How they avoid confusion

- Error messages use plain language. No error codes, no technical jargon, no stack traces in the UI.
- The message explains what happened, not what the system did internally
- Red is reserved for errors. Never use red for decorative purposes on a page that also has error states.
- Error states are visually distinct from empty states. "No data exists" and "failed to load data" must never look the same.

### How recovery is presented

- Every error message includes a recovery action: "Try again", "Go back", "Contact support"
- If the user can fix the error themselves (wrong input, missing field), the UI focuses on the fixable field
- If the error is systemic (server down, network failure), the message says so honestly and provides a retry mechanism
- Retry mechanisms do not require the user to re-enter data they already provided
- After successful recovery, the system confirms the issue is resolved: "Payment processed successfully"

---

## 11. ANTI-PATTERNS (Strictly Forbidden)

These patterns are banned from all surfaces. Any builder encountering them in existing code must flag them.

### Cluttered dashboards

- More than 2 hero metrics: violation
- More than 7 total visible widgets without scrolling: violation
- Metrics without context (raw count, no comparison): violation
- Cumulative-only metrics that never decrease: violation after first week

### Unnecessary metrics

- The vanity metric test: "What decision would I make differently based on this number?" If no answer exists, remove it.
- Percentages without denominators: banned
- Activity counts without outcomes (e.g., "42 emails sent" with no response rate): banned
- Every displayed number must include comparison context (vs. last period, benchmark, or threshold)

### Redundant controls

- Same action accessible from two places on the same screen: violation
- Two buttons that do the same thing with different labels: violation
- A dropdown and a set of radio buttons for the same setting: violation

### Competing UI elements

- Two `primary` buttons on the same screen: violation
- Equal-weight CTAs that force the user to choose between them: violation
- Multiple sections competing for "hero" position (largest, most prominent): violation

### Hidden critical actions

- A destructive action (delete, cancel, remove) available only through a context menu with no other indicator: violation
- A required action (save, submit, confirm) that is not visible without scrolling: violation
- An error state that is only visible in a collapsed section: violation

### Additional banned patterns

- Forced onboarding gates that block navigation
- Full-page loading spinners
- Auto-playing animations or videos
- Tooltips that cover the element they describe
- Settings pages with more than 20 items in a flat list
- Notification badges on items the user has never used
- "Coming soon" labels on visible features (hide them instead)
- Empty feature shells rendered as if they are functional
- Color used as the sole indicator of meaning (always pair with icon or text)

---

## 12. CONSISTENCY RULES

### How interactions behave consistently across the system

**Same pattern, same behavior, everywhere:**

| Pattern     | Consistent behavior                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Save        | Always persists immediately. Toast confirms. No intermediate "are you sure?" for non-destructive saves.                    |
| Delete      | Always requires confirmation. Never instant. Always reversible for 10 seconds (undo) or requires explicit confirmation.    |
| Cancel      | Always returns to the previous state with no data loss. If the user entered data, prompt "Discard changes?"                |
| Form submit | Always validates inline first. Server errors appear at the point of failure. Success redirects or confirms.                |
| Navigation  | Active item is always visually distinct. Current page title always matches nav label.                                      |
| Modals      | Always closeable with Escape key and backdrop click. Always have a visible close button. Never nest modals.                |
| Lists       | Always sortable by at least one column. Default sort is most-recent-first unless a different sort is semantically correct. |
| Search      | Always instant-filter (no submit button). Always shows result count. Empty results show suggestions.                       |

### How users build trust through predictability

- Every interaction follows the same timing: save always takes the same perceived time, navigation always animates the same way, errors always appear in the same position
- The system never changes behavior based on hidden state. If the same button does different things in different contexts, each context has a different label.
- Keyboard shortcuts are global and consistent. Cmd+S always saves. Escape always closes. Enter always confirms the primary action.
- Typography, spacing, and color follow a strict scale. No one-off sizes, no custom spacing, no color values outside the palette.
- The system never moves elements the user is about to interact with (no layout shifts during loading)

---

## RESEARCH FOUNDATION

This spec is grounded in cross-perspective research from four domains:

1. **Chef/Operator perspective** ([chef-software-ux-patterns.md](../research/chef-software-ux-patterns.md)): 76% say tech helps but only 13% are satisfied. Progressive disclosure must be temporal (planning/prep/service/admin modes), not just role-based. Glanceable in under 2 seconds. 4-7 item working memory limit under pressure.

2. **Consumer perspective** ([consumer-platform-interaction-patterns.md](../research/consumer-platform-interaction-patterns.md)): 50ms credibility judgment. 10x conversion when options reduced from 24 to 6. 7-8 form fields optimal, 4-6% drop per additional field. Skeleton screens feel 20-30% faster than spinners.

3. **Developer/framework perspective** ([interface-philosophy-enforceable-rules.md](../research/interface-philosophy-enforceable-rules.md)): Miller's Law, Hick's Law, Fitts's Law translated to concrete maximums. Tufte's data-ink ratio. Amber Case's calm technology tiers. Linear/Superhuman opinionated defaults model.

4. **Entrepreneur/business perspective** ([operator-interface-philosophy-research.md](../research/operator-interface-philosophy-research.md)): 88 apps average, 1,100 context switches/day. 91% drop off within 14 days. Time-to-first-value under 5 minutes. The notepad test. Admin fatigue threshold. Salesforce syndrome.

---

## Edge Cases and Error Handling

| Scenario                                                | Correct Behavior                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| New feature added without removing existing UI          | Builder must identify what to remove or consolidate before the feature ships                                   |
| Two features compete for hero position on dashboard     | The feature with higher-urgency data wins. The other moves to supporting tier.                                 |
| A page has more than 7 nav items after adding a feature | Overflow into grouped submenu or "More"                                                                        |
| Power user wants all advanced options visible always    | Restored from their last session state, but default state remains clean for new users                          |
| Module is activated with no data                        | Module surfaces appear but show empty states, not blank areas                                                  |
| Error occurs during a multi-step form                   | Error shown inline at the failing step. Previously completed steps remain intact. User does not re-enter data. |

---

## Verification Steps

This is a governance document. Verification is ongoing, not one-time:

1. Every new spec must reference this document and demonstrate compliance
2. Every builder must confirm their implementation passes the anti-pattern checklist (Section 11)
3. Every new dashboard widget must pass the vanity metric test
4. Every new page must demonstrate all five states (Section 7)
5. Every new form must count fields and stay under the 7-per-section maximum
6. Every new navigation addition must not push any group past 7 top-level items

---

## Out of Scope

- Specific component implementations (that is the component library's job)
- Color palettes, typography scales, or spacing values (that is the design system's job)
- ChefFlow-specific features (this is universal; ChefFlow applies it but does not own it)
- Accessibility standards (WCAG compliance is assumed as a baseline, not governed here)
- Performance budgets (render time, bundle size targets are infrastructure, not philosophy)

---

## Notes for Builder Agent

- This document is a **governance spec**, not a feature spec. It does not produce a build. It produces rules.
- **Start with the gap analysis:** `docs/interface-philosophy-gap-analysis.md` maps every current violation, what's compliant, and the fix priority order. Read it before building anything UI-related.
- When building any feature, check your implementation against Sections 2, 5, 6, 7, and 11 before marking done.
- The anti-pattern list (Section 11) is a hard checklist. If you find a violation during implementation, fix it or flag it.
- The Five States (Section 7) are non-negotiable. Every data component handles Empty, Loading, Loaded, Error, and Partial.
- When in doubt between adding a feature surface and hiding it: hide it. Complexity is earned.
- The notepad test (Section 9) and the vanity metric test (Section 11) are your two quickest sanity checks.
