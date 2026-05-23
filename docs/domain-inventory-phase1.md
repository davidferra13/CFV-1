# Domain Inventory Phase 1

Generated: 2026-05-23

## Summary

| Metric | Count |
|--------|-------|
| Total domains | 319 |
| Total files | 2,953 |
| Domains with tests | 151 (47%) |
| Domains without tests | 168 (53%) |
| Healthy domains | 118 (37%) |
| At-risk domains | 17 (5%) |
| Critical untested | 3 |

## Critical Untested Domains (P0)

These domains handle money, auth, or safety and have zero test coverage.

| Domain | Files | Risk |
|--------|-------|------|
| **clients** | 89 | CRITICAL, AT-RISK: largest untested domain, handles all client data |
| **menus** | 67 | CRITICAL, AT-RISK: allergen check logic, menu composition |
| **invoices** | 6 | CRITICAL: financial documents, payment triggers |

## At-Risk Domains (10+ files, no tests)

| Domain | Files | Notes |
|--------|-------|-------|
| automations | 14 | Workflow automation rules |
| calling | 29 | Phone/call integration |
| clients | 89 | CRITICAL, client CRUD, profiles, intelligence |
| constants | 10 | Shared constants across domains |
| dinner-circles | 30 | Core relationship primitive |
| guests | 13 | Guest management for events |
| integrations | 11 | External service integration |
| menus | 67 | CRITICAL, menu composition, allergen checks |
| partners | 10 | Partner portal logic |
| prospecting | 12 | Lead generation |
| reports | 18 | Analytics reports |
| scheduling | 41 | Calendar, availability, booking |
| tasks | 10 | Task management |
| templates | 11 | Email/document templates |
| tickets | 14 | Ticketed event support |
| vendors | 26 | Vendor management |
| weather | 10 | Weather integration for events |

## Large Domains (20+ files)

| Domain | Files | Status |
|--------|-------|--------|
| ai | 200 | HEALTHY |
| events | 115 | HEALTHY |
| clients | 89 | AT-RISK |
| ui | 88 | HEALTHY |
| discovery | 87 | HEALTHY |
| pricing | 87 | HEALTHY |
| hub | 72 | HEALTHY |
| intelligence | 69 | HEALTHY |
| menus | 67 | AT-RISK |
| finance | 58 | NEEDS-TYPES |
| openclaw | 55 | HEALTHY |
| documents | 48 | HEALTHY |
| lifecycle | 48 | HEALTHY |
| analytics | 42 | NEEDS-TYPES |
| commerce | 41 | HEALTHY |
| scheduling | 41 | AT-RISK |
| communication | 33 | HEALTHY |
| dinner-circles | 30 | AT-RISK |
| calling | 29 | AT-RISK |
| inquiries | 29 | HEALTHY |
| auth | 28 | NEEDS-TYPES |
| gmail | 28 | HEALTHY |
| hooks | 26 | NEEDS-TYPES |
| vendors | 26 | AT-RISK |
| notifications | 24 | HEALTHY |
| inventory | 23 | NEEDS-TYPES |
| remy | 23 | HEALTHY |
| discover | 22 | HEALTHY |
| onboarding | 22 | HEALTHY |
| recipes | 22 | NEEDS-TYPES |
| staff | 22 | HEALTHY |
| admin | 21 | HEALTHY |
| security | 21 | HEALTHY |
| marketing | 20 | NEEDS-TYPES |

## Domains Needing Type Definitions

Large domains (5+ exports) without dedicated type files:

- finance (58 files)
- analytics (42 files)
- auth (28 files)
- hooks (26 files)
- inventory (23 files)
- recipes (22 files)
- marketing (20 files)
- compliance (17 files)
- api (7 files)
- availability (6 files)
- billing (7 files)
- booking (9 files)
- cannabis (11 files)
- chef (18 files)
- contracts (8 files)
- db (8 files)

## Cross-Boundary Flow Coverage

| Flow | Domains Crossed | Test Coverage |
|------|----------------|---------------|
| Inquiry to Shopping List | inquiries, clients, events, menus, recipes, grocery | PARTIAL (events FSM tested, others not) |
| Event to Ledger | events, quotes, invoices, finance, ledger | PARTIAL (quotes math, ledger append, event FSM tested) |
| Client Dietary to Menu Safety | clients, dietary, menus | NEW (added in this session) |

## Recommendations

1. **P0: Add tests for clients, menus, invoices** - These are critical domains with zero coverage
2. **P1: Add tests for scheduling (41 files), dinner-circles (30 files), calling (29 files)** - Large at-risk domains
3. **P2: Add type definitions for finance, analytics, auth, hooks** - Large domains without types
4. **P3: Consolidate constants** - 10 files in constants/ with no tests; these are shared across the app

## Status Legend

- **HEALTHY**: Has tests and types, appropriately sized
- **NEEDS-TEST**: Domain exists without any test coverage
- **NEEDS-TYPES**: Large domain without dedicated type definitions
- **AT-RISK**: 10+ files with no test coverage (high entropy risk)
- **CRITICAL**: Handles money, auth, or food safety