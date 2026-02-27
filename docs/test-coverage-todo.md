# ChefFlow Test Coverage — Master TODO

> **Generated:** 2026-02-27
> **Current state:** 148 test files (mostly E2E/Playwright), only 10 unit tests & 1 integration test
> **Goal:** Unit/integration tests for every module with business logic

---

## How to Read This List

- **Priority 1 (P1)** = Security, data integrity, money — test these first
- **Priority 2 (P2)** = Financial correctness — wrong numbers = lost trust
- **Priority 3 (P3)** = Core operations — the daily driver features
- **Priority 4 (P4)** = Product features — important but lower blast radius
- **Priority 5 (P5)** = Nice to have — polish, analytics, social

Each item shows: `[ ]` = not tested, `[~]` = partially tested (E2E only), `[x]` = has unit/integration test

---

## SECTION 1: AUTH, SECURITY & TENANT ISOLATION (P1)

### Auth System

- [ ] `lib/auth/get-user.ts` — `requireChef()`, `requireClient()`, `requireAuth()` role resolution
- [ ] `lib/auth/admin.ts` — `isAdmin()`, `requireAdmin()` checks
- [x] `lib/auth/actions.ts` — sign-up, sign-in, password reset server actions
- [x] `lib/auth/invitations.ts` — invitation token generation, validation, expiry

### API Security

- [x] `lib/api/auth-api-key.ts` — API key validation, scoping
- [x] `lib/api/rate-limit.ts` — rate limiting logic, window calculations

### OAuth

- [ ] `lib/oauth/actions.ts` — OAuth flow actions
- [ ] `lib/oauth/code-flow.ts` — authorization code exchange
- [ ] `lib/oauth/github.ts` — GitHub OAuth provider
- [ ] `lib/oauth/google.ts` — Google OAuth provider
- [ ] `lib/oauth/jwt.ts` — JWT generation, validation, expiry
- [ ] `lib/oauth/supabase-provider.ts` — Supabase auth provider wrapper

### Billing & Tier Enforcement

- [ ] `lib/billing/tier.ts` — tier resolution logic (Free vs Pro)
- [ ] `lib/billing/require-pro.ts` — `requirePro()` enforcement, admin bypass
- [ ] `lib/billing/modules.ts` — module slug mapping, definitions
- [ ] `lib/billing/pro-features.ts` — Pro feature registry
- [ ] `lib/billing/module-actions.ts` — module toggle server actions
- [ ] `lib/billing/errors.ts` — billing error types

### Crypto & Security

- [ ] `lib/crypto/hash.ts` — hash functions
- [x] `lib/security/turnstile.ts` — Cloudflare Turnstile verification

---

## SECTION 2: LEDGER, PAYMENTS & FINANCIAL CORE (P1)

### Ledger System

- [~] `lib/ledger/append.ts` — immutable ledger entry creation (E2E only, needs unit tests)
- [~] `lib/ledger/compute.ts` — balance computation from entries (E2E only, needs unit tests)
- [x] `lib/ledger/idempotency` — duplicate transaction_reference rejection (integration test exists)
- [ ] `lib/ledger/actions.ts` — ledger server actions

### Stripe Integration

- [ ] `lib/stripe/actions.ts` — Stripe checkout, payment intent creation
- [ ] `lib/stripe/checkout.ts` — checkout session builder
- [ ] `lib/stripe/connect.ts` — Stripe Connect account management
- [ ] `lib/stripe/deferred-transfers.ts` — deferred transfer logic
- [ ] `lib/stripe/payout-actions.ts` — payout processing
- [ ] `lib/stripe/refund.ts` — refund processing
- [ ] `lib/stripe/subscription.ts` — subscription management
- [ ] `lib/stripe/transfer-routing.ts` — transfer routing logic

### Payments Infrastructure

- [ ] `lib/payments/payment-flow.ts` — payment state machine
- [ ] `lib/payments/status-flow.ts` — payment status transitions
- [ ] `lib/payments/settlement-validator.ts` — settlement validation
- [ ] `lib/payments/ledger-sync.ts` — ledger synchronization
- [ ] `lib/payments/plan-selector.ts` — payment plan selection
- [ ] `lib/payments/quote-format.ts` — quote formatting for payments
- [ ] `lib/payments/performance.ts` — payment performance tracking
- [ ] `lib/payments/errors.ts` — payment error types
- [ ] `lib/payments/models.ts` — payment data models

---

## SECTION 3: FINANCE & TAX (P2)

### Core Financial Reports

- [ ] `lib/financials/balance-sheet.ts` — balance sheet generation
- [ ] `lib/financials/cash-flow.ts` — cash flow statement
- [ ] `lib/financials/income-statement.ts` — P&L computation
- [ ] `lib/financials/depreciation-engine.ts` — asset depreciation calculations
- [ ] `lib/financials/reports.ts` — financial report generation
- [ ] `lib/financials/tax-summary.ts` — tax summary computation

### Finance Server Actions

- [ ] `lib/finance/1099-actions.ts` — 1099 contractor tax reporting
- [ ] `lib/finance/bank-feed-actions.ts` — bank feed sync/reconciliation
- [ ] `lib/finance/break-even-actions.ts` — break-even analysis
- [ ] `lib/finance/cash-flow-actions.ts` — cash flow projections
- [ ] `lib/finance/cash-flow-calendar.ts` — calendar-based cash flow
- [ ] `lib/finance/chargeback-actions.ts` — chargeback handling
- [ ] `lib/finance/concentration-actions.ts` — revenue concentration risk
- [ ] `lib/finance/contractor-actions.ts` — contractor payment management
- [ ] `lib/finance/dispute-actions.ts` — payment dispute handling
- [ ] `lib/finance/export-actions.ts` — financial data export
- [ ] `lib/finance/mileage-actions.ts` — mileage deduction tracking
- [ ] `lib/finance/mileage-enhanced-actions.ts` — enhanced mileage calculations
- [ ] `lib/finance/payment-plan-actions.ts` — payment plan CRUD
- [ ] `lib/finance/payment-reminder-actions.ts` — payment reminder scheduling
- [ ] `lib/finance/payroll-actions.ts` — payroll processing
- [ ] `lib/finance/recurring-invoice-actions.ts` — recurring invoice generation
- [ ] `lib/finance/sales-tax-actions.ts` — sales tax calculation
- [ ] `lib/finance/tax-estimate-actions.ts` — quarterly tax estimation
- [ ] `lib/finance/tax-package.ts` — year-end tax package
- [ ] `lib/finance/tip-actions.ts` — tip/gratuity handling

### Tax System

- [ ] `lib/tax/actions.ts` — tax server actions
- [ ] `lib/tax/home-office-actions.ts` — home office deduction
- [ ] `lib/tax/retirement-actions.ts` — retirement contribution tracking
- [ ] `lib/tax/api-ninjas.ts` — API Ninjas tax data integration

### Expenses

- [ ] `lib/expenses/actions.ts` — expense CRUD
- [ ] `lib/expenses/receipt-actions.ts` — receipt processing
- [ ] `lib/expenses/receipt-upload.ts` — receipt upload handling
- [ ] `lib/expenses/mileage-calculator.ts` — mileage calculation formulas
- [ ] `lib/expenses/receipt-parsing-engine.ts` — receipt OCR/parsing
- [ ] `lib/expenses/receipt-classifier.ts` — receipt categorization
- [ ] `lib/expenses/receipt-vendor-classifier.ts` — vendor identification from receipts
- [ ] `lib/expenses/details-parser.ts` — expense detail extraction
- [ ] `lib/expenses/ocr-backup-pipeline.ts` — OCR fallback pipeline

### Expense Categories

- [ ] `lib/expense-categories/actions.ts` — category CRUD
- [ ] `lib/expense-categories/categorizer-engine.ts` — auto-categorization engine
- [ ] `lib/expense-categories/merchant-mapper.ts` — merchant-to-category mapping

### Cost of Goods

- [ ] `lib/cost-of-goods/cost-engine.ts` — COGS calculation engine
- [ ] `lib/cost-of-goods/cost-utils.ts` — cost utility functions
- [ ] `lib/cost-of-goods/margin-engine.ts` — margin calculation engine
- [ ] `lib/cost-of-goods/supplier-cost-matrix.ts` — supplier cost comparison

### Cancellation & Refunds

- [ ] `lib/cancellation/refund-actions.ts` — refund processing
- [ ] `lib/cancellation/policy.ts` — cancellation policy engine

---

## SECTION 4: EVENT LIFECYCLE (P3)

### Event FSM & Core

- [x] `lib/events/fsm.ts` — state machine transitions (unit test exists)
- [~] `lib/events/transitions.ts` — transition UI/button logic (E2E only)
- [ ] `lib/events/actions.ts` — event CRUD server actions
- [ ] `lib/events/carry-forward.ts` — event carry-forward logic
- [ ] `lib/events/readiness.ts` — event readiness scoring
- [ ] `lib/events/event-audit.ts` — event audit trail
- [ ] `lib/events/event-formatter.ts` — event data formatting
- [ ] `lib/events/export-ics.ts` — iCalendar export
- [ ] `lib/events/guest-capacity.ts` — guest capacity calculations
- [ ] `lib/events/guest-flow-estimator.ts` — guest flow timing estimation
- [ ] `lib/events/location-parser.ts` — address/location parsing
- [ ] `lib/events/menu-format.ts` — menu format rendering
- [ ] `lib/events/search-index.ts` — event search indexing
- [ ] `lib/events/staffing-matrix.ts` — staff requirement matrix
- [ ] `lib/events/status-helpers.ts` — event status utilities
- [ ] `lib/events/site-visit-template.ts` — site visit template generation

### Event Sub-Features

- [ ] `lib/events/alcohol-log-actions.ts` — alcohol consumption tracking
- [ ] `lib/events/client-actions.ts` — event-client relationship actions
- [ ] `lib/events/clone-actions.ts` — event cloning/duplication
- [ ] `lib/events/countdown-actions.ts` — event countdown timer
- [ ] `lib/events/cross-contamination-actions.ts` — allergen cross-contamination checks
- [ ] `lib/events/debrief-actions.ts` — post-event debrief
- [ ] `lib/events/dietary-conflict-actions.ts` — dietary conflict detection
- [ ] `lib/events/equipment-checklist-actions.ts` — equipment checklist management
- [ ] `lib/events/financial-summary-actions.ts` — per-event financial summary
- [ ] `lib/events/fire-order.ts` — kitchen fire order/timing
- [ ] `lib/events/geocoding-actions.ts` — address geocoding
- [ ] `lib/events/historical-import-actions.ts` — historical event import
- [ ] `lib/events/invoice-actions.ts` — invoice generation
- [ ] `lib/events/menu-approval-actions.ts` — menu approval workflow
- [ ] `lib/events/offline-payment-actions.ts` — offline payment recording
- [ ] `lib/events/parse-event-from-text.ts` — NLP event parsing
- [ ] `lib/events/photo-actions.ts` — event photo management
- [ ] `lib/events/photo-tagging-actions.ts` — photo tagging/labeling
- [ ] `lib/events/pre-event-checklist-actions.ts` — pre-event checklist
- [ ] `lib/events/safety-checklist-actions.ts` — safety checklist
- [ ] `lib/events/scope-drift.ts` — scope drift detection engine
- [ ] `lib/events/scope-drift-actions.ts` — scope drift server actions

---

## SECTION 5: QUOTES & PRICING (P3)

### Pricing Engine

- [x] `lib/pricing/evaluate.ts` — pricing evaluation (unit test exists — comprehensive)
- [ ] `lib/pricing/dynamic-pricing.ts` — dynamic/demand-based pricing
- [ ] `lib/pricing/margin-calculator.ts` — margin calculations
- [ ] `lib/pricing/payment-plan-builder.ts` — payment plan construction
- [ ] `lib/pricing/tier-engine.ts` — pricing tier resolution
- [ ] `lib/pricing/currency.ts` — currency formatting/conversion

### Quotes

- [ ] `lib/quotes/actions.ts` — quote CRUD
- [ ] `lib/quotes/calculator.ts` — quote total calculation
- [ ] `lib/quotes/client-actions.ts` — client-facing quote actions
- [ ] `lib/quotes/depreciation.ts` — equipment depreciation in quotes
- [ ] `lib/quotes/formatter.ts` — quote display formatting
- [ ] `lib/quotes/loss-analysis-actions.ts` — lost quote analysis
- [ ] `lib/quotes/menu-breakdown.ts` — per-dish menu cost breakdown
- [ ] `lib/quotes/proposal-builder.ts` — proposal document builder
- [ ] `lib/quotes/staffing-suggestion.ts` — staffing recommendations
- [ ] `lib/quotes/tax-calculator.ts` — tax calculations on quotes

### Proposals

- [ ] `lib/proposals/addon-actions.ts` — proposal add-on management
- [ ] `lib/proposals/builder.ts` — proposal builder engine
- [ ] `lib/proposals/format-proposal.ts` — proposal formatting
- [ ] `lib/proposals/generators.ts` — proposal content generators
- [ ] `lib/proposals/overview-generator.ts` — proposal overview generation
- [ ] `lib/proposals/smart-field-actions.ts` — smart field auto-fill
- [ ] `lib/proposals/template-actions.ts` — proposal template management
- [ ] `lib/proposals/view-tracking-actions.ts` — proposal view analytics

---

## SECTION 6: CLIENTS & INQUIRIES (P3)

### Client Management

- [ ] `lib/clients/actions.ts` — client CRUD
- [ ] `lib/clients/scoring.ts` — client scoring algorithm
- [ ] `lib/clients/churn-score.ts` — churn risk scoring
- [ ] `lib/clients/health-score.ts` — client health computation
- [ ] `lib/clients/health-score-utils.ts` — health score helpers
- [ ] `lib/clients/deduplication.ts` — client deduplication matching
- [ ] `lib/clients/completeness.ts` — profile completeness calculation
- [ ] `lib/clients/lead-quality.ts` — lead quality scoring
- [ ] `lib/clients/lead-target-calc.ts` — lead target calculations
- [ ] `lib/clients/ltv-trajectory.ts` — lifetime value trajectory
- [ ] `lib/clients/profitability.ts` — client profitability analysis
- [ ] `lib/clients/overlap-detector.ts` — scheduling overlap detection
- [ ] `lib/clients/portfolio-quality.ts` — portfolio quality metrics
- [ ] `lib/clients/reactivation.ts` — dormant client reactivation
- [ ] `lib/clients/traction-analytics.ts` — client traction analytics
- [ ] `lib/clients/segments.ts` — client segmentation
- [ ] `lib/clients/birthday-alerts.ts` — birthday alert generation
- [ ] `lib/clients/cooling-actions.ts` — cooling period enforcement
- [ ] `lib/clients/dormancy.ts` — dormancy detection
- [ ] `lib/clients/milestones.ts` — client milestone tracking
- [ ] `lib/clients/referral-tree.ts` — referral tree graph
- [ ] `lib/clients/unified-timeline.ts` — unified client timeline
- [ ] `lib/clients/unified-timeline-utils.ts` — timeline utilities
- [ ] `lib/clients/client-profile-actions.ts` — profile update actions
- [ ] `lib/clients/import-actions.ts` — client import/CSV
- [ ] `lib/clients/menu-history.ts` — per-client menu history
- [ ] `lib/clients/nda-actions.ts` — NDA management
- [ ] `lib/clients/payment-plan-actions.ts` — client payment plans
- [ ] `lib/clients/photo-actions.ts` — client photo management
- [ ] `lib/clients/preference-learning-actions.ts` — preference learning
- [ ] `lib/clients/referral-health-actions.ts` — referral health tracking
- [ ] `lib/clients/spending-actions.ts` — client spending analysis
- [ ] `lib/clients/tag-actions.ts` — client tagging
- [ ] `lib/clients/cannabis-client-actions.ts` — cannabis client management

### Inquiries

- [ ] `lib/inquiries/actions.ts` — inquiry CRUD
- [ ] `lib/inquiries/client-actions.ts` — inquiry-to-client conversion
- [ ] `lib/inquiries/follow-up-actions.ts` — follow-up scheduling
- [ ] `lib/inquiries/import-actions.ts` — inquiry import
- [ ] `lib/inquiries/likelihood-actions.ts` — booking likelihood scoring
- [ ] `lib/inquiries/note-actions.ts` — inquiry notes
- [ ] `lib/inquiries/public-actions.ts` — public inquiry submission
- [ ] `lib/inquiries/take-a-chef-capture-actions.ts` — Take-a-Chef import
- [ ] `lib/inquiries/enrichment.ts` — inquiry data enrichment
- [ ] `lib/inquiries/intent-parser.ts` — inquiry intent parsing
- [ ] `lib/inquiries/formats.ts` — inquiry format helpers

---

## SECTION 7: RECIPES, MENUS & FOOD COST (P3)

### Recipes

- [ ] `lib/recipes/actions.ts` — recipe CRUD
- [ ] `lib/recipes/allergen-actions.ts` — allergen detection
- [ ] `lib/recipes/bulk-price-actions.ts` — bulk ingredient price write-back
- [ ] `lib/recipes/nutrition-actions.ts` — nutritional info
- [ ] `lib/recipes/cost-calculator.ts` — recipe cost calculation
- [ ] `lib/recipes/ingredient-parser.ts` — ingredient text parsing
- [ ] `lib/recipes/scaling.ts` — recipe scaling math
- [ ] `lib/recipes/search-engine.ts` — recipe search

### Menus

- [ ] `lib/menus/actions.ts` — menu CRUD
- [ ] `lib/menus/editor-actions.ts` — menu editor server actions
- [ ] `lib/menus/modifications.ts` — menu modification tracking
- [ ] `lib/menus/cost-breakdown.ts` — menu cost breakdown engine
- [ ] `lib/menus/format-parser.ts` — menu format parsing
- [ ] `lib/menus/ingredients-extractor.ts` — ingredient extraction from menus
- [ ] `lib/menus/parser-engine.ts` — menu text parser

### Grocery & Sourcing

- [ ] `lib/grocery/pricing-actions.ts` — multi-vendor grocery pricing
- [ ] `lib/grocery/instacart-actions.ts` — Instacart integration
- [ ] `lib/shopping/substitutions.ts` — ingredient substitution logic

### Food Cost

- [ ] `lib/food-cost/actions.ts` — food cost actions
- [ ] `lib/food-cost/analyzer.ts` — food cost analysis engine
- [ ] `lib/food-cost/recipe-costing.ts` — per-recipe costing

### Ingredients

- [ ] `lib/ingredients/pricing.ts` — ingredient pricing logic

### Nutrition

- [ ] `lib/nutrition/actions.ts` — nutritional computation actions

### Front of House

- [ ] `lib/front-of-house/generateFrontOfHouseMenu.ts` — FOH menu PDF generation
- [ ] `lib/front-of-house/menuGeneratorService.ts` — menu generator service

---

## SECTION 8: INVENTORY & SUPPLY CHAIN (P3)

### Inventory Core

- [ ] `lib/inventory/actions.ts` — inventory CRUD
- [ ] `lib/inventory/audit-actions.ts` — inventory audit
- [ ] `lib/inventory/batch-actions.ts` — batch tracking
- [ ] `lib/inventory/count-actions.ts` — physical count
- [ ] `lib/inventory/demand-forecast-actions.ts` — demand forecasting
- [ ] `lib/inventory/event-deduction-actions.ts` — auto-deduct from events
- [ ] `lib/inventory/location-actions.ts` — multi-location tracking
- [ ] `lib/inventory/price-cascade-actions.ts` — price cascade updates
- [ ] `lib/inventory/purchase-order-actions.ts` — PO management
- [ ] `lib/inventory/staff-meal-actions.ts` — staff meal deductions
- [ ] `lib/inventory/transaction-actions.ts` — inventory transactions
- [ ] `lib/inventory/variance-actions.ts` — variance analysis
- [ ] `lib/inventory/vendor-invoice-actions.ts` — vendor invoice matching
- [ ] `lib/inventory/waste-actions.ts` — waste tracking

### Inventory Engines

- [ ] `lib/inventory/assignment-engine.ts` — ingredient assignment
- [ ] `lib/inventory/bulk-operations.ts` — bulk inventory ops
- [ ] `lib/inventory/capacity-calculator.ts` — storage capacity
- [ ] `lib/inventory/ledger.ts` — inventory ledger
- [ ] `lib/inventory/reorder-points.ts` — reorder point calculation
- [ ] `lib/inventory/split-optimizer.ts` — split optimization
- [ ] `lib/inventory/stock-valuation.ts` — stock valuation (FIFO/LIFO)
- [ ] `lib/inventory/unit-conversion.ts` — unit conversion engine

### Vendors

- [ ] `lib/vendors/actions.ts` — vendor CRUD
- [ ] `lib/vendors/invoice-actions.ts` — vendor invoice processing
- [ ] `lib/vendors/payment-aging-actions.ts` — AP aging
- [ ] `lib/vendors/payment-aging.ts` — aging calculation engine
- [ ] `lib/vendors/revenue-actions.ts` — vendor revenue tracking
- [ ] `lib/vendors/vendor-item-actions.ts` — vendor catalog items

### Waste

- [ ] `lib/waste/actions.ts` — waste logging

---

## SECTION 9: STAFF & LABOR (P3)

### Staff Management

- [ ] `lib/staff/actions.ts` — staff CRUD
- [ ] `lib/staff/availability-actions.ts` — staff availability
- [ ] `lib/staff/briefing-actions.ts` — staff briefing generation
- [ ] `lib/staff/clock-actions.ts` — time clock in/out
- [ ] `lib/staff/coc-actions.ts` — code of conduct
- [ ] `lib/staff/contractor-agreement-actions.ts` — contractor agreements
- [ ] `lib/staff/labor-dashboard-actions.ts` — labor metrics dashboard
- [ ] `lib/staff/onboarding-actions.ts` — staff onboarding
- [ ] `lib/staff/performance-actions.ts` — performance reviews
- [ ] `lib/staff/staff-portal-actions.ts` — staff portal access

---

## SECTION 10: AI / REMY / OLLAMA (P4)

### AI Core Infrastructure

- [ ] `lib/ai/parse-ollama.ts` — Ollama API calls, retry logic, timeout
- [ ] `lib/ai/parse.ts` — AI parsing router (Ollama vs Gemini)
- [ ] `lib/ai/ollama-errors.ts` — `OllamaOfflineError` handling
- [ ] `lib/ai/ollama-cache.ts` — Ollama response caching
- [ ] `lib/ai/ollama-health.ts` — Ollama health check
- [ ] `lib/ai/ollama-wake.ts` — Ollama wake-up trigger
- [ ] `lib/ai/llm-router.ts` — LLM model selection routing
- [ ] `lib/ai/providers.ts` — AI provider configuration
- [ ] `lib/ai/gemini-service.ts` — Gemini API service
- [ ] `lib/ai/with-ai-fallback.ts` — AI fallback wrapper
- [ ] `lib/ai/fallback-parsers.ts` — regex/heuristic fallback parsers

### Remy Personality & Guardrails

- [ ] `lib/ai/remy-personality.ts` — Remy personality system prompt
- [ ] `lib/ai/remy-guardrails.ts` — Remy safety guardrails
- [ ] `lib/ai/remy-classifier.ts` — intent classification
- [ ] `lib/ai/remy-archetypes.ts` — user archetype detection
- [ ] `lib/ai/remy-client-personality.ts` — client-facing personality
- [ ] `lib/ai/remy-public-personality.ts` — public page personality
- [ ] `lib/ai/remy-landing-personality.ts` — landing page personality
- [ ] `lib/ai/remy-input-validation.ts` — input sanitization
- [ ] `lib/ai/remy-abuse-actions.ts` — abuse detection/prevention
- [ ] `lib/ai/remy-welcome.ts` — welcome message generation

### Remy Features

- [ ] `lib/ai/remy-actions.ts` — Remy server actions
- [ ] `lib/ai/remy-artifact-actions.ts` — artifact management
- [ ] `lib/ai/remy-conversation-actions.ts` — conversation management
- [ ] `lib/ai/remy-email-actions.ts` — email drafting
- [ ] `lib/ai/remy-memory-actions.ts` — conversation memory
- [ ] `lib/ai/remy-metrics.ts` — Remy usage metrics
- [ ] `lib/ai/remy-web-actions.ts` — web search integration
- [ ] `lib/ai/remy-context.ts` — context window builder
- [ ] `lib/ai/remy-client-context.ts` — client context builder
- [ ] `lib/ai/remy-public-context.ts` — public context builder
- [ ] `lib/ai/remy-emotion.ts` — emotion state machine
- [ ] `lib/ai/remy-body-state.ts` — body animation state
- [ ] `lib/ai/remy-eye-blink.ts` — eye blink animation timing
- [ ] `lib/ai/remy-sprite-loader.ts` — sprite sheet loader
- [ ] `lib/ai/remy-sprite-manifests.ts` — sprite manifest definitions
- [ ] `lib/ai/remy-visemes.ts` — lip-sync viseme mapping
- [ ] `lib/ai/remy-local-storage.ts` — IndexedDB conversation storage

### AI Parsing & NLP

- [ ] `lib/ai/parse-client.ts` — client info extraction
- [ ] `lib/ai/parse-clients-bulk.ts` — bulk client parsing
- [ ] `lib/ai/parse-inquiry.ts` — inquiry text parsing
- [ ] `lib/ai/parse-inquiries-bulk.ts` — bulk inquiry parsing
- [ ] `lib/ai/parse-recipe.ts` — recipe text parsing
- [ ] `lib/ai/parse-receipt.ts` — receipt OCR parsing
- [ ] `lib/ai/parse-transcript.ts` — call transcript parsing
- [ ] `lib/ai/parse-brain-dump.ts` — brain dump text parsing
- [ ] `lib/ai/parse-document-text.ts` — document text extraction
- [ ] `lib/ai/parse-document-vision.ts` — document image parsing
- [ ] `lib/ai/parse-csv-clients.ts` — CSV client import parsing
- [ ] `lib/ai/parse-csv-events.ts` — CSV event import parsing
- [ ] `lib/ai/parse-csv-inquiries.ts` — CSV inquiry import parsing

### AI Command System

- [ ] `lib/ai/command-orchestrator.ts` — command routing, fail-fast guard
- [ ] `lib/ai/command-intent-parser.ts` — command intent extraction
- [ ] `lib/ai/command-task-descriptions.ts` — task description generation
- [ ] `lib/ai/command-types.ts` — command type definitions

### AI Business Intelligence

- [ ] `lib/ai/lead-scoring.ts` — AI lead scoring
- [ ] `lib/ai/sentiment-analysis.ts` — sentiment analysis
- [ ] `lib/ai/business-insights.ts` — business insight generation
- [ ] `lib/ai/chat-insights.ts` — chat-based insights
- [ ] `lib/ai/pricing-intelligence.ts` — competitive pricing insights
- [ ] `lib/ai/analytics-actions.ts` — AI analytics actions

### AI Content Generation

- [ ] `lib/ai/chef-bio.ts` — chef bio generation
- [ ] `lib/ai/quote-draft.ts` — quote draft generation
- [ ] `lib/ai/followup-draft.ts` — follow-up email drafts
- [ ] `lib/ai/contract-generator.ts` — contract generation
- [ ] `lib/ai/correspondence.ts` — correspondence drafting
- [ ] `lib/ai/social-captions.ts` — social media captions
- [ ] `lib/ai/review-request.ts` — review request generation
- [ ] `lib/ai/campaign-outreach.ts` — campaign outreach copy
- [ ] `lib/ai/gratuity-framing.ts` — gratuity suggestion framing
- [ ] `lib/ai/testimonial-selection.ts` — testimonial selection
- [ ] `lib/ai/staff-briefing-ai.ts` — staff briefing generation

### AI Domain Logic

- [ ] `lib/ai/allergen-risk.ts` — allergen risk assessment
- [ ] `lib/ai/contingency-ai.ts` — contingency plan generation
- [ ] `lib/ai/cross-monitor.ts` — cross-contamination monitoring
- [ ] `lib/ai/dietary-check-actions.ts` — dietary restriction checking
- [ ] `lib/ai/expense-categorizer.ts` — expense auto-categorization
- [ ] `lib/ai/grocery-consolidation.ts` — grocery list consolidation
- [ ] `lib/ai/grocery-quick-add-actions.ts` — quick grocery add
- [ ] `lib/ai/menu-nutritional.ts` — menu nutritional analysis
- [ ] `lib/ai/menu-suggestions.ts` — menu suggestions
- [ ] `lib/ai/permit-checklist.ts` — permit checklist generation
- [ ] `lib/ai/prep-timeline.ts` — prep timeline generation
- [ ] `lib/ai/prep-timeline-actions.ts` — prep timeline actions
- [ ] `lib/ai/recipe-scaling.ts` — recipe scaling assistance
- [ ] `lib/ai/service-timeline.ts` — service day timeline
- [ ] `lib/ai/tax-deduction-identifier.ts` — tax deduction identification
- [ ] `lib/ai/temp-log-anomaly.ts` — temperature log anomaly detection
- [ ] `lib/ai/vendor-comparison.ts` — vendor price comparison
- [ ] `lib/ai/equipment-depreciation-explainer.ts` — depreciation explanation
- [ ] `lib/ai/carry-forward-match.ts` — event carry-forward matching

### AI Agent Actions (20 files)

- [ ] `lib/ai/agent-actions/calendar-actions.ts`
- [ ] `lib/ai/agent-actions/client-actions.ts`
- [ ] `lib/ai/agent-actions/draft-email-actions.ts`
- [ ] `lib/ai/agent-actions/event-actions.ts`
- [ ] `lib/ai/agent-actions/event-ops-actions.ts`
- [ ] `lib/ai/agent-actions/financial-call-actions.ts`
- [ ] `lib/ai/agent-actions/grocery-actions.ts`
- [ ] `lib/ai/agent-actions/inquiry-actions.ts`
- [ ] `lib/ai/agent-actions/intake-actions.ts`
- [ ] `lib/ai/agent-actions/menu-edit-actions.ts`
- [ ] `lib/ai/agent-actions/notes-tags-actions.ts`
- [ ] `lib/ai/agent-actions/operations-actions.ts`
- [ ] `lib/ai/agent-actions/proactive-actions.ts`
- [ ] `lib/ai/agent-actions/quote-actions.ts`
- [ ] `lib/ai/agent-actions/recipe-actions.ts`
- [ ] `lib/ai/agent-actions/restricted-actions.ts`
- [ ] `lib/ai/agent-actions/staff-actions.ts`

### AI Queue & Scheduling

- [ ] `lib/ai/queue/actions.ts` — queue management
- [ ] `lib/ai/queue/monitor.ts` — queue monitoring
- [ ] `lib/ai/queue/registry.ts` — task registry
- [ ] `lib/ai/queue/worker.ts` — background worker
- [ ] `lib/ai/scheduled/scheduler.ts` — AI task scheduler
- [ ] `lib/ai/scheduled/jobs.ts` — scheduled job runner
- [ ] `lib/ai/scheduled/job-definitions.ts` — job type definitions

### AI Privacy & Admin

