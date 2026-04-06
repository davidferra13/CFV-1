# Session Log

Every agent appends an entry when they start and when they finish. The next agent reads the last 5 entries to understand what they walked into.

**Rules:**

- Append only. Never delete or edit prior entries.
- Newest entries at the bottom.
- Keep entries concise. 6-8 lines max per entry.
- If the log exceeds 200 entries, archive everything older than 30 days to `docs/session-log-archive.md`.

---

## 2026-04-04 00:00 EST

- Agent: General
- Task: Root .env inspection and creation if missing
- Status: started
- Build state on arrival: green baseline with dirty checkout caveat (dirty from 17aa640d5)

## 2026-04-04 00:05 EST

- Agent: General
- Task: Root .env inspection and creation if missing
- Status: completed
- Files touched: .env, docs/session-log.md
- Commits: none
- Build state on departure: unchanged from docs/build-state.md (no build or typecheck run)
- Notes: Root .env was missing. Created a safe minimal baseline .env without touching the existing .env.local secrets file.

## 2026-04-04 ~09:00 EST

- Agent: Research (Claude Sonnet 4.6)
- Task: Private chef / executive chef / sous chef workflow reality research
- Status: completed
- Files touched: docs/research/2026-04-04-chef-persona-workflow-research.md (new)
- Commits: d607fbe55
- Build state on departure: unchanged (research-only session, no code changes)
- Notes: 10+ web searches across workflow sources, industry forums, and specialist platforms (Epicurate/chef.tech, Personal Chef Office/APPCA, Private Chef Manager, ModernMeal, Traqly, ChefShelley blog, CIA/Culinary/Ducasse). Key findings: (1) Private chef is a strong ChefFlow fit - solo operator managing 3-8 clients, event-based lifecycle, menu repetition tracking, dietary restriction management, grocery-to-invoice gap. (2) Executive chef = wrong target: they live in POS/KDS/labor-scheduling ecosystem with 15-40 staff, no individual client CRM. (3) Sous chef = employee, not a software buyer. (4) ChefFlow already has served_dish_history, menu_service_history, dietary/allergy fields, shopping list generation, and 8-state FSM matching real workflows. (5) Three unverified gaps: allergy warnings propagation into event/menu context, client-facing menu approval flow, and grocery receipt-to-event billing linkage.

## 2026-04-04 ~10:00 EST

- Agent: Research (Claude Opus 4.6)
- Task: UI/UX audit of top 10 ChefFlow surfaces against Interface Philosophy
- Status: completed
- Files touched: docs/research/2026-04-04-ui-ux-audit-top-10-surfaces.md (new)
- Build state on arrival: green (dirty from 17aa640d5)
- Notes: 7 high, 9 medium, 8 low findings. Critical: event detail tab nav invisible on desktop. Quotes page broken (FK hint bug). Settings is the model surface. Full report with before/after recommendations.

## 2026-04-04 ~12:00 EST

- Agent: Research (Claude Opus 4.6)
- Task: Knowledge Confidence Audit + Research Gap Analysis (full 4-phase strategic audit)
- Status: completed
- Files touched: prompts/knowledge-confidence-audit.md (new reusable prompt), docs/research/2026-04-04-knowledge-confidence-audit.md (new)
- Build state on arrival: green (dirty from 17aa640d5)
- Build state on departure: unchanged (research-only session, no code changes)
- Notes: 5-tier confidence audit across 7 axes (30+ personas). Results: 58 verified, 16 partial, 14 assumptions, 13 blind spots, 9 contradictions. Top 3 gaps: user acquisition channels (zero data), monetization model (unvalidated), tax export path disagreements (code bug). Single most dangerous assumption: voluntary $12/month model. Highest-ROI next action: execute Wave-1 operator survey (already designed). Core finding: build is far ahead of validation. The project knows what to build but not whether anyone will use it.

## 2026-04-04 00:15 EST

- Agent: General
- Task: Env template truth alignment after root .env creation
- Status: started
- Build state on arrival: unchanged from docs/build-state.md (green baseline with dirty checkout caveat)
- Notes: Root .env was fixed first. This follow-up pass is to align .env.example and .env.local.example with the actual current env contract and remove stale legacy DB placeholders.

## 2026-04-04 00:28 EST

- Agent: General
- Task: Env template truth alignment after root .env creation
- Status: completed
- Files touched: .env.example, .env.local.example, docs/session-log.md
- Build state on departure: unchanged from docs/build-state.md (no build or typecheck run)
- Notes: Both example env templates now document the current DATABASE_URL-style runtime contract first and explicitly fence the older DB alias keys as compatibility-only for legacy scripts/tests. Repo memory note added for the env contract split.

## 2026-04-04 ~13:00 EST

- Agent: Research (Claude Opus 4.6)
- Task: Deep Sync pass on Knowledge Confidence Audit (explore every unexplored data asset, unread report, spec, memory file)
- Status: completed
- Files touched: docs/research/2026-04-04-knowledge-confidence-audit.md (addendum added)
- Build state on departure: unchanged (research-only)
- Notes: Deep sync found 6 major categories the original audit missed: (1) Security debt - SSE zero auth, Ollama exposed, credentials in repo (CRITICAL launch blockers). (2) Remy parsing regression - inquiry_parse and client_parse at 0% since 2026-03-30. (3) 43-archetype research system designed but never executed (80-120 hrs of planned work). (4) 179/184 forms lack auto-save. (5) 62K+ scraped prices unsynthesized. (6) Privacy promise contradicts cloud runtime direction. Revised totals: 122 knowledge claims (58 verified, 18 partial, 16 assumptions, 17 blind spots, 13 contradictions). SSE zero-auth entered Top 10 gaps at #2 (score 100). Remy regression at #5 (score 75).

## 2026-04-04 ~15:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Comprehensive security audit per prompts/security-audit.md
- Status: completed
- Files touched: lib/ai/remy-intelligence-actions.ts (13 functions hardened), lib/ai/queue/actions.ts (2 functions hardened), lib/ai/remy-morning-briefing.ts, lib/ai/remy-weather.ts, lib/ai/remy-travel-time.ts, lib/ai/remy-proactive-alerts.ts (4 functions hardened), app/api/reports/financial/route.ts (auth added), app/api/sentinel/auth/route.ts (timing-safe fix), app/auth/forgot-password/page.tsx (email echo removed), docs/security-audit-2026-04-04.md (new)
- Build state on departure: green (typecheck:app passes)
- Notes: Found and fixed 3 CRITICAL cross-tenant data leakage vulnerabilities in Remy intelligence/queue/support actions (20 functions total accepted tenantId from client without validation). Fixed 1 missing route-level auth, 1 timing-unsafe secret comparison, 1 user enumeration signal. 2 remaining risks need design decisions (share token PII scope, sentinel rate limiting). Full report: docs/security-audit-2026-04-04.md

## 2026-04-04 ~16:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Security audit wave 2 - deep sweep for remaining tenantId-from-parameter bypasses
- Status: completed
- Files touched: lib/compliance/account-deletion-actions.ts, lib/compliance/pre-deletion-checks.ts, lib/compliance/storage-cleanup.ts, lib/stripe/subscription.ts (4 functions), lib/google/auth.ts, lib/ai/remy-email-actions.ts, lib/events/invoice-actions.ts, lib/availability/actions.ts, lib/integrations/docusign/docusign-client.ts (2 functions), lib/integrations/square/square-client.ts, lib/notifications/triggers.ts, lib/notifications/actions.ts, lib/ai/reactive/hooks.ts, lib/ai/scheduled/scheduler.ts, lib/documents/auto-organize.ts, lib/ai/chef-profile-actions.ts, docs/security-audit-2026-04-04.md
- Commits: c4b402bff (wave 1), 158b0553d (wave 2)
- Build state on departure: green (typecheck:app passes)
- Notes: Wave 2 found 18 more functions with the same cross-tenant pattern. Most critical: executeFinalPurge (account deletion!), 4 Stripe billing functions, getGoogleAccessToken. Total hardened across both waves: 38 functions. 3 remaining items are design decisions (share token PII scope, share token expiration, chef ID enumeration). Full report updated: docs/security-audit-2026-04-04.md

## 2026-04-04 ~18:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Full project completion pass: audit documented work vs actual state, validate, fix, commit
- Status: completed
- Files touched: app/(chef)/settings/account/page.tsx (new), app/(chef)/settings/page.tsx, app/(chef)/settings/my-profile/chef-profile-form.tsx, app/auth/confirm-email-change/page.tsx (new), components/settings/branding-card.tsx (new), components/settings/email-change-form.tsx (new), components/ui/logo-fallback.tsx (new), lib/images/optimize.ts (new), lib/auth/actions.ts, lib/chef/layout-cache.ts, lib/chef/profile-actions.ts, lib/events/photo-actions.ts, lib/network/actions.ts, lib/profile/actions.ts, lib/email/templates/email-change-verification.tsx (new), docs/specs/settings-branding-account-security.md, docs/settings-branding-account-security-build.md, docs/build-state.md, docs/app-complete-audit.md
- Commits: 2eff13ea9
- Build state on departure: green (typecheck + build both pass, BUILD_ID confirmed, OOM fix documented)
- Notes: Full audit of project state against documented work. Settings branding/account/security feature was built but uncommitted - validated all files, ran typecheck (clean), ran build (green with 8GB heap), Playwright-verified 5 key flows (settings, account, dashboard, calendar, email confirm). Also audited 4 recent committed features: RBAC (fully scaffolded, permission filtering wired into nav, gradual annotation rollout), Navigation restructure (complete), Calendar consolidation (complete), Event transitions v2 (core FSM + loyalty + hub hooks working, other hooks deferred). Committed and pushed to main.

## 2026-04-04 ~22:00 EST

- Agent: Builder (Claude Opus 4.6)
- Task: Fix Remy parsing regression (P0), fix SSE auth gaps, build MC passive dashboard
- Status: completed
- Files touched: .env.local, app/api/realtime/presence/route.ts, app/api/realtime/typing/route.ts, scripts/launcher/server.mjs, scripts/launcher/index.html, docs/product-blueprint.md, docs/remy-parsing-fix-2026-04-04.md, docs/session-digests/2026-04-04-220000-remy-fix-mc-dashboard.md
- Commits: cefb6292f, 05c15c48e, c0136944b
- Build state on departure: green (MC server starts, APIs respond, dashboard renders)
- Notes: Remy parsing was broken because Ollama was stuck (30b model too large for RTX 3050 6GB VRAM). Restarted Ollama and switched all tiers to qwen3:4b. SSE auth was already implemented (reclassified from Critical to Low). Fixed presence/typing endpoint from substring to structured validation. Built MC passive Live dashboard with progress bars from Product Blueprint, activity feed, commit history, system status. 2/7 P0 exit criteria now done.

## 2026-04-04 ~23:30 EST

- Agent: Builder (Claude Opus 4.6)
- Task: V1 exit criteria continuation: security verification, 6-pillar Playwright test creation
- Status: partial (test infra written, execution blocked by hung dev server)
- Files touched: docs/product-blueprint.md (security criterion marked done), tests/six-pillars-walkthrough.spec.ts (new), playwright.six-pillars.config.ts (new)
- Build state on departure: green (typecheck passes)
- Notes: Verified security audit completeness: all Critical/High findings fixed across 2 waves (38 functions), 2 remaining items are Medium/Low design decisions. Marked "No critical security gaps" exit criterion done (4/7 must-haves now complete). Wrote comprehensive 28-test 6-pillar Playwright walkthrough covering SELL, PLAN, COOK, STOCK, MONEY, GROW + Dashboard. Execution blocked: dev server on port 3100 is hung (7GB RAM, not responding to any requests). Tests ready to run once server is restarted. Run: `npx playwright test --config=playwright.six-pillars.config.ts`

## 2026-04-04 ~24:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Infrastructure control prompt completion audit and system cleanup
- Status: completed
- Files touched: docs/session-log.md (archived 1864 lines to session-log-archive.md), docs/product-blueprint.md (cleared stale active work table), docs/build-state.md (updated commit ref to 815f7a69f)
- Build state on departure: green (docs-only session, no code changes)
- Notes: Audited all 8 steps of the infrastructure control prompt. All delivered: context ingestion, system mapping, failure point ID, minimum design, agent protocol, write-back system, Mission Control (90%, revamp spec pending), validation. Session log archived (1996 -> 132 lines). Product blueprint active work table cleared of stale entries. Build state updated to current HEAD. All uncommitted work staged for commit.

## 2026-04-04 23:15 EST

