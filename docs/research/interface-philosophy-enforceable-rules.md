# Interface Philosophy: Enforceable Engineering Rules

> Research compiled 2026-04-03. Sources cited at end.
> Every rule below is enforceable as a code review check, lint rule, or design constraint.

---

## 1. COGNITIVE LOAD CONSTRAINTS

### 1.1 Miller's Law (7 +/- 2 Rule)

**Rule:** No surface presents more than 7 actionable items without grouping.

- Navigation sections: max 7 top-level items visible at once. Overflow into "More" or grouped submenu.
- Form fields: chunk into groups of 5-7. Never show 15+ fields on one screen without sectioning.
- Dashboard cards: max 7 cards visible without scrolling on a default viewport. Additional cards go behind tabs or scroll.
- Dropdown menus: if > 7 options, add search/filter or group with headers.

### 1.2 Hick's Law (Decision Time Scales with Options)

**Rule:** Every screen has exactly ONE primary action. Secondary actions are visually subordinate.

- One `primary` button per view. All others are `secondary`, `ghost`, or `danger`.
- Modal dialogs: one primary CTA, one cancel. Never three equal-weight buttons.
- Settings pages: group related toggles. Never present 20+ toggles in a flat list.
- If a user must choose between > 5 options before proceeding, restructure as a funnel (step 1: category, step 2: specific choice).

### 1.3 Fitts's Law (Target Size and Distance)

**Rule:** Primary action targets are minimum 44x44px (touch) or 32x32px (mouse). Destructive actions are physically distant from confirm actions.

- Primary buttons: min-height 40px, min-width 120px.
- Icon-only buttons: min 32x32px click target, 44x44px on touch devices.
- Delete/destructive buttons: never adjacent to Save/Confirm. Separate by at least 16px gap or place on opposite sides.
- Mobile: all interactive targets min 44x44px per Apple HIG.

---

## 2. PROGRESSIVE DISCLOSURE (Two-Level Maximum)

### 2.1 Core Rule

**Rule:** Maximum two levels of disclosure. If a feature needs three levels, redesign the information architecture.

- Level 1 (default view): shows the 20% of features used 80% of the time.
- Level 2 (expanded/advanced): accessed via clear affordance (button, expander, tab). Contains everything else.
- Never hide critical/frequent actions behind disclosure. Use analytics or task analysis to determine what is "frequent."

### 2.2 Affordance Requirements

**Rule:** Every hidden feature has a visible trigger with strong information scent.

- Triggers must use action verbs or descriptive labels: "Show advanced options", "More filters", "Configure columns."
- Never use vague labels: "More", "Options", "..." without tooltip.
- Expanded sections remember their state within a session (persist open/closed via local state or localStorage).

### 2.3 When NOT to Use Disclosure