- [ ] `lib/ai/privacy-actions.ts` — privacy management actions
- [ ] `lib/ai/privacy-audit.ts` — privacy audit logging
- [ ] `lib/ai/import-actions.ts` — AI-assisted import
- [ ] `lib/ai/import-receipt-action.ts` — receipt import
- [ ] `lib/ai/import-take-a-chef-action.ts` — Take-a-Chef import
- [ ] `lib/ai/support-share-action.ts` — support sharing
- [ ] `lib/ai/draft-actions.ts` — draft management
- [ ] `lib/ai/operations-actions.ts` — operations AI actions
- [ ] `lib/ai/reminder-actions.ts` — reminder actions
- [ ] `lib/ai/client-facing-actions.ts` — client-facing AI actions
- [ ] `lib/ai/chef-profile-actions.ts` — chef profile AI actions
- [ ] `lib/ai/document-management-actions.ts` — document management AI

### AI Reactive System

- [ ] `lib/ai/reactive/handlers.ts` — reactive event handlers
- [ ] `lib/ai/reactive/hooks.ts` — reactive hooks

---

## SECTION 11: SCHEDULING & CALENDAR (P4)

- [ ] `lib/scheduling/actions.ts` — scheduling CRUD
- [ ] `lib/scheduling/calendar-sync.ts` — Google/Apple calendar sync engine
- [ ] `lib/scheduling/calendar-sync-actions.ts` — sync server actions
- [ ] `lib/scheduling/capacity-actions.ts` — capacity management
- [ ] `lib/scheduling/availability-share-actions.ts` — availability sharing
- [ ] `lib/scheduling/dop-completions.ts` — day-of-prep completions
- [ ] `lib/scheduling/grocery-route-actions.ts` — grocery route planning
- [ ] `lib/scheduling/multi-event-days.ts` — multi-event day handling
- [ ] `lib/scheduling/prep-block-actions.ts` — prep block scheduling
- [ ] `lib/scheduling/protected-time-actions.ts` — protected time management
- [ ] `lib/scheduling/task-digest.ts` — daily task digest
- [ ] `lib/calendar/actions.ts` — calendar CRUD
- [ ] `lib/calendar/entry-actions.ts` — calendar entry management
- [ ] `lib/calendar/signal-settings-actions.ts` — calendar signal settings
- [ ] `lib/calendar/seasonal-produce.ts` — seasonal produce calendar
- [ ] `lib/availability/actions.ts` — availability CRUD
- [ ] `lib/availability/rules-actions.ts` — availability rules engine
- [ ] `lib/scheduler/calendar-engine.ts` — calendar computation engine
- [ ] `lib/scheduler/slot-optimizer.ts` — time slot optimization

---

## SECTION 12: ANALYTICS & REPORTING (P4)

### Analytics Engines

- [ ] `lib/analytics/revenue-engine.ts` — revenue computation engine
- [ ] `lib/analytics/revenue-forecast.ts` — revenue forecasting
- [ ] `lib/analytics/revenue-analytics.ts` — revenue analytics
- [ ] `lib/analytics/pipeline-analytics.ts` — pipeline conversion analytics
- [ ] `lib/analytics/stage-conversion.ts` — stage-to-stage conversion rates
- [ ] `lib/analytics/booking-score.ts` — booking probability scoring
- [ ] `lib/analytics/seasonality.ts` — seasonality detection
- [ ] `lib/analytics/year-over-year.ts` — YoY comparison
- [ ] `lib/analytics/cost-trends.ts` — cost trend analysis
- [ ] `lib/analytics/menu-engineering.ts` — menu engineering (stars, dogs, puzzles, plow horses)
- [ ] `lib/analytics/menu-recommendations.ts` — menu optimization recommendations
- [ ] `lib/analytics/pricing-suggestions.ts` — pricing suggestion engine
- [ ] `lib/analytics/quote-insights.ts` — quote conversion insights
- [ ] `lib/analytics/referral-analytics.ts` — referral source analytics
- [ ] `lib/analytics/social-analytics.ts` — social media analytics
- [ ] `lib/analytics/culinary-analytics.ts` — culinary trend analytics
- [ ] `lib/analytics/operations-analytics.ts` — operations efficiency analytics
- [ ] `lib/analytics/marketing-analytics.ts` — marketing performance analytics
- [ ] `lib/analytics/client-analytics.ts` — client behavior analytics

### Analytics Server Actions

- [ ] `lib/analytics/benchmark-actions.ts` — industry benchmark comparison
- [ ] `lib/analytics/client-ltv-actions.ts` — client LTV calculations
- [ ] `lib/analytics/custom-report.ts` — custom report builder
- [ ] `lib/analytics/custom-report-enhanced-actions.ts` — enhanced custom reports
- [ ] `lib/analytics/demand-forecast-actions.ts` — demand forecasting actions
- [ ] `lib/analytics/insights-actions.ts` — insight generation actions
- [ ] `lib/analytics/pipeline-forecast-actions.ts` — pipeline forecast actions
- [ ] `lib/analytics/response-time-actions.ts` — response time tracking

### Reports

- [x] `lib/reports/compute-daily-report.ts` — daily report computation (unit test exists)
- [~] `lib/reports/daily-report-actions.ts` — daily report server actions (unit test exists)
- [ ] `lib/reports/actions.ts` — report CRUD
- [ ] `lib/reports/query-builders.ts` — report query builders

### Revenue Goals

- [x] `lib/revenue-goals/engine.ts` — revenue goal engine (unit test exists)
- [ ] `lib/revenue-goals/actions.ts` — revenue goal actions

---

## SECTION 13: COMMUNICATIONS (P4)

### Email

- [ ] `lib/email/classify-automated.ts` — automated email classification
- [ ] `lib/email/context-enricher.ts` — email context enrichment
- [ ] `lib/email/headers-parser.ts` — email header parsing
- [ ] `lib/email/ingest-pipeline.ts` — email ingestion pipeline
- [ ] `lib/email/mime-parser.ts` — MIME parsing
- [ ] `lib/email/response-classifier.ts` — response type classification
- [ ] `lib/email/sendgrid.ts` — SendGrid API wrapper
- [ ] `lib/email/smtp-provider.ts` — SMTP provider abstraction
- [ ] `lib/email/subject-parser.ts` — subject line parsing
- [ ] `lib/email/threading.ts` — email thread resolution
- [ ] `lib/email/validate-sender.ts` — sender validation
- [ ] `lib/email/oauth2.ts` — email OAuth2 flow
- [ ] `lib/email/queue.ts` — email send queue

### Gmail

- [ ] `lib/gmail/actions.ts` — Gmail integration actions
- [ ] `lib/gmail/classify.ts` — Gmail message classification
- [ ] `lib/gmail/historical-scan-actions.ts` — Gmail historical scan
- [ ] `lib/gmail/take-a-chef-stats.ts` — Take-a-Chef email stats

### SMS

- [ ] `lib/sms/actions.ts` — SMS server actions
- [ ] `lib/sms/ingest.ts` — inbound SMS processing
- [ ] `lib/sms/send.ts` — SMS sending
- [ ] `lib/sms/rate-limit.ts` — SMS rate limiting
- [ ] `lib/sms/twilio-client.ts` — Twilio client wrapper

### Chat & Messaging

- [ ] `lib/chat/actions.ts` — chat CRUD
- [ ] `lib/chat/realtime.ts` — real-time chat (Supabase Realtime)
- [ ] `lib/chat/system-messages.ts` — system message generation
- [ ] `lib/messages/actions.ts` — message CRUD
- [ ] `lib/messages/tac-transcript-actions.ts` — Take-a-Chef transcript
- [ ] `lib/messaging/actions.ts` — messaging server actions
- [ ] `lib/messaging/format-message.ts` — message formatting
- [ ] `lib/messaging/socket-client.ts` — WebSocket client

### Notifications

- [ ] `lib/notifications/actions.ts` — notification CRUD
- [ ] `lib/notifications/send.ts` — notification delivery
- [ ] `lib/notifications/check.ts` — notification checks
- [ ] `lib/notifications/channel-router.ts` — multi-channel routing (push/email/SMS)
- [ ] `lib/notifications/digest.ts` — notification digest builder
- [ ] `lib/notifications/handlers.ts` — notification event handlers
- [ ] `lib/notifications/nudges.ts` — proactive nudge generation
- [ ] `lib/notifications/preferences.ts` — notification preferences
- [ ] `lib/notifications/ring-buffer.ts` — notification ring buffer
- [ ] `lib/notifications/scheduler.ts` — notification scheduling
- [ ] `lib/notifications/triggers.ts` — notification trigger definitions
- [ ] `lib/notifications/client-actions.ts` — client notification actions
- [ ] `lib/notifications/off-hours-check.ts` — off-hours gate
- [ ] `lib/notifications/settings-actions.ts` — notification settings

### Communication Core

- [ ] `lib/communication/actions.ts` — communication actions
- [ ] `lib/communication/outbound-flow.ts` — outbound communication flow
- [ ] `lib/communication/priority-scorer.ts` — message priority scoring
- [ ] `lib/communication/email-provider-switcher.ts` — provider failover
- [ ] `lib/communication/slack-logger.ts` — Slack logging integration

### Push Notifications

- [ ] `lib/push/subscriptions.ts` — push notification subscriptions

---

## SECTION 14: MARKETING, LOYALTY & CAMPAIGNS (P4)

### Marketing

- [ ] `lib/marketing/actions.ts` — marketing actions
- [ ] `lib/marketing/ab-test-actions.ts` — A/B test management
- [ ] `lib/marketing/content-performance-actions.ts` — content performance tracking
- [ ] `lib/marketing/email-template-actions.ts` — email template builder
- [ ] `lib/marketing/holiday-campaign-actions.ts` — holiday campaigns
- [ ] `lib/marketing/segmentation-actions.ts` — audience segmentation
- [ ] `lib/marketing/campaign-creator.ts` — campaign creation engine
- [ ] `lib/marketing/copy-templates.ts` — marketing copy templates
- [ ] `lib/marketing/cta-optimizer.ts` — CTA optimization
- [ ] `lib/marketing/drip-scheduler.ts` — drip campaign scheduler
- [ ] `lib/marketing/email-sequencer.ts` — email sequence builder
- [ ] `lib/marketing/goals.ts` — marketing goals
- [ ] `lib/marketing/handles.ts` — social handle management
- [ ] `lib/marketing/kpis.ts` — marketing KPIs
- [ ] `lib/marketing/roi-engine.ts` — marketing ROI engine
- [ ] `lib/marketing/segment-engine.ts` — segmentation engine
- [ ] `lib/marketing/viral-coefficient.ts` — viral coefficient calculation

### Loyalty

- [ ] `lib/loyalty/actions.ts` — loyalty program CRUD
- [ ] `lib/loyalty/auto-award.ts` — automatic point awarding
- [ ] `lib/loyalty/client-loyalty-actions.ts` — client loyalty management
- [ ] `lib/loyalty/gift-card-purchase-actions.ts` — gift card purchases
- [ ] `lib/loyalty/redemption-actions.ts` — point redemption
- [ ] `lib/loyalty/voucher-actions.ts` — voucher management

### Campaigns

- [ ] `lib/campaigns/public-booking-actions.ts` — public booking campaigns
- [ ] `lib/campaigns/push-dinner-actions.ts` — push dinner campaigns
- [ ] `lib/campaigns/targeting-actions.ts` — campaign targeting

### Follow-Up

- [ ] `lib/followup/rule-actions.ts` — follow-up rule engine
- [ ] `lib/followup/sequence-builder-actions.ts` — sequence builder

### Prospecting

- [ ] `lib/prospecting/actions.ts` — prospecting CRUD
- [ ] `lib/prospecting/queue-actions.ts` — prospecting queue
- [ ] `lib/prospecting/script-actions.ts` — call scripts
- [ ] `lib/prospecting/scrub-actions.ts` — lead scrubbing
- [ ] `lib/prospecting/scrub-prompt.ts` — scrub prompt generation

---

## SECTION 15: OPERATIONS & DOCUMENTS (P4)

### Operations

- [ ] `lib/operations/course-planning-actions.ts` — course planning
- [ ] `lib/operations/document-comment-actions.ts` — document comments
- [ ] `lib/operations/document-version-actions.ts` — document versioning
- [ ] `lib/operations/kds-actions.ts` — kitchen display system
- [ ] `lib/operations/split-billing-actions.ts` — split billing
- [ ] `lib/operations/batch-scheduler.ts` — batch scheduling
- [ ] `lib/operations/event-day-checklist.ts` — event day checklist
- [ ] `lib/operations/prep-helper.ts` — prep assistance

### Documents

- [ ] `lib/documents/actions.ts` — document CRUD
- [ ] `lib/documents/import-actions.ts` — document import
- [ ] `lib/documents/extraction-engine.ts` — text extraction
- [ ] `lib/documents/parser-dispatcher.ts` — parser routing
- [ ] `lib/documents/presigned-urls.ts` — S3 presigned URL generation
- [ ] `lib/documents/search.ts` — document search
- [ ] `lib/documents/upload-validator.ts` — upload validation
- [ ] `lib/documents/archive.ts` — document archival
- [ ] `lib/documents/mime-types.ts` — MIME type handling

### Contracts

- [ ] `lib/contracts/actions.ts` — contract CRUD
- [ ] `lib/contracts/generator.ts` — contract document generation
- [ ] `lib/contracts/parser-classes.ts` — contract clause parsing
- [ ] `lib/contracts/parser-conditions.ts` — conditional clause parsing
- [ ] `lib/contracts/template-variables.ts` — template variable resolution

### Data Import

- [ ] `lib/data-import/csv-parser.ts` — CSV parsing engine
- [ ] `lib/data-import/field-mapper.ts` — field mapping
- [ ] `lib/data-import/schema-infer.ts` — schema inference
- [ ] `lib/data-import/validation.ts` — import data validation
- [ ] `lib/data-import/wix-parser.ts` — Wix data parser
- [ ] `lib/data-import/error-handler.ts` — import error handling
- [ ] `lib/data-import/async-reader.ts` — async file reader

---

## SECTION 16: SOCIAL, COMMUNITY & PARTNERS (P5)

### Social Media

- [ ] `lib/social/actions.ts` — social posting actions
- [ ] `lib/social/chef-social-actions.ts` — chef social profile
- [ ] `lib/social/hashtag-actions.ts` — hashtag management
- [ ] `lib/social/oauth-actions.ts` — social OAuth
- [ ] `lib/social/publishing/engine.ts` — social publishing engine
- [ ] `lib/social/publishing/adapters/linkedin.ts` — LinkedIn adapter
- [ ] `lib/social/publishing/adapters/meta.ts` — Meta/Instagram adapter
- [ ] `lib/social/publishing/adapters/pinterest.ts` — Pinterest adapter
- [ ] `lib/social/publishing/adapters/tiktok.ts` — TikTok adapter
- [ ] `lib/social/publishing/adapters/x.ts` — X/Twitter adapter
- [ ] `lib/social/publishing/adapters/youtube.ts` — YouTube adapter
- [ ] `lib/social/platform-adapters/*` — platform API adapters (7 files)
- [ ] `lib/social/preflight-check.ts` — pre-publish validation
- [ ] `lib/social/oauth/config.ts` — OAuth configuration
- [ ] `lib/social/oauth/crypto.ts` — OAuth crypto utilities
- [ ] `lib/social/oauth/token-store.ts` — token storage

### Partners

- [ ] `lib/partners/actions.ts` — partner CRUD
- [ ] `lib/partners/analytics.ts` — partner analytics
- [ ] `lib/partners/invite-actions.ts` — partner invitations
- [ ] `lib/partners/portal-actions.ts` — partner portal
- [ ] `lib/partners/report.ts` — partner reports

### Network & Community

- [ ] `lib/network/actions.ts` — chef network
- [ ] `lib/community/template-sharing.ts` — community template sharing
- [ ] `lib/collaboration/actions.ts` — collaboration features
- [ ] `lib/collaboration/state-machine.ts` — collaboration state machine

---

## SECTION 17: COMPLIANCE, SAFETY & CANNABIS (P4)

### Compliance

- [ ] `lib/compliance/actions.ts` — compliance checks
- [ ] `lib/compliance/account-deletion-actions.ts` — GDPR account deletion
- [ ] `lib/compliance/data-export.ts` — GDPR data export
- [ ] `lib/compliance/pre-deletion-checks.ts` — pre-deletion safety checks
- [ ] `lib/compliance/storage-cleanup.ts` — storage cleanup

### Protection & Insurance

- [ ] `lib/protection/business-health-actions.ts` — business health scoring
- [ ] `lib/protection/certification-actions.ts` — certification tracking
- [ ] `lib/protection/continuity-actions.ts` — business continuity planning
- [ ] `lib/protection/insurance-actions.ts` — insurance management
- [ ] `lib/protection/removal-request-actions.ts` — data removal requests

### Safety

- [ ] `lib/safety/backup-chef-actions.ts` — backup chef arrangements
- [ ] `lib/safety/incident-actions.ts` — incident reporting
- [ ] `lib/safety/recall-actions.ts` — product recall handling

### Cannabis

- [x] `lib/cannabis/control-packet-engine.ts` — control packet generation (unit test exists)
- [ ] `lib/cannabis/invitation-actions.ts` — cannabis event invitations
- [ ] `lib/cannabis/host-agreement.ts` — host agreement generation

### HACCP

- [ ] `lib/haccp/actions.ts` — HACCP plan management
- [ ] `lib/haccp/templates.ts` — HACCP templates

---

## SECTION 18: ADMIN & SYSTEM (P4)

### Admin

- [ ] `lib/admin/audit.ts` — admin audit trail
- [ ] `lib/admin/cannabis-actions.ts` — admin cannabis management
- [ ] `lib/admin/chef-admin-actions.ts` — admin chef management
- [ ] `lib/admin/email-actions.ts` — admin email tools
- [ ] `lib/admin/flag-actions.ts` — feature flag management
- [ ] `lib/admin/platform-actions.ts` — platform-wide operations
- [ ] `lib/admin/platform-stats.ts` — platform statistics
- [ ] `lib/admin/reconciliation-actions.ts` — data reconciliation

### System Health

- [ ] `lib/system/heal-actions.ts` — self-healing actions
- [ ] `lib/system/health-sweep.ts` — health sweep engine

### Automations

- [ ] `lib/automations/actions.ts` — automation CRUD
- [ ] `lib/automations/settings-actions.ts` — automation settings
- [ ] `lib/automations/engine.ts` — automation execution engine
- [ ] `lib/automations/conditions.ts` — condition evaluation
- [ ] `lib/automations/action-handlers.ts` — action handler registry

### Webhooks

- [ ] `lib/webhooks/actions.ts` — webhook CRUD
- [ ] `lib/webhooks/audit-log.ts` — webhook audit logging
- [ ] `lib/webhooks/deliver.ts` — webhook delivery engine

### Cron

- [ ] `lib/cron/heartbeat.ts` — cron heartbeat

---

## SECTION 19: MISCELLANEOUS MODULES (P5)

### Activity Tracking

- [x] `lib/activity/schemas.ts` — activity schemas (unit test exists)
- [x] `lib/activity/merge.ts` — activity merging (unit test exists)
- [ ] `lib/activity/actions.ts` — activity CRUD
- [ ] `lib/activity/track.ts` — activity tracking engine
- [ ] `lib/activity/engagement.ts` — engagement scoring
- [ ] `lib/activity/entity-timeline.ts` — entity timeline builder
- [ ] `lib/activity/intent-notifications.ts` — intent-based notifications
- [ ] `lib/activity/log-chef.ts` — chef activity logging
- [ ] `lib/activity/observability.ts` — observability logging
- [ ] `lib/activity/breadcrumb-actions.ts` — breadcrumb actions
- [ ] `lib/activity/chef-actions.ts` — chef activity actions
- [ ] `lib/activity/preference-actions.ts` — preference actions
- [ ] `lib/activity/resume.ts` — session resume
- [x] `lib/activity/visitor-alert.ts` — visitor alert (unit test exists)

### Validation

- [x] `lib/validation/schemas.ts` — Zod schemas (unit test exists)

### Reviews & Feedback

- [ ] `lib/reviews/actions.ts` — review CRUD
- [ ] `lib/reviews/chef-feedback-actions.ts` — chef-to-client feedback
- [ ] `lib/reviews/external-actions.ts` — external review import
- [ ] `lib/reviews/public-actions.ts` — public review display
- [ ] `lib/feedback/actions.ts` — feedback collection
- [ ] `lib/feedback/user-feedback-actions.ts` — user feedback forms

### Surveys

- [ ] `lib/surveys/actions.ts` — survey CRUD
- [ ] `lib/surveys/survey-utils.ts` — survey utility functions

### Tasks & Todos

- [ ] `lib/tasks/actions.ts` — task CRUD
- [ ] `lib/tasks/recurring-engine.ts` — recurring task engine
- [ ] `lib/tasks/template-actions.ts` — task template management
- [ ] `lib/todos/actions.ts` — todo list actions

### Goals

