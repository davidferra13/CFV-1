# Research: Chef Shell Clarity Intent Audit

## Origin Context

The preserved developer signal for this work is that the product currently risks feeling uncanny, cluttered, low-personality, and over-exposed, while also failing to leverage existing interaction patterns and honest architecture tradeoffs. The permanent spec now records that this work is supposed to reduce control-panel density, reuse existing surfaces, keep capability reachable without shouting it, and stay proof-driven rather than speculative. `docs/specs/chef-shell-clarity-and-guided-settings.md:33-70`

This audit is therefore answering one question: does the shell-clarity spec actually preserve that anti-AI-slop intent in a buildable way, or would a builder still be likely to ship a thinner version of the same problem. `docs/session-log.md:698-705` `docs/specs/chef-shell-clarity-and-guided-settings.md:33-70`

The intent also matches the earlier navigation work that defined the chef shell as something that should make the chef feel "at ease" by front-loading daily-driver actions while leaving the full directory one click away. `docs/specs/navigation-action-bar.md:14-20`

## Summary

The codebase supports the spec's core diagnosis. ChefFlow already has strong primitives, but they are presented with too much simultaneous density: the dashboard stacks many sections in one pass, the Command Center renders a 24-area feature encyclopedia with hover quick links, the nav config currently exposes 15 action-bar shortcuts under a "nothing hidden" rule, and the sidebar shows both the full directory and recent history in expanded form by default. `app/(chef)/dashboard/page.tsx:308-470` `components/dashboard/command-center.tsx:73-535` `components/navigation/nav-config.tsx:1-4` `components/navigation/nav-config.tsx:1930-1947` `components/navigation/chef-nav.tsx:1003-1054` `components/navigation/all-features-collapse.tsx:44-99` `components/navigation/recent-pages-section.tsx:41-127`

The spec now preserves the anti-clutter, leverage-first, and proof-first intent well enough for a builder to execute the shell restructure. The remaining risk is not that the spec points in the wrong direction; it is that a builder could still implement it as a tidy but visually generic reskin, because the file plan stays focused on hierarchy and disclosure rather than example-driven states or a stronger visual point of view. `docs/specs/chef-shell-clarity-and-guided-settings.md:33-70` `docs/specs/chef-shell-clarity-and-guided-settings.md:74-111`

## Detailed Findings

### 1. Reuse-first is the right principle for this repo

The shell already mounts a persistent sidebar, mobile nav, and universal command palette at the layout level, so the app does not need another parallel entry system to feel guided. The command palette already exposes quick actions plus top navigation when the query is empty, and the create menu already centralizes direct-create links from shared navigation config. That makes the spec's "reuse existing mechanisms first" instruction evidence-backed, not stylistic preference. `app/(chef)/layout.tsx:153-185` `components/search/command-palette.tsx:28-97` `components/search/command-palette.tsx:199-215` `components/navigation/create-menu-dropdown.tsx:12-74` `docs/specs/chef-shell-clarity-and-guided-settings.md:41-56`

### 2. The current shell really is too directory-like

The dashboard currently reads as a long stack of greeting/actions, onboarding, hero metrics, Command Center, Respond Next, Dinner Circles, priority queue, touchpoints, schedule, weekly briefing, coverage health, alerts, intelligence, and business sections. The Command Center itself defines 24 feature areas across daily work, pipeline, culinary, finance, operations, commerce, marketing, analytics, safety, AI, and settings, then renders them as expandable cards with hover-revealed quick links. The server data loader fetches 18 counts in parallel just to support that overview. This is real evidence for the developer's complaint that the shell feels like a feature inventory rather than a guided workspace. `app/(chef)/dashboard/page.tsx:308-470` `components/dashboard/command-center.tsx:73-535` `app/(chef)/dashboard/_sections/command-center-data.tsx:33-123`

The sidebar repeats the same pattern. The config comment says the rule is "nothing hidden," the action bar currently has 15 shortcuts, the full directory defaults open on first load, the recent-pages section defaults open, and the recent-pages hook stores up to 8 visits. The result is high discoverability, but not a calm shell. `components/navigation/nav-config.tsx:1-4` `components/navigation/nav-config.tsx:1930-1947` `components/navigation/all-features-collapse.tsx:44-99` `components/navigation/recent-pages-section.tsx:41-127` `hooks/use-recent-pages.ts:1-12` `hooks/use-recent-pages.ts:101-140`

### 3. Settings and integrations already show the exact hierarchy problem the spec is trying to fix

The root settings page advertises "organized categories" and then renders a large grouped directory of categories and links inside accordion shells. That structure is functional, but it still starts with taxonomy rather than "what do I probably need right now." The spec's guided-overview addition is consistent with the current page structure and does not require new backend concepts. `app/(chef)/settings/page.tsx:105-260` `components/settings/settings-category.tsx:54-109` `docs/specs/chef-shell-clarity-and-guided-settings.md:53-56` `docs/specs/chef-shell-clarity-and-guided-settings.md:106-111`

The integrations page is an even clearer example. It already begins with the more guided `TakeAChefSetup` and `PlatformSetup` cards, but then immediately drops into a provider-by-provider integration matrix and an always-open "Connect New Account" form. The code therefore supports the spec's idea of preserving the good guided flows while demoting raw provider inventory and manual account connection into an explicitly advanced layer. `app/(chef)/settings/integrations/page.tsx:59-99` `components/integrations/take-a-chef-setup.tsx:74-215` `components/integrations/platform-setup.tsx:153-191` `components/settings/integration-center.tsx:72-183` `components/integrations/connected-accounts.tsx:101-205`

### 4. Modules and focus mode still carry stale semantics that could pollute the build

The modules page still frames the feature as choosing which features appear in the sidebar, the client component still imports `Sparkles` and `Lock`, still receives `tier` and `isGrandfathered`, and still describes the enabled state as "Strict Focus Mode." It also warns that hidden areas remain reachable by direct URL. Meanwhile, `isFocusModeEnabled()` still defaults to `true` for missing preferences, while the shared layout cache falls back to `false`, and `lib/billing/modules.ts` still documents Free-vs-Pro access semantics and upgrade-prompt behavior. A builder who only reads this area casually could easily reintroduce lock/tier thinking into a shell-clarity pass that is supposed to be about optional simplification, not deprivation. `app/(chef)/settings/modules/page.tsx:20-35` `app/(chef)/settings/modules/modules-client.tsx:3-23` `app/(chef)/settings/modules/modules-client.tsx:108-170` `lib/billing/focus-mode-actions.ts:13-29` `lib/chef/layout-cache.ts:45-69` `lib/billing/modules.ts:5-10` `lib/billing/modules.ts:149-176`

### 5. The shell spec is right to fence AI trust-boundary work, but builders still need the warning

The current AI privacy page still claims private-server processing, browser-only history, and the absence of conversation tables or server data, while the privacy actions explicitly count and delete rows from `remy_conversations`, `remy_messages`, `remy_memories`, and `remy_artifacts`. The separate cloud-runtime spec already locks the truthful-disclosure correction and names the files that must be changed there. That means the shell-clarity spec is correct to keep runtime/disclosure work out of scope, but it also means builders touching nearby copy should be warned not to create fresh misleading language while "polishing" the shell. `app/(chef)/settings/ai-privacy/page.tsx:145-171` `lib/ai/privacy-actions.ts:64-92` `lib/ai/privacy-actions.ts:204-281` `docs/specs/full-cloud-ai-runtime-and-disclosure.md:52-59` `docs/specs/full-cloud-ai-runtime-and-disclosure.md:74-100` `docs/specs/chef-shell-clarity-and-guided-settings.md:58-70`

### 6. The spec still leaves one important part of the original complaint underdeveloped

The expanded Developer Notes now capture the developer's complaint about personality, examples, polish, and "ready to use" feel, but the actual file plan remains almost entirely about shell structure, disclosure layers, and copy reframing. There is no explicit deliverable for example-driven empty states, starter content, or a stronger visual design direction. If the developer expects those qualities from this same build, a literal builder could satisfy the spec and still ship something calmer but still generic. `docs/specs/chef-shell-clarity-and-guided-settings.md:33-70` `docs/specs/chef-shell-clarity-and-guided-settings.md:86-111`

## Gaps and Unknowns

The exact final 8-item action-bar composition is not re-validated in this report. The earlier navigation spec defines an 8-item daily-driver set, but the current live config still contains 15 shortcuts, so the build still needs an explicit product choice rather than assuming the current list is correct. `docs/specs/navigation-action-bar.md:14-20` `components/navigation/nav-config.tsx:1930-1947`

The exact default-visible dashboard split is still a judgment call, not a verified truth. The current page includes Weekly Briefing, Coverage Health, Alerts, Intelligence, and Business sections after the more immediate work blocks, but this research did not use telemetry or observed chef workflows to prove which of those should stay visible by default and which should sit behind the new secondary-insights disclosure. `app/(chef)/dashboard/page.tsx:405-469`

If the developer expects example-rich starter states or a distinct visual language as part of the same effort, that remains underdeveloped because the spec does not currently assign files or acceptance criteria for those outcomes. `docs/specs/chef-shell-clarity-and-guided-settings.md:33-35` `docs/specs/chef-shell-clarity-and-guided-settings.md:86-111`

## Recommendations

Build this spec as shell architecture and language cleanup first, because that part is strongly supported by the code and the permanent intent capture. Do not quietly expand it into a whole-app redesign, schema change, or integration-contract rewrite. `docs/specs/chef-shell-clarity-and-guided-settings.md:41-70` `docs/specs/chef-shell-clarity-and-guided-settings.md:96-111`

During implementation, explicitly reuse the Action Bar, command palette, create dropdown, guided integration cards, and focus-mode/modules surfaces as the main simplification levers. Those mechanisms already exist in the repo and are mounted globally, which makes them the lowest-risk way to reduce clutter without deleting capability. `app/(chef)/layout.tsx:153-185` `components/search/command-palette.tsx:199-215` `components/navigation/create-menu-dropdown.tsx:12-74` `app/(chef)/settings/integrations/page.tsx:81-99` `app/(chef)/settings/modules/page.tsx:20-35`

If the developer wants the build to solve the "still looks generic" problem too, open a companion spec for visual-language and example-state work instead of smuggling that expectation into this shell-only file plan. The current spec is strong on hierarchy and progressive disclosure, but it does not yet define a visual point of view. `docs/specs/chef-shell-clarity-and-guided-settings.md:33-35` `docs/specs/chef-shell-clarity-and-guided-settings.md:74-111`