- Agent: General (strategic planning)
- Task: OpenClaw strategic pivot - define role, set priorities, build nationwide pricing roadmap
- Status: completed
- Files touched: docs/specs/openclaw-nationwide-pricing-strategy.md (new), docs/session-digests/2026-04-04-openclaw-strategic-pivot.md (new), 9 memory files updated, 1 memory file deleted
- Commits: none (docs + memory only, no code changes)
- Build state on departure: green (no code changes)
- Notes: Nationwide pricing is a launch requirement. Price-intel active (not maintenance). Pi target 85%. First task: map every food source in America. No crowdsourcing core data. Named individuals removed from memory. Full spec written.

## 2026-04-05 03:55 EST

- Agent: Builder
- Task: OpenClaw architecture hardening (5 mandates + 3 gap closures)
- Status: completed
- Files touched: lib/openclaw/price-validator.ts (new), database/migrations/20260405000001_openclaw_price_validation.sql (new), components/pricing/openclaw-live-alerts.tsx (new), components/pricing/pipeline-status-badge.tsx (new), docs/openclaw-autonomy-boundaries.md (new), 5 patch scripts (new), app/api/openclaw/webhook/route.ts, lib/auth/route-policy.ts, scripts/run-openclaw-sync.mjs, app/(chef)/dashboard/page.tsx
- Commits: 04b28cf66, c73d54eb8, 380e1c4b1
- Build state on departure: green (tsc clean)
- Notes: Pi delete guards live (8 tables), growth tracker cron installed, docket overlap detection wired, learning engine tables created, fuel pipeline endpoints live. Data validation gate with quarantine deployed. SSE alert subscribers wired to dashboard. Autonomy boundaries documented. Migration applied. V1 exit criteria not on critical path for OpenClaw.

## 2026-04-05 11:50 EST

- Agent: Builder
- Task: OpenClaw 12-hour audit, hardening, and goal alignment
- Status: completed
- Files touched: lib/openclaw/sync.ts, lib/openclaw/sync-receiver.ts, lib/openclaw/cartridge-registry.ts, app/api/openclaw/webhook/route.ts, components/pricing/openclaw-live-alerts.tsx, scripts/openclaw-pull/patches/upgrade-growth-tracker.py, scripts/openclaw-pull/patches/upgrade-no-delete-guards.py
- Commits: 82218460f, 156193488
- Build state on departure: green (tsc clean, prod rebuilt and running)
- Notes: Found sync broken 3 days (prod was down). Wired validation gate into production sync (13,536 bad prices caught). Fixed growth tracker table name. Added 9th delete guard. Seeded learning engine (9,736 memories, 16 patterns). Wired norm-memory into cross-match. Created sync watchdog (6h cron). Added sync_stale event type. Fixed sync response labels. Cleaned stale growth log entries. All 5 mandates now grade A or B.

## 2026-04-05 16:55 EST

- Agent: Builder (Claude Opus 4.6)
- Task: Opus distillation burst execution + data quality hardening + live proof
- Status: completed
- Files touched: lib/pricing/name-normalizer.ts, lib/openclaw/price-validator.ts, scripts/openclaw-pull/patches/gen-learned-patterns.py, docs/specs/openclaw-opus-distillation-burst.md, docs/session-digests/2026-04-05-openclaw-12h-audit-and-hardening.md, docs/build-state.md, memory/project_opus_distillation_strategy.md
- Commits: 15d681b34, f90796b5e, 31c4b4986
- Build state on departure: green (tsc clean, build green at 16GB heap, prod running on 3000)
- Notes: Distillation Tasks 1-2 executed ($0 cost): norm memory cleaned (9,736->6,929, 2,807 garbage purged, 1,641 confirmed), learned patterns 16->272 (7 types). Name normalizer bracket stripping fixes 17 unmatched ingredients. Price validator cap lowered $1000->$500. Purged 24 outliers. Sync verified: 118 matched, 0 errors, 0 outliers. Coverage: 104/106 ingredients (98.1%). Prod server restarted with new build.

## 2026-04-05 ~20:00 EST

- Agent: General (Claude Opus 4.6)
- Task: OpenClaw state-of-the-union audit + visibility gap closure
- Status: completed
- Files touched: lib/admin/openclaw-health-actions.ts (new), app/(admin)/admin/openclaw/health/page.tsx (new), app/(admin)/admin/openclaw/health/health-client.tsx (new), app/(admin)/admin/analytics/page.tsx, components/pricing/price-badge.tsx, components/navigation/nav-config.tsx, scripts/openclaw-pull/sync-normalization.mjs
- Build state on departure: green (tsc clean)
- Notes: 8-question OpenClaw audit answered. Built quarantine admin dashboard (view/approve/reject/bulk-reject). Built sync health dashboard (audit log table, acceptance rates). Added data engine health card to admin analytics. Added trend arrows to PriceBadge. Fixed auto-confirmed aliases (zero-hallucination violation: was setting confirmed_at=now() on auto-matches, now NULL). Added nav link for Data Engine Health.

## 2026-04-05 ~22:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Full system audit + runtime verification
- Status: completed
- Files touched: components/navigation/nav-config.tsx, lib/staff/staffing-actions.ts (new), lib/staffing/actions.ts (deleted), lib/followup/ (2 files deleted), 8 import updates, tests/system-audit-verify.mjs (new), tests/system-audit-verify-prod.mjs (new)
- Commits: 78940f363
- Build state on departure: green (tsc clean, build green, 25/25 runtime checks pass)
- Notes: Fixed 2 broken nav links, consolidated lib/staffing/ into lib/staff/, deleted 636 lines of dead code (lib/followup/), created Playwright runtime verification suite. All 25 runtime checks pass against prod server. Screenshots in qa-screenshots/system-audit-prod/.

## 2026-04-05 ~23:30 EST

- Agent: General (Claude Opus 4.6)
- Task: Session continuation - verify + close out OpenClaw visibility gap work
- Status: completed
- Files touched: app/(admin)/admin/analytics/page.tsx, docs/session-digests/2026-04-05-openclaw-visibility-gap-closure.md, docs/build-state.md, docs/app-complete-audit.md, docs/session-log.md
- Commits: 6633c8266 + close-out commit
- Build state on departure: green (tsc clean, build green, Playwright verified)
- Notes: Fixed stale isFounder reference in analytics page (undefined variable, would crash at runtime). Playwright-verified both /admin/openclaw/health and /admin/analytics render correctly. Updated build-state, app audit (2 new admin pages), session digest. Clean close-out.

## 2026-04-05 ~18:30 EST

- Agent: General (Claude Opus 4.6)
- Task: Systematic UX audit and fixes - uncommitted work safety, Zero Hallucination, dark theme remediation
- Status: completed
- Files touched: 7 admin pages (dark theme), 2 pages (zero hallucination), store-preferences/page.tsx, build-state.md, session-log.md
- Commits: fbaf710ad (visual+ZH fixes), b420e337c (openclaw infra), 79bfa22f3 (scripts), bc5e9870d (admin refactor), 604e88183 (ZH silent zeros), 2d7a17773 (dark theme)
- Build state on departure: green (tsc clean, build 604e88183 verified)
- Notes: Committed 43 uncommitted files across 6 logical commits. Fixed invisible text on all admin pages (text-slate-900 on bg-stone-900). Fixed 2 Zero Hallucination violations (admin chef detail silent zeros, store preferences silent failure). No em dash or OpenClaw branding violations found in user-visible surfaces.

## 2026-04-05 ~20:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Golden standard audit of all public-facing pages
- Status: completed
- Files touched: app/(public)/contact/\_components/contact-form.tsx, app/(public)/terms/\_components/terms-extended-sections.tsx, app/(public)/privacy/page.tsx, app/(public)/page.tsx, app/(public)/how-it-works/page.tsx, app/(public)/about/page.tsx, app/(public)/book/page.tsx, app/(public)/services/page.tsx, app/(public)/partner-signup/page.tsx, app/(public)/chefs/page.tsx, app/not-found.tsx, app/api/sentinel/health/route.ts, app/api/openclaw/webhook/route.ts, lib/auth/route-policy.ts, components/navigation/nav-config.tsx, docs/public-pages-inventory.md
- Commits: 7f18f3336, 6ca0272f2, 699fb96b7
- Build state on departure: green (tsc clean, build green)
- Notes: Multi-stakeholder audit (chef, consumer, legal, operator, technical, regulatory). Fixed: contact form dark theme, MA governing law, Resend privacy link, "vetted"->reviewed" (7 pages), dynamic chef count on landing, better 404 nav, webhook fail-closed (removed hardcoded secret), sentinel stripped BUILD_ID, cannabis nav removed, dead /api/v1 skip-auth removed, duplicate /privacy-policy route removed. Documented 6 future legal items for attorney review.