- [ ] `lib/goals/actions.ts` — goal CRUD
- [ ] `lib/goals/check-in-actions.ts` — goal check-ins
- [ ] `lib/goals/service-mix-actions.ts` — service mix goals
- [ ] `lib/goals/service-mix-utils.ts` — service mix calculations

### Simulation

- [ ] `lib/simulation/simulation-actions.ts` — simulation server actions
- [ ] `lib/simulation/simulation-runner.ts` — simulation runner
- [ ] `lib/simulation/auto-schedule.ts` — auto-scheduling simulation
- [ ] `lib/simulation/pipeline-runner.ts` — pipeline simulation
- [ ] `lib/simulation/quality-evaluator.ts` — quality evaluation
- [ ] `lib/simulation/report-generator.ts` — simulation report generation
- [ ] `lib/simulation/scenario-generator.ts` — scenario generation
- [ ] `lib/simulation/ollama-client.ts` — Ollama client for simulation

### Guest Management

- [ ] `lib/guests/actions.ts` — guest CRUD
- [ ] `lib/guests/comp-actions.ts` — complimentary guest management
- [ ] `lib/guests/reservation-actions.ts` — reservation management
- [ ] `lib/guests/tag-actions.ts` — guest tagging
- [ ] `lib/guests/visit-actions.ts` — guest visit tracking
- [ ] `lib/guests/occupancy-calculator.ts` — occupancy calculations
- [ ] `lib/guest-analytics/actions.ts` — guest analytics
- [ ] `lib/guest-comms/actions.ts` — guest communications
- [ ] `lib/guest-leads/actions.ts` — guest-to-lead conversion
- [ ] `lib/guest-messages/actions.ts` — guest messaging
- [ ] `lib/guest-photos/actions.ts` — guest photo sharing

### Equipment

- [ ] `lib/equipment/actions.ts` — equipment CRUD
- [ ] `lib/equipment/depreciation-actions.ts` — depreciation server actions
- [ ] `lib/equipment/depreciation.ts` — depreciation calculation engine
- [ ] `lib/equipment/equipment-cost-allocation.ts` — cost allocation
- [ ] `lib/equipment/health-rules.ts` — equipment health rules
- [ ] `lib/equipment/inventory-engine.ts` — equipment inventory
- [ ] `lib/equipment/rental-cost.ts` — rental cost calculation

### Wellbeing

- [ ] `lib/wellbeing/wellbeing-actions.ts` — wellbeing check-in
- [ ] `lib/wellbeing/burnout-score.ts` — burnout risk score

### Retention & Churn

- [ ] `lib/retention/churn-engine.ts` — churn prediction engine
- [ ] `lib/retention/cohort-analysis.ts` — cohort analysis
- [ ] `lib/retention/engagement-signals.ts` — engagement signal detection

### Travel & Weather

- [ ] `lib/travel/actions.ts` — travel management
- [ ] `lib/weather/weather-actions.ts` — weather integration
- [ ] `lib/weather/open-meteo.ts` — Open-Meteo API client

### Invoices

- [ ] `lib/invoice/actions.ts` — invoice CRUD
- [ ] `lib/invoice/formatter.ts` — invoice formatting
- [ ] `lib/invoice/numbering.ts` — invoice number generation

### Receipts

- [ ] `lib/receipts/actions.ts` — receipt CRUD
- [ ] `lib/receipts/library-actions.ts` — receipt library
- [ ] `lib/receipts/quick-capture.ts` — quick receipt capture

### Packing

- [ ] `lib/packing/actions.ts` — packing list management

### Portfolio

- [ ] `lib/portfolio/actions.ts` — portfolio CRUD
- [ ] `lib/portfolio/highlight-actions.ts` — portfolio highlights
- [ ] `lib/portfolio/permission-actions.ts` — portfolio access permissions

### Professional Development

- [ ] `lib/professional/actions.ts` — professional profile
- [ ] `lib/professional/capability-actions.ts` — capability tracking
- [ ] `lib/professional/creative-project-actions.ts` — creative projects
- [ ] `lib/professional/education-actions.ts` — education/cert tracking
- [ ] `lib/professional/growth-checkin-actions.ts` — growth check-ins
- [ ] `lib/professional/menu-diversity.ts` — menu diversity scoring
- [ ] `lib/professional/momentum-actions.ts` — momentum tracking

### Milestones & Streaks

- [ ] `lib/milestones/milestone-defs.ts` — milestone definitions
- [ ] `lib/milestones/stats-action.ts` — milestone stats
- [ ] `lib/chefs/streaks.ts` — streak tracking
- [ ] `lib/chefs/health-score.ts` — chef health score
- [ ] `lib/habits/streak-tracker.ts` — habit streak tracker

### Misc Features

- [ ] `lib/onboarding/actions.ts` — onboarding CRUD
- [ ] `lib/onboarding/demo-data.ts` — demo data generation
- [ ] `lib/onboarding/progress-actions.ts` — onboarding progress
- [ ] `lib/booking/booking-settings-actions.ts` — booking settings
- [ ] `lib/booking/instant-book-actions.ts` — instant booking
- [ ] `lib/recurring/actions.ts` — recurring event management
- [ ] `lib/retainers/actions.ts` — retainer management
- [ ] `lib/sharing/actions.ts` — content sharing
- [ ] `lib/search/universal-search.ts` — universal search
- [ ] `lib/translate/translate-actions.ts` — translation
- [ ] `lib/translate/libre-translate.ts` — LibreTranslate client
- [ ] `lib/contact/actions.ts` — contact actions
- [ ] `lib/contact/claim.ts` — contact claiming
- [ ] `lib/profile/actions.ts` — profile management
- [ ] `lib/wix/actions.ts` — Wix integration
- [ ] `lib/wix/submission-actions.ts` — Wix form submissions
- [ ] `lib/wix/process.ts` — Wix data processing
- [ ] `lib/holiday/outreach-actions.ts` — holiday outreach
- [ ] `lib/geo/geo-actions.ts` — geolocation
- [ ] `lib/currency/currency-actions.ts` — currency management
- [ ] `lib/reputation/mention-actions.ts` — brand mention tracking
- [ ] `lib/leads/scoring.ts` — lead scoring
- [ ] `lib/pipeline/forecast.ts` — pipeline forecasting
- [ ] `lib/pipeline/stuck-events.ts` — stuck event detection
- [ ] `lib/daily-ops/actions.ts` — daily operations
- [ ] `lib/daily-ops/draft-engine.ts` — daily ops draft engine
- [ ] `lib/dashboard/actions.ts` — dashboard data actions
- [ ] `lib/dashboard/accountability.ts` — accountability tracking
- [ ] `lib/games/line-actions.ts` — gamification line cook
- [ ] `lib/games/menu-muse-actions.ts` — menu muse game
- [ ] `lib/games/trivia-actions.ts` — trivia game
- [ ] `lib/stations/actions.ts` — station management
- [ ] `lib/stations/clipboard-actions.ts` — station clipboard
- [ ] `lib/stations/daily-ops-actions.ts` — station daily ops
- [ ] `lib/stations/ops-log-actions.ts` — ops log
- [ ] `lib/stations/order-actions.ts` — station orders
- [ ] `lib/stations/waste-actions.ts` — station waste tracking

### Host Marketplace

- [ ] `lib/host-marketplace/actions.ts` — marketplace listing
- [ ] `lib/host-marketplace/commission-calculator.ts` — commission calculation
- [ ] `lib/host-marketplace/endorsement-engine.ts` — endorsement scoring
- [ ] `lib/host-marketplace/feature-matrix.ts` — feature comparison
- [ ] `lib/host-marketplace/query-builders.ts` — marketplace queries

### Impact & Sustainability

- [ ] `lib/impact/carbon-calculator.ts` — carbon footprint calculator
- [ ] `lib/impact/impact-metrics.ts` — impact metrics
- [ ] `lib/impact/social-metrics.ts` — social impact metrics

### Personalization

- [ ] `lib/personalization/preference-engine.ts` — preference engine

### Client Portal & Public

- [ ] `lib/client-portal/actions.ts` — client portal actions
- [ ] `lib/preview/client-portal-preview-actions.ts` — portal preview
- [ ] `lib/public-profile/actions.ts` — public profile
- [ ] `lib/public-profile/social-preview.ts` — social preview cards

---

## SECTION 20: API ROUTES (P3)

Every API route handler — zero have dedicated tests:

### Stripe API (critical)

- [ ] `app/api/stripe/checkout/route.ts`
- [ ] `app/api/stripe/connect/route.ts`
- [ ] `app/api/stripe/webhook/route.ts`
- [ ] `app/api/stripe/create-payment-intent/route.ts`
- [ ] `app/api/stripe/payout/route.ts`
- [ ] `app/api/stripe/subscription/route.ts`
- [ ] `app/api/stripe/transfer/route.ts`

### Auth API

- [ ] `app/api/auth/callback/route.ts`
- [ ] `app/api/auth/confirm/route.ts`
- [ ] `app/api/auth/e2e/route.ts`
- [ ] `app/api/e2e/auth/route.ts`
- [ ] `app/api/e2e/seed/route.ts`

### Cron Jobs

- [ ] `app/api/cron/daily-report/route.ts`
- [ ] `app/api/cron/dormancy-check/route.ts`
- [ ] `app/api/cron/follow-up/route.ts`
- [ ] `app/api/cron/heartbeat/route.ts`
- [ ] `app/api/cron/payment-reminders/route.ts`
- [ ] `app/api/cron/recurring-events/route.ts`
- [ ] `app/api/cron/revenue-snapshot/route.ts`

### AI/Remy API

- [ ] `app/api/remy/stream/route.ts`
- [ ] `app/api/ai/health/route.ts`
- [ ] `app/api/ai/monitor/route.ts`

### Embed/Public API

- [ ] `app/api/embed/inquiry/route.ts`

### Webhook Receivers

- [ ] `app/api/webhooks/gmail/route.ts`
- [ ] `app/api/webhooks/twilio/route.ts`
- [ ] `app/api/webhooks/sendgrid/route.ts`
- [ ] `app/api/webhooks/calendar/route.ts`

### Activity & Analytics API

- [ ] `app/api/activity/track/route.ts`
- [ ] `app/api/activity/breadcrumb/route.ts`
- [ ] `app/api/analytics/posthog/route.ts`

### Other API Routes

