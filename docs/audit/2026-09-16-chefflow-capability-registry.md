# ChefFlow Capability Registry Audit

Generated: 2026-09-16T19:31:14.950Z

North star: **Can a chef operate their entire working day from ChefFlow without needing to think about or manually switch between a stack of other applications?**

- capabilities: 84
- unresolved capability gaps: 84
- workflows with stack elimination verified in the registry: 0
- LAUNCH ONLY debt: 1
- candidate code + related-test signals: 80
- candidate code signals only: 4
- no mapped code signal: 0

## Backlog

| priority | shell | capability | strategy | build | test | repo evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Today | Daily command center | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Today | Exception and risk triage | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Today | Next-best-action briefing | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Today | Multi-location operating rollup | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Tasks | Task capture and assignment | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Tasks | Recurring operational checklists | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Tasks | Maintenance work orders | OWN | MISSING | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Tasks | Shift handoff and completion proof | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Schedule | Unified operator calendar | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Schedule | Staff scheduling | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Schedule | Availability, time-off, and shift swaps | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Schedule | Labor forecasting and schedule guardrails | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Team | Contextual team communication | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Team | Announcements and acknowledgements | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_SIGNAL_ONLY |
| P0 | Team | Role and permission management | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Team | Cross-location collaboration | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inbox | Email aggregation and reply | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Inbox | SMS and call aggregation | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inbox | External channel notification aggregation | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inbox | Action extraction and triage | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Clients / Guests | Unified client and guest profile | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Clients / Guests | Preference, allergy, and dietary memory | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Clients / Guests | CRM segmentation and lifecycle | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Clients / Guests | Relationship marketing and retention | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Orders / Reservations | POS order lifecycle | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Orders / Reservations | Reservations, waitlist, table, and pacing management | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Orders / Reservations | Delivery channel aggregation | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Orders / Reservations | Catering and private-event booking | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Menus | Canonical menu system | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Menus | Multi-channel menu publishing | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Menus | Menu engineering and profitability | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Menus | Menu variants and dietary substitutions | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Recipes | Recipe system of record | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Recipes | Scaling, yields, and unit conversion | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Recipes | Live recipe and food costing | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Recipes | Nutrition, allergens, and labeling | OWN | AUDIT_REQUIRED | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Prep | Production and prep plan generation | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Prep | Station execution and kitchen status | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Prep | Kitchen display and firing orchestration | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Prep | Packing, pickup, and dispatch readiness | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inventory | Inventory counts and par levels | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inventory | Actual versus theoretical usage | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Inventory | Waste, spoilage, and loss tracking | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Inventory | Transfers and multi-location stock | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Purchasing | Requisitions and purchase orders | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Purchasing | Vendor ordering through ChefFlow | INTEGRATE | MISSING | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Purchasing | Forecast-driven suggested ordering | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Purchasing | Purchasing approvals and spend controls | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Receiving | Invoice and packing-slip capture | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Receiving | PO, receipt, and invoice matching | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Receiving | Receiving discrepancy workflow | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Receiving | Invoice processing and AP handoff | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Vendors | Vendor master and relationship record | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Vendors | Catalog normalization | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Vendors | Cross-vendor price and availability comparison | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Vendors | Contracts, credits, and disputes | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Food Safety | HACCP and temperature logging | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Food Safety | Corrective actions and incident response | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Food Safety | Allergen control and service verification | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Food Safety | Compliance, certifications, and inspection readiness | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Events | Event and BEO workspace | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Events | Run of show and service timeline | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Events | Venue and logistics coordination | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Events | Catering sales-to-operations continuity | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Payments | Card, ACH, and in-person payment acceptance | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Payments | Deposits, payment schedules, and invoices | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Payments | Refunds, adjustments, tips, and gratuity | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Payments | Processor and payout reconciliation | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Documents | Operational document system | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Documents | Templates, generation, and approvals | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Documents | Electronic signatures | INTEGRATE | MISSING | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Documents | Scan, OCR, import, and universal search | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Employees | Employee onboarding and records | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Employees | Time clock, attendance, breaks, and labor records | INTEGRATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_SIGNAL_ONLY |
| P0 | Employees | Payroll calculation, filing, and payout | INTEGRATE | MISSING | AUDIT_REQUIRED | CANDIDATE_CODE_SIGNAL_ONLY |
| P1 | Employees | Training, certifications, and skill progression | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_SIGNAL_ONLY |
| P0 | Financials | Accounting system and general ledger continuity | INTEGRATE | AUDIT_REQUIRED | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Financials | Accounts payable and expense management | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Financials | P&L, cash flow, and margin truth | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Financials | Tax calculation and filing handoff | LAUNCH_ONLY | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P0 | Analytics | Prime cost and controllable-cost analytics | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Analytics | Menu and item performance analytics | OWN | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Analytics | Labor productivity and staffing analytics | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |
| P1 | Analytics | Multi-location benchmarking and anomaly detection | AGGREGATE | PARTIAL | AUDIT_REQUIRED | CANDIDATE_CODE_AND_TEST_SIGNAL |

## Interpretation

Repo evidence means candidate implementation paths exist; it does **not** prove the workflow is complete. A capability leaves the backlog only after the build and end-to-end test statuses are VERIFIED and no external interaction remains.