## 2026-04-05 ~19:30 EST

- Agent: General (Claude Opus 4.6)
- Task: Fix 3 interface philosophy violations (P1 quality - event detail tabs, quotes page)
- Status: completed
- Files touched: components/inquiries/inquiries-filter-tabs.tsx, app/(chef)/events/[id]/page.tsx, components/events/event-actions-overflow.tsx (new), app/(chef)/quotes/page.tsx, docs/interface-philosophy-gap-analysis.md, docs/product-blueprint.md, docs/session-log.md
- Build state on arrival: green (2d7a17773)
- Build state on departure: green (tsc clean)
- Notes: Fixed 3 interface philosophy violations. (1) Inquiries filter: replaced 5 budget buttons with select dropdown, reducing 12-16 controls to ~9. (2) Event detail header: moved 4 overflow actions (Packing List, Grocery Quote, Travel Plan, Create Story) into a "More" dropdown menu. (3) Quotes page: wrapped 3 intelligence panels in collapsed details disclosure. All comply with Section 5 (one primary action), Section 6 (cognitive load limits), Section 11 (anti-patterns). QA revealed the real inquiries page used inline tabs (not the orphaned component); corrected with 5 primary tabs + "More..." overflow select. Also fixed inquiries heading dark theme (text-stone-900 invisible). Then completed dark theme remediation across remaining 19 admin pages (156 replacements). Fixed duplicate /calendar nav entry causing React key warning. Removed duplicate during lint-staged in dark theme commit.

## 2026-04-05 ~22:00 EST

- Agent: General (Claude Opus 4.6)
- Task: Build food costing knowledge system from spec
- Status: completed
- Files touched: lib/costing/knowledge.ts (new), lib/costing/operator-cost-lines.ts (new), components/costing/costing-help-popover.tsx (new), components/costing/costing-warning-detail.tsx (new), app/(chef)/help/food-costing/page.tsx (new), components/navigation/nav-config.tsx, app/api/remy/stream/route-instant-answers.ts, docs/app-complete-audit.md, docs/food-costing-knowledge-implementation.md (new), docs/specs/food-costing-knowledge-system.md
- Commits: 116881744
- Build state on arrival: green (699fb96b7)
- Build state on departure: tsc green (116881744), full build not re-run
- Notes: Built complete food costing knowledge system: static content map (20 topics, 13 warnings, 14 operator profiles), 80+ cost line templates, help popover component, warning detail component, full guide page at /help/food-costing, nav integration, 6 Remy instant-answer patterns. All content static, Formula > AI. Spec marked as built. Future work: integrate popovers into existing costing views.

## 2026-04-05 ~23:30 EST

- Agent: General (Claude Opus 4.6)
- Task: Wire food costing knowledge layer into existing surfaces
- Status: completed
- Files touched: lib/costing/knowledge.ts, app/(chef)/dashboard/\_sections/business-cards.tsx, app/(chef)/recipes/[id]/recipe-detail-client.tsx, app/(chef)/menus/[id]/menu-detail-client.tsx, app/(chef)/culinary/costing/recipe/page.tsx, app/(chef)/culinary/costing/menu/page.tsx, components/vendors/food-cost-dashboard.tsx, lib/analytics/menu-engineering.ts, lib/ai/remy-context.ts, lib/ai/remy-types.ts, docs/food-costing-knowledge-implementation.md, docs/USER_MANUAL.md, docs/session-digests/2026-04-05-food-costing-knowledge-system.md
- Commits: 52446f740
- Build state on arrival: tsc green (116881744)
- Build state on departure: tsc green (52446f740)
- Notes: Deep exploration revealed 86 files doing costing calculations without using the knowledge layer. Built archetype-to-operator bridge (no migration, uses existing chef_preferences.archetype). Wired CostingHelpPopover into recipe detail, menu detail, recipe costing, menu costing dashboards. Replaced hardcoded 30/35% thresholds in food cost dashboard and menu engineering with operator-specific targets. Added costingContext to Remy (operator type, targets, Q-factor, recosting frequency). Updated User Manual and implementation doc.