- [ ] `app/api/calendar/sync/route.ts`
- [ ] `app/api/calendar/feed/route.ts`
- [ ] `app/api/comms/email/route.ts`
- [ ] `app/api/comms/sms/route.ts`
- [ ] `app/api/documents/upload/route.ts`
- [ ] `app/api/health/route.ts`
- [ ] `app/api/images/placeholder/route.ts`
- [ ] `app/api/integrations/oauth/route.ts`
- [ ] `app/api/push/subscribe/route.ts`
- [ ] `app/api/social/publish/route.ts`

---

## SECTION 21: REACT COMPONENT TESTS (P5)

Zero isolated component tests exist. Priority components to test:

### Complex Form Components

- [ ] `components/events/event-form.tsx` — event creation form
- [ ] `components/quotes/quote-builder.tsx` — quote builder
- [ ] `components/recipes/recipe-editor.tsx` — recipe editor
- [ ] `components/menus/menu-editor.tsx` — menu editor
- [ ] `components/clients/client-form.tsx` — client form

### Financial Components

- [ ] `components/financials/*` — financial dashboards, charts
- [ ] `components/billing/upgrade-gate.tsx` — upgrade gate component

### AI Components

- [ ] `components/ai/remy-drawer.tsx` — Remy chat drawer
- [ ] `components/ai/remy-mascot-button.tsx` — Remy mascot button
- [ ] `components/ai/remy-animated-mascot.tsx` — animated mascot
- [ ] `components/ai/remy-wrapper.tsx` — Remy wrapper

### Embed Components

- [ ] `components/embed/embed-inquiry-form.tsx` — embeddable inquiry form
- [ ] `components/settings/embed-code-panel.tsx` — embed settings

---

## SECTION 22: MIDDLEWARE & REQUEST PIPELINE (P1)

The middleware is the front door of the entire app. A bug here breaks auth, redirects, and tenant scoping for every single route.

- [ ] `middleware.ts` — auth redirect logic (unauthenticated → sign-in, authenticated → dashboard)
- [ ] `middleware.ts` — `skipAuthPaths` matching (public routes, embed routes, API bypasses)
- [ ] `middleware.ts` — tenant scoping injection (does the correct tenant propagate?)
- [ ] `middleware.ts` — role-based redirect logic (chef vs client vs admin landing pages)
- [ ] `middleware.ts` — edge cases (expired session, malformed cookies, missing headers)

---

## SECTION 23: DATABASE INTEGRITY TESTS (P1)

These test the database itself, not the app code. A broken RLS policy or trigger is invisible until data leaks or gets corrupted.

### Row-Level Security (RLS) Policies

- [ ] RLS on `events` — tenant A cannot SELECT/UPDATE/DELETE tenant B's events
- [ ] RLS on `clients` — tenant A cannot see tenant B's clients
- [ ] RLS on `ledger_entries` — tenant A cannot read tenant B's financial entries
- [ ] RLS on `inquiries` — tenant A cannot access tenant B's inquiries
- [ ] RLS on `quotes` — tenant A cannot access tenant B's quotes
- [ ] RLS on `recipes` — tenant A cannot access tenant B's recipes
- [ ] RLS on `menus` — tenant A cannot access tenant B's menus
- [ ] RLS on `staff` — tenant A cannot see tenant B's staff
- [ ] RLS on `inventory_items` — tenant A cannot access tenant B's inventory
- [ ] RLS on `documents` — tenant A cannot access tenant B's documents
- [ ] RLS on `notifications` — tenant A cannot read tenant B's notifications
- [ ] RLS on `chat_messages` — tenant A cannot read tenant B's messages
- [ ] RLS bypass — service role key correctly bypasses RLS when needed
- [ ] RLS on all remaining tables — systematic sweep of every table with `tenant_id`

### Immutability Triggers

- [ ] `ledger_entries` — `UPDATE` must fail with error
- [ ] `ledger_entries` — `DELETE` must fail with error
- [ ] `event_transitions` — `UPDATE` must fail with error
- [ ] `event_transitions` — `DELETE` must fail with error
- [ ] `quote_state_transitions` — `UPDATE` must fail with error
- [ ] `quote_state_transitions` — `DELETE` must fail with error

### Database Views

- [ ] `event_financial_summary` view — returns correct computed balances
- [ ] `event_financial_summary` view — handles events with zero ledger entries
- [ ] `event_financial_summary` view — respects tenant isolation
- [ ] Any other computed views — verify formula correctness after migrations

### Foreign Key & Constraint Integrity

- [ ] `CHECK` constraints on monetary columns (no negative amounts where disallowed)
- [ ] `CHECK` constraints on enum-like columns (status values)
- [ ] `UNIQUE` constraints (email uniqueness, transaction_reference uniqueness)
- [ ] `NOT NULL` constraints on required fields
- [ ] Foreign key cascades — deleting a parent doesn't orphan children silently

### Migration Safety