- When fields are interdependent (changing field A affects field B's valid values): show both.
- When users frequently need to compare hidden and visible data: show both.
- When the total content is 5 items or fewer: just show everything.

---

## 3. VISUAL WEIGHT HIERARCHY (Linear Method)

### 3.1 Content > Navigation > Chrome

**Rule:** Working content has the highest visual contrast. Navigation is dimmer. Chrome (borders, separators, backgrounds) is dimmest.

- Content text: full contrast (e.g., gray-900 on white).
- Navigation labels: reduced contrast (e.g., gray-500).
- Borders and separators: minimal contrast (e.g., gray-200). Prefer spacing over lines.
- If removing a border and the layout still reads clearly, remove the border.

### 3.2 Color Discipline

**Rule:** Maximum 2 accent colors in any single view. One for primary actions, one for status/alerts.

- Primary accent: used for primary buttons, active states, selected items.
- Status colors: green (success), yellow (warning), red (error), blue (info). These are functional, not decorative.
- Never use color alone to convey meaning. Always pair with icon, text label, or pattern.
- Backgrounds: neutral only (white, gray-50, gray-100). Never colored section backgrounds for decoration.

### 3.3 Icon Discipline

**Rule:** Icons enable recognition, never decoration. Every icon must be removable without losing meaning.

- If removing an icon from a button/menu item makes it ambiguous, the icon earns its place.
- If the text label is sufficient alone, omit the icon.
- Icon sizes: 16px inline, 20px in nav, 24px for primary actions. Never mix sizes within the same visual group.
- No colored icon backgrounds unless the color itself carries semantic meaning (e.g., status dot).

---

## 4. DATA-INK RATIO (Tufte's Principles)

### 4.1 Core Rule

**Rule:** Every pixel must either display data or aid comprehension of data. Remove everything else.

- No decorative chart elements: remove grid lines if axis labels are sufficient. Remove chart borders. Remove redundant legends when only one data series exists.
- No "chart junk": 3D effects, gradient fills, drop shadows on data points, background images behind charts.
- Prefer sparklines and inline metrics over full chart widgets when the data is simple (single trend, single number + delta).

### 4.2 Dashboard Metrics

**Rule:** Every displayed metric must answer a question the user actually asks. No vanity metrics.

- Valid metric test: "What decision would I make differently based on this number?" If no answer, remove it.
- Every number must include context: comparison (vs. last period), benchmark, or threshold.
- Raw counts without context (e.g., "1,247 total events") are vanity metrics. Show rate of change or status instead.
- Zero is data. Failure to load is not zero. These must be visually distinct (see Section 8).

---

## 5. CALM TECHNOLOGY PRINCIPLES (Amber Case)

### 5.1 Peripheral-First Communication

**Rule:** Default state communication is ambient. Center-of-attention demands are reserved for errors and required actions.

| Urgency Level              | Communication Method                     | Example                        |
| -------------------------- | ---------------------------------------- | ------------------------------ |
| Ambient (no action needed) | Subtle indicator, status dot, muted text | "Synced 2m ago"                |
| Informational (FYI)        | Toast that auto-dismisses in 3-5s        | "Changes saved"                |
| Action suggested           | Persistent but dismissible banner        | "3 inquiries need response"    |
| Action required            | Modal or inline alert, blocks progress   | "Payment failed. Update card." |
| Critical/destructive       | Confirmation dialog with typed input     | "Type DELETE to remove"        |

### 5.2 Notification Restraint

**Rule:** Popups/modals are restricted to: destructive confirmations, errors requiring action, and first-time onboarding. Everything else uses inline or toast patterns.

- Auto-dismiss toasts: 3 seconds for confirmations, 5 seconds for warnings.
- Never auto-dismiss error toasts. Errors persist until acknowledged.
- Never stack more than 2 toasts simultaneously. Queue the rest.
- Background sync operations: no toast on success. Toast only on failure.

### 5.3 Minimum Viable Technology

**Rule:** Use the simplest mechanism that solves the problem. Complexity must be earned.

- If a static number solves the need, don't build a chart.
- If a badge count solves the need, don't build a notification panel.
- If a tooltip solves the need, don't build a modal.
- If a text label solves the need, don't build an icon.

---

## 6. OPINIONATED DEFAULTS (Superhuman / Linear Model)

### 6.1 Defaults Over Options

**Rule:** Ship opinionated defaults. Add settings only when user research proves the default doesn't work for a significant segment.

- Every setting added is a decision pushed onto the user. Minimize settings.
- If a feature works well for 80%+ of users with one behavior, ship that behavior. Don't add a toggle for the 20%.
- "Customizable" is not a feature. It is an admission that you don't know what the right answer is.

### 6.2 Keyboard Acceleration (Power User Layer)

**Rule:** Every frequent action has a keyboard shortcut. Shortcuts are discoverable but never required.

- Command palette (Cmd/Ctrl+K): single entry point for all actions. Searchable.
- Show shortcut hints in tooltips and menu items.
- Keyboard shortcuts are the power user layer. Mouse/touch is the default layer. Both reach the same features.
- Never require keyboard for any action. Keyboard is acceleration, not gating.

### 6.3 Feature Density Scaling

**Rule:** New users see the simple version. Complexity surfaces as users demonstrate need.

- First-time view: essential actions only. Advanced options collapsed or hidden.
- Return visits: restore user's last state (expanded sections, applied filters).
- Power features unlock through usage, not through settings pages. Example: bulk actions appear after user has > 10 items.
- Never show empty power features. If a user has 0 recipes, don't show "Bulk recipe import."

---

## 7. DASHBOARD ANTI-PATTERNS (Banned Practices)

### 7.1 Vanity Metrics

**Rule:** A metric displayed on a dashboard must be actionable. If seeing the number doesn't change behavior, remove it.

Banned patterns:

- Total count without trend (e.g., "1,247 clients" with no growth indicator).
- Percentage without denominator (e.g., "87% complete" of what?).
- Activity counts without outcome (e.g., "42 emails sent" but no response rate).
- Metrics that only go up (cumulative totals that never decrease are noise after week 1).

### 7.2 Additive-Only UI

**Rule:** Adding a widget/card/section to the dashboard requires removing or consolidating something of equal or lesser value.

- Dashboard real estate is finite. Treat it like physical space.
- Quarterly audit: review every dashboard element. If it hasn't driven a decision in 90 days, remove it.
- Feature flags that show UI must have expiration dates. Feature flag without cleanup date = tech debt.

### 7.3 Information Without Hierarchy

**Rule:** Dashboard items have exactly three tiers. No item exists outside this hierarchy.

- Tier 1 (Hero): 1-2 metrics. Largest type, top of page. The thing the user came here to see.
- Tier 2 (Supporting): 3-5 metrics. Standard size. Context for Tier 1.
- Tier 3 (Detail): Everything else. Smaller, below fold, or behind tabs.

If everything is Tier 1, nothing is Tier 1. Enforce the constraint.

---

## 8. STATE VISIBILITY (The Five States)

### 8.1 Every Data-Driven Component Handles All Five States

**Rule:** No component ships without explicit handling for: Empty, Loading, Loaded, Error, and Partial.

| State       | Visual Treatment                                      | Constraint                                                     |
| ----------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| **Empty**   | Illustration or icon + explanatory text + primary CTA | Never show a blank area. Never show "0" as if it were data.    |
| **Loading** | Skeleton screen (preferred) or contextual spinner     | No spinners for < 1s. No full-page spinners ever.              |
| **Loaded**  | Content renders                                       | Default happy path                                             |
| **Error**   | Error message + retry action                          | Never show zeros/defaults on error. Never auto-dismiss errors. |
| **Partial** | Loaded content + inline error for failed sections     | One failing widget doesn't blank the whole page.               |

### 8.2 Loading State Timing Rules

| Duration   | Treatment                                       |
| ---------- | ----------------------------------------------- |
| < 100ms    | Instant render, no indicator                    |
| 100ms - 1s | No indicator (too brief to be useful)           |
| 1 - 2s     | Skeleton screen or subtle spinner               |
| 2 - 10s    | Progress bar or step indicator                  |
| 10s+       | Background task with notification on completion |

### 8.3 Success Communication

**Rule:** Success is communicated proportionally to the action's significance.

- Trivial actions (toggle, minor edit): no feedback or subtle inline change (checkmark, color shift).
- Standard actions (save, update): auto-dismissing toast (3s).
- Significant actions (publish, send, delete): persistent confirmation with undo option.
- Never celebrate routine actions. A confetti animation on "settings saved" trains users to distrust the interface.

---

## 9. DIETER RAMS TRANSLATED TO SOFTWARE

### 9.1 Enforceable Subset

| Rams Principle               | Software Constraint                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Useful                       | Every visible element serves a user goal. Decorative elements are banned from functional surfaces.                                |
| Understandable               | Labels use plain language. No jargon without tooltip. No ambiguous icons without text.                                            |
| Unobtrusive                  | The interface never calls attention to itself. Users notice their work, not the tool.                                             |
| Honest                       | UI never implies capability that doesn't exist. No fake buttons, no placeholder features shown as real.                           |
| Long-lasting                 | No trend-driven styling (gradients, glassmorphism, etc.) that will look dated in 18 months. Neutral palette, standard typography. |
| As little design as possible | If a simpler version communicates the same information, use it. Fewer borders, fewer colors, fewer font weights.                  |

---

## 10. APPLE HIG CONSTRAINTS (Applicable to Web)

### 10.1 Clarity, Deference, Depth

- **Clarity:** Text is legible at every size. Icons are precise. Functional elements are unambiguous.
- **Deference:** The UI serves the content. Full-bleed content, minimal chrome, borderless where possible.
- **Depth:** Visual layers communicate hierarchy. Modals float above. Toasts float above modals. Use shadow/elevation sparingly but consistently.

### 10.2 Touch Target Minimums (Cross-Platform)

- Minimum 44x44pt for all interactive elements on touch.
- Minimum 24x24px for mouse-only targets.
- Spacing between adjacent targets: minimum 8px.

---

## SUMMARY: THE 10 ENFORCEABLE LAWS

1. **Max 7 visible actions** without grouping (Miller).
2. **One primary action per view** (Hick).
3. **Two disclosure levels max** (Progressive Disclosure).
4. **Content outweighs chrome** in visual contrast (Linear).
5. **Every metric must be actionable** or it's removed (Tufte + anti-vanity).
6. **Ambient by default, attention on demand** (Calm Tech).
7. **Ship defaults, not options** (Superhuman/Linear).
8. **Five states handled** for every data component (State Visibility).
9. **Adding UI requires removing UI** of equal or lesser value (Anti-additive).
10. **The interface is invisible** when everything works (Rams/Apple).

---

## Sources

- [Progressive Disclosure - Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure in SaaS UX Design](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Progressive Disclosure - GitLab Pajamas Design System](https://design.gitlab.com/patterns/progressive-disclosure/)
- [Cognitive Load Laws in UX](https://www.toptal.com/designers/ux/laws-of-ux-infographic)
- [Miller's Law in UX Design](https://careerfoundry.com/en/blog/ux-design/what-is-millers-law/)
- [Hick's Law and UX Design](https://dovetail.com/ux/hicks-law/)
- [Linear Method - Principles & Practices](https://linear.app/method/introduction)
- [A Calmer Interface for a Product in Motion - Linear](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear Design Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [The Linear Method: Opinionated Software - Figma Blog](https://www.figma.com/blog/the-linear-method-opinionated-software/)
- [Superhuman Product Review](https://medium.com/swlh/superhumans-superpowers-a-product-review-6f21535b9a45)
- [Superhuman Review 2026](https://max-productive.ai/ai-tools/superhuman/)
- [Principles of Calm Technology](https://www.designprinciplesftw.com/collections/principles-of-calm-technology)
- [Calm Technology - Amber Case](https://calmtech.com/)
- [Calm Tech Institute Principles](https://www.calmtech.institute/calm-tech-principles)
- [Tufte's Data-Ink Ratio Principles](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html)
- [Data-Ink Ratio Explained](https://simplexct.com/data-ink-ratio)
- [Dieter Rams: 10 Principles Applied to UX](https://medium.com/swlh/how-dieter-rams-10-principles-of-good-design-can-impact-ux-c2f369218a08)
- [Dieter Rams in Modern Software - ArjanCodes](https://arjancodes.com/blog/dieter-rams-design-principles-in-modern-software-development/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)
- [Apple HIG Impact on UX](https://encyclopedia.design/2025/02/03/the-essence-of-apple-design-a-deep-dive-into-human-centered-innovation/)
- [Material Design Principles](https://medium.com/design-bootcamp/material-design-principles-20-key-takeaways-for-ui-ux-designers-e411a38a4365)
- [Dashboard UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Loading UX Patterns - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)
- [Dashboard Design Principles 2025 - UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [Vanity Metrics Anti-Pattern - minware](https://www.minware.com/guide/anti-patterns/vanity-metrics)
- [UI States: Loading, Error, Empty - LogRocket](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/)
- [Empty States - Nielsen Norman Group](https://www.nngroup.com/articles/empty-state-interface-design/)
- [Stripe Payment UX](https://www.illustration.app/blog/stripe-payment-ux-gold-standard)