- [ ] All 60+ migrations apply cleanly to a fresh database (in order)
- [ ] No migration depends on data that may not exist
- [ ] Migrations are idempotent (re-running doesn't break anything)
- [ ] Migration rollback — can the schema be reverted safely?

---

## SECTION 24: CONCURRENCY & RACE CONDITIONS (P1)

No concurrency tests exist. These are invisible until production load hits.

- [ ] Double-click payment button — cannot create two ledger entries for the same payment
- [ ] Concurrent ledger appends — two payments for the same event at the same time
- [ ] Concurrent event FSM transitions — two users transitioning the same event simultaneously
- [ ] Optimistic locking — editing an event while another user also edits it
- [ ] Concurrent quote generation — two quotes for the same inquiry at the same time
- [ ] Stripe webhook replay — same webhook delivered twice (idempotency key handling)
- [ ] Concurrent client creation — deduplication under race conditions
- [ ] Session expiry during active mutation — what happens mid-save?
- [ ] Concurrent cron job execution — two cron triggers fire at the same time

---

## SECTION 25: CUSTOM REACT HOOKS (P4)

15+ hooks with state/effect logic, none tested in isolation.

### lib/hooks/

- [ ] `lib/hooks/use-debounce.ts` — debounce timing, cleanup on unmount
- [ ] `lib/hooks/use-throttle.ts` — throttle timing, edge cases

### lib/hooks/ (in other locations)

- [ ] `lib/hooks/use-billing-data.ts` — billing data fetching, caching
- [ ] `lib/hooks/use-chef-wallet.ts` — wallet balance state
- [ ] `lib/hooks/use-entity-timeline.ts` — timeline data loading
- [ ] `lib/hooks/use-form-state.ts` — form state management, dirty tracking
- [ ] `lib/hooks/use-form-tracking.ts` — form analytics tracking
- [ ] `lib/hooks/use-http-cache.ts` — HTTP cache management
- [ ] `lib/hooks/use-load-balance.ts` — load balancing state
- [ ] `lib/hooks/use-notification-center.ts` — notification center state
- [ ] `lib/hooks/use-pagination.ts` — pagination state, page calculations
- [ ] `lib/hooks/use-payments.ts` — payment state management
- [ ] `lib/hooks/use-query-string.ts` — URL query string sync
- [ ] `lib/hooks/use-remy-response.ts` — Remy response handling
- [ ] `lib/hooks/use-responsive.ts` — responsive breakpoint detection
- [ ] `lib/hooks/use-sidebar.ts` — sidebar open/close state
- [ ] `lib/hooks/use-tile-layout.ts` — tile layout calculations

### AI-specific hooks

- [ ] `lib/ai/use-remy-lip-sync.ts` — lip-sync animation hook
- [ ] `lib/ai/reactive/hooks.ts` — reactive AI hooks

### Other hooks

- [ ] `lib/undo/use-undo-stack.ts` — undo/redo stack management
- [ ] `lib/view-state/use-persistent-view-state.ts` — persistent view state

---

## SECTION 26: CACHING & INFRASTRUCTURE (P3)

- [ ] `lib/cache/upstash.ts` — Upstash Redis cache: set, get, invalidation, TTL expiry
- [ ] `lib/cache/upstash.ts` — cache stampede prevention (concurrent requests for same key)
- [ ] `lib/chef/layout-cache.ts` — layout data caching
- [ ] `lib/chef/layout-data-cache.ts` — layout data cache invalidation
- [ ] `lib/pagination/cursor.ts` — cursor-based pagination math, edge cases (first page, last page, empty)
- [ ] `lib/supabase/client.ts` — client-side Supabase client creation
- [ ] `lib/supabase/server.ts` — server-side Supabase client creation
- [ ] `lib/supabase/admin.ts` — admin Supabase client (service role)

---

## SECTION 27: EMAIL & DOCUMENT RENDERING (P3)

No snapshot/rendering tests for any generated output.

### Email Template Rendering

- [ ] Invoice email — renders correctly with real data, no broken variables
- [ ] Quote email — renders correctly, includes all line items
- [ ] Payment confirmation email — correct amounts, correct currency formatting
- [ ] Inquiry confirmation email — all fields populated
- [ ] Follow-up email templates — variable substitution works
- [ ] Daily report email — charts/tables render correctly
- [ ] Welcome/onboarding email — links are valid

### PDF / Document Generation

- [ ] Invoice PDF generation — layout, math, totals, tax lines
- [ ] Contract PDF generation — all template variables resolved, no `{{undefined}}`
- [ ] Proposal document generation — sections render, images load
- [ ] FOH menu PDF — formatting, allergen icons, course headers
- [ ] Data export (CSV/JSON) — correct encoding, all columns, proper escaping

### iCalendar (ICS) Export

- [ ] `lib/events/export-ics.ts` — valid ICS format, timezone handling, recurring events

---

## SECTION 28: PWA & OFFLINE BEHAVIOR (P5)

- [ ] Service worker registration — installs correctly, caches critical assets
- [ ] Offline fallback — shows offline page when network is unavailable
- [ ] Cache-first strategy — previously loaded pages work offline
- [ ] Background sync — queued mutations sync when back online
- [ ] Push notification delivery — service worker receives and displays push events
- [ ] App manifest — correct icons, theme color, start URL, display mode

---

## SECTION 29: TEST INFRASTRUCTURE (P0 — Build This First)

Without test infrastructure, writing individual tests is painful and slow. This section is about the tools and utilities that make all other tests possible.

### Test Factories & Fixtures

- [ ] `createTestChef()` — factory to create a chef with tenant, auth user, and role
- [ ] `createTestClient()` — factory to create a client linked to a chef
- [ ] `createTestEvent()` — factory to create an event with all required relations
- [ ] `createTestInquiry()` — factory to create an inquiry with client
- [ ] `createTestQuote()` — factory to create a quote with line items
- [ ] `createTestLedgerEntry()` — factory to create ledger entries with valid references
- [ ] `createTestRecipe()` — factory to create a recipe with ingredients
- [ ] `createTestMenu()` — factory to create a menu with dishes
- [ ] `createTestStaffMember()` — factory to create staff with role/permissions
- [ ] `seedTestDatabase()` — seed a clean test DB with realistic interconnected data
- [ ] `cleanupTestData()` — tear down test data without affecting other tenants

### Mock Infrastructure

- [ ] Stripe mock — mock `stripe` SDK for checkout, webhooks, refunds, Connect
- [ ] Ollama mock — mock `parseWithOllama` for deterministic AI responses
- [ ] Supabase mock — mock Supabase client for unit tests that don't need a real DB
- [ ] SendGrid mock — mock email sending, capture sent emails for assertion
- [ ] Twilio mock — mock SMS sending, capture sent messages
- [ ] Spoonacular/Kroger/MealMe mocks — mock grocery API responses
- [ ] Google Calendar mock — mock calendar sync API
- [ ] Cloudflare Turnstile mock — mock captcha verification

### Test Database

- [ ] Isolated test database — separate from dev/beta Supabase for safe integration tests
- [ ] Transaction rollback — wrap each integration test in a transaction that rolls back
- [ ] Parallel test safety — tests don't interfere with each other when run concurrently

---

## SECTION 30: CROSS-CUTTING BEHAVIORAL CONCERNS (P2–P3)

These don't map to a single file — they're behaviors a user experiences that span multiple modules. No isolated tests exist for any of them.

### Timezone Handling (P2)

- [ ] Event times display in chef's local timezone on dashboard/calendar
- [ ] Client portal shows event times in the client's timezone (if different)
- [ ] Timezone edge cases — events crossing midnight, DST transitions
- [ ] Timezone stored correctly in database (UTC) and converted on display
- [ ] Calendar sync (ICS/Google) exports correct timezone-aware datetimes

### Currency & Number Formatting (P2)

- [ ] Cents-to-dollars conversion is consistent across all views (invoices, quotes, ledger, dashboard widgets, daily report)
- [ ] Rounding — no floating-point errors in financial displays (e.g., $10.005 rounding)
- [ ] Large numbers — commas/formatting for $10,000+ amounts
- [ ] Zero and negative amounts — displayed correctly, not as blank or NaN
- [ ] Currency symbol placement — consistent ($X.XX) across all templates and pages

### URL Parameter Tampering & Authorization (P1)

- [ ] Chef A visits `/events/[chefB-event-id]` — gets 404/403, not a crash or data leak
- [ ] Chef A visits `/clients/[chefB-client-id]` — blocked by RLS, graceful error
- [ ] Chef A visits `/quotes/[chefB-quote-id]` — blocked
- [ ] Client visits chef-only routes via direct URL — redirected, not crashed
- [ ] Invalid UUIDs in URL params — handled gracefully (not a 500)
- [ ] SQL injection via URL params — sanitized before hitting database

### Real-Time Updates (P3)

- [ ] Chat messages — user B sees user A's message without refreshing
- [ ] Notifications — new notification appears in notification center live
- [ ] Event status change — dashboard updates when another user transitions an event
- [ ] Supabase Realtime subscription cleanup — no leaked subscriptions on unmount
- [ ] Reconnection after network drop — subscriptions re-establish automatically

### File Upload Edge Cases (P3)

- [ ] Oversized file (>10MB) — shows clear error, doesn't crash
- [ ] Wrong MIME type (e.g., .exe uploaded as profile photo) — rejected
- [ ] Interrupted upload — partial upload doesn't corrupt state
- [ ] Drag-and-drop upload — works on document/photo upload areas
- [ ] Multiple simultaneous uploads — all complete correctly
- [ ] Empty file (0 bytes) — rejected with clear message
- [ ] Filename with special characters (spaces, unicode, long names) — handled

### Browser Navigation & History (P3)

- [ ] Browser back button — returns to previous page, doesn't break state
- [ ] Browser forward button — works after going back
- [ ] Deep linking — bookmarked URL loads the correct page with correct data
- [ ] Filter/sort state in URL — preserved on back/forward, shareable
- [ ] Scroll position — restored when navigating back to a long list
- [ ] Page refresh — current page reloads correctly, doesn't redirect to dashboard

### Multi-Tab Behavior (P3)

- [ ] Sign out in tab A — tab B detects it on next action (doesn't silently fail)
- [ ] Two tabs editing the same event — last write wins, no data corruption
- [ ] Two tabs on different pages — no cross-tab state interference
- [ ] Session refresh — one tab refreshing the session doesn't break the other

### Environment Variable Validation (P2)

- [ ] Missing `STRIPE_SECRET_KEY` — clear startup error, not a runtime crash mid-checkout
- [ ] Missing `NEXT_PUBLIC_SUPABASE_URL` — app fails to start with clear message
- [ ] Missing `SUPABASE_SERVICE_ROLE_KEY` — server actions fail gracefully
- [ ] Missing Ollama endpoint — `OllamaOfflineError` thrown, not a generic crash
- [ ] Missing email provider credentials — emails fail gracefully with warning log
- [ ] Invalid/expired API keys — detected and reported, not silent failures

### Webhook Signature Verification (P1)

- [ ] Stripe webhook — valid signature accepted, processes correctly
- [ ] Stripe webhook — forged/missing signature rejected with 401/403
- [ ] Stripe webhook — expired timestamp rejected (replay attack protection)
- [ ] Twilio webhook — signature verification on inbound SMS
- [ ] SendGrid webhook — signature verification on email events
- [ ] Calendar webhook — signature/token verification

### Audit Trail Completeness (P3)

- [ ] Event creation → activity log entry created
- [ ] Event status transition → activity log entry with before/after state
- [ ] Client creation/update → activity log entry
- [ ] Quote creation/approval → activity log entry
- [ ] Payment recorded → activity log entry with amount
- [ ] Ledger entry created → activity log entry
- [ ] Settings changed → activity log entry
- [ ] Systematic sweep — every server action mutation creates an audit trail entry

### Print & Export Rendering (P4)

- [ ] Invoice print view — `@media print` CSS renders clean layout (no nav, no sidebar)
- [ ] Contract print view — page breaks in correct places, no cut-off text
- [ ] Quote print/export — all line items, totals, and notes included
- [ ] Event summary print — readable single-page layout
- [ ] CSV export — proper escaping (commas in values, quotes, newlines, unicode)
- [ ] JSON export — valid JSON, all fields present, no circular references

### SEO & Public Page Meta (P4)

- [ ] `app/opengraph-image.tsx` — OG image generates correct PNG with brand colors
- [ ] Public pages have correct `<title>`, `<meta description>`, canonical URL
- [ ] Public chef profile — OG tags show chef name, photo, tagline
- [ ] Public inquiry form — no-index (shouldn't appear in search results)
- [ ] Structured data (JSON-LD) — if present, validates against schema.org
- [ ] Sitemap — if generated, includes all public routes, excludes private ones

---

## SUMMARY

| Section                                   | Items  | Priority |
| ----------------------------------------- | ------ | -------- |
| Auth, Security & Tenant Isolation         | 22     | P1       |
| Ledger, Payments & Financial Core         | 24     | P1       |
| Middleware & Request Pipeline             | 5      | P1       |
| Database Integrity (RLS, Triggers, Views) | 35+    | P1       |
| Concurrency & Race Conditions             | 9      | P1       |
| URL Tampering & Webhook Signatures        | 12     | P1       |
| Finance & Tax                             | 48     | P2       |
| Timezone Handling                         | 5      | P2       |
| Currency & Number Formatting              | 5      | P2       |
| Environment Variable Validation           | 6      | P2       |
| Event Lifecycle                           | 38     | P3       |
| Quotes & Pricing                          | 24     | P3       |
| Clients & Inquiries                       | 43     | P3       |
| Recipes, Menus & Food Cost                | 24     | P3       |
| Inventory & Supply Chain                  | 36     | P3       |
| Staff & Labor                             | 10     | P3       |
| Caching & Infrastructure                  | 8      | P3       |
| Email & Document Rendering                | 15     | P3       |
| API Routes                                | 40+    | P3       |
| Real-Time Updates                         | 5      | P3       |
| File Upload Edge Cases                    | 7      | P3       |
| Browser Navigation & History              | 6      | P3       |
| Multi-Tab Behavior                        | 4      | P3       |
| Audit Trail Completeness                  | 8      | P3       |
| AI / Remy / Ollama                        | 120+   | P4       |
| Scheduling & Calendar                     | 19     | P4       |
| Analytics & Reporting                     | 32     | P4       |
| Communications                            | 42     | P4       |
| Marketing, Loyalty & Campaigns            | 28     | P4       |
| Operations & Documents                    | 27     | P4       |
| Compliance, Safety & Cannabis             | 15     | P4       |
| Admin & System                            | 18     | P4       |
| Custom React Hooks                        | 21     | P4       |
| Print & Export Rendering                  | 6      | P4       |
| SEO & Public Page Meta                    | 6      | P4       |
| Social, Community & Partners              | 22     | P5       |
| Miscellaneous Modules                     | 80+    | P5       |
| React Component Tests                     | 15+    | P5       |
| PWA & Offline Behavior                    | 6      | P5       |
| **Test Infrastructure (build first)**     | **22** | **P0**   |

**Grand total: ~880+ items need tests**
**Currently tested (unit/integration): ~15 items**
**Coverage: ~2%**

---

## RECOMMENDED EXECUTION ORDER

1. **P0 — Test Infrastructure** (Section 29) — Build factories, mocks, and test DB first. Everything else depends on this.
2. **P1 — Security & Data Integrity** (Sections 1, 2, 22, 23, 24, 30-URL/Webhooks) — Auth, ledger, middleware, RLS, concurrency, URL tampering, webhook signatures. Bugs here = data leaks or money loss.
3. **P2 — Financial Correctness** (Section 3, 30-Timezone/Currency/Env) — Tax, expense, COGS formulas, timezone handling, currency formatting, env validation. Wrong numbers = lost client trust.
4. **P3 — Core Operations** (Sections 4–9, 20, 26, 27, 30-Realtime/Upload/Nav/Tabs/Audit) — Events, quotes, clients, recipes, inventory, API routes, caching, rendering, real-time, uploads, navigation, audit trail. The daily driver features.
5. **P4 — Product Features** (Sections 10–15, 17–18, 25, 30-Print/SEO) — AI, analytics, comms, marketing, compliance, hooks, print rendering, SEO. Important but lower blast radius.
6. **P5 — Polish** (Sections 16, 19, 21, 28) — Social, misc modules, component tests, PWA. Nice to have.
