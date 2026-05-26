# Exit-Eval Codex Runner

> **Generated:** 2026-05-25
> **Total:** 76 prompts | 489 scenarios | 7 roles

## How to Use

### Run All (Sequential)

```
Read docs/exit-evals/RUNNER.md for context. Then execute each prompt file in
docs/exit-evals/prompts/ sequentially, starting from prompt 01. For each prompt:
1. Read the prompt file
2. Read the source files it references
3. Execute the evaluation per the rubric
4. Write output to the specified file
5. Update docs/exit-system-roadmap.md
6. Move to the next prompt
```

### Run One Wave

```
Read docs/exit-evals/RUNNER.md. Execute only Wave [N] (prompts [XX]-[YY], [Role] role).
For each prompt file, read it, execute the evaluation, write output, update roadmap.
```

### Run Single Prompt

```
Read and execute docs/exit-evals/prompts/[NN]-[role]-[category].md
```

## Wave Structure

| Wave | Role      | Prompts | Scenarios | Files |
| ---- | --------- | ------- | --------- | ----- |
| 1    | Chef      | 18      | 95        | 01-18 |
| 2    | Client    | 13      | 91        | 19-31 |
| 3    | Admin     | 9       | 72        | 32-40 |
| 4    | Guest     | 10      | 65        | 41-50 |
| 5    | Partner   | 10      | 56        | 51-60 |
| 6    | Vendor    | 7       | 56        | 61-67 |
| 7    | Staff     | 9       | 54        | 68-76 |
|      | **TOTAL** | **76**  | **489**   |       |

## Prompt Index

| #   | File                                                    | Role    | Category                                        | Scenarios                          | Status  |
| --- | ------------------------------------------------------- | ------- | ----------------------------------------------- | ---------------------------------- | ------- |
| 01  | `01-chef-costing-pricing-highest-frequency-exit.md`     | Chef    | COSTING & PRICING (Highest Frequency Exit)      | 1, 2, 3, 4, 5, 6, 7                | PENDING |
| 02  | `02-chef-vendor-supplier-interaction.md`                | Chef    | VENDOR & SUPPLIER INTERACTION                   | 8, 9, 10, 11, 12, 13               | PENDING |
| 03  | `03-chef-client-research-relationship.md`               | Chef    | CLIENT RESEARCH & RELATIONSHIP                  | 14, 15, 16, 17, 18                 | PENDING |
| 04  | `04-chef-recipe-culinary-research.md`                   | Chef    | RECIPE & CULINARY RESEARCH                      | 19, 20, 21, 22, 23, 24             | PENDING |
| 05  | `05-chef-communication-the-messy-reality.md`            | Chef    | COMMUNICATION (The Messy Reality)               | 25, 26, 27, 28, 29, 30, 31         | PENDING |
| 06  | `06-chef-marketing-social-presence.md`                  | Chef    | MARKETING & SOCIAL PRESENCE                     | 32, 33, 34, 35, 36, 37             | PENDING |
| 07  | `07-chef-money-payments.md`                             | Chef    | MONEY & PAYMENTS                                | 38, 39, 40, 41, 42                 | PENDING |
| 08  | `08-chef-logistics-travel.md`                           | Chef    | LOGISTICS & TRAVEL                              | 43, 44, 45, 46, 47                 | PENDING |
| 09  | `09-chef-legal-compliance.md`                           | Chef    | LEGAL & COMPLIANCE                              | 48, 49, 50, 51, 52                 | PENDING |
| 10  | `10-chef-professional-development.md`                   | Chef    | PROFESSIONAL DEVELOPMENT                        | 53, 54, 55, 56                     | PENDING |
| 11  | `11-chef-event-specific-research.md`                    | Chef    | EVENT-SPECIFIC RESEARCH                         | 57, 58, 59, 60, 61                 | PENDING |
| 12  | `12-chef-hardware-equipment.md`                         | Chef    | HARDWARE & EQUIPMENT                            | 62, 63, 64                         | PENDING |
| 13  | `13-chef-people-delegation.md`                          | Chef    | PEOPLE & DELEGATION                             | 65, 66, 67, 68, 69, 70, 71         | PENDING |
| 14  | `14-chef-operational-tools-calculations-part1.md`       | Chef    | OPERATIONAL TOOLS & CALCULATIONS (Pt 1)         | 72, 73, 74, 75, 76, 77, 78, 79     | PENDING |
| 15  | `15-chef-operational-tools-calculations-part2.md`       | Chef    | OPERATIONAL TOOLS & CALCULATIONS (Pt 2)         | 80, 81, 82, 83, 84, 85, 86         | PENDING |
| 16  | `16-chef-time-location-logistics.md`                    | Chef    | TIME & LOCATION LOGISTICS                       | 87, 88, 89, 90                     | PENDING |
| 17  | `17-chef-market-competitive-intelligence.md`            | Chef    | MARKET & COMPETITIVE INTELLIGENCE               | 91, 92                             | PENDING |
| 18  | `18-chef-during-service-the-kitchen-boundary.md`        | Chef    | DURING-SERVICE (The Kitchen Boundary)           | 93, 94, 95                         | PENDING |
| 19  | `19-client-discovery-chef-research.md`                  | Client  | DISCOVERY & CHEF RESEARCH                       | 1, 2, 3, 4, 5, 6, 7                | PENDING |
| 20  | `20-client-trust-reviews-validation.md`                 | Client  | TRUST, REVIEWS & VALIDATION                     | 8, 9, 10, 11, 12, 13               | PENDING |
| 21  | `21-client-booking-comparison-budgeting.md`             | Client  | BOOKING COMPARISON & BUDGETING                  | 14, 15, 16, 17, 18, 19, 20         | PENDING |
| 22  | `22-client-calendar-scheduling.md`                      | Client  | CALENDAR & SCHEDULING                           | 21, 22, 23, 24, 25, 26             | PENDING |
| 23  | `23-client-communication.md`                            | Client  | COMMUNICATION                                   | 27, 28, 29, 30, 31, 32, 33, 34     | PENDING |
| 24  | `24-client-payments-money-receipts.md`                  | Client  | PAYMENTS, MONEY & RECEIPTS                      | 35, 36, 37, 38, 39, 40, 41, 42     | PENDING |
| 25  | `25-client-event-planning-vendor-coordination.md`       | Client  | EVENT PLANNING & VENDOR COORDINATION            | 43, 44, 45, 46, 47, 48, 49, 50, 51 | PENDING |
| 26  | `26-client-guest-coordination.md`                       | Client  | GUEST COORDINATION                              | 52, 53, 54, 55, 56, 57, 58, 59     | PENDING |
| 27  | `27-client-menu-dietary-beverage-research.md`           | Client  | MENU, DIETARY & BEVERAGE RESEARCH               | 60, 61, 62, 63, 64, 65, 66, 67     | PENDING |
| 28  | `28-client-venue-home-logistics.md`                     | Client  | VENUE, HOME & LOGISTICS                         | 68, 69, 70, 71, 72, 73, 74, 75     | PENDING |
| 29  | `29-client-travel-directions-day-of-movement.md`        | Client  | TRAVEL, DIRECTIONS & DAY-OF MOVEMENT            | 76, 77, 78, 79, 80                 | PENDING |
| 30  | `30-client-legal-privacy-compliance.md`                 | Client  | LEGAL, PRIVACY & COMPLIANCE                     | 81, 82, 83, 84                     | PENDING |
| 31  | `31-client-post-event-social-memory.md`                 | Client  | POST-EVENT, SOCIAL & MEMORY                     | 85, 86, 87, 88, 89, 90, 91         | PENDING |
| 32  | `32-admin-authentication-admin-access-role-control.md`  | Admin   | AUTHENTICATION, ADMIN ACCESS & ROLE CONTROL     | 1, 2, 3, 4, 5, 6, 7, 8             | PENDING |
| 33  | `33-admin-infrastructure-deployment-local-services.md`  | Admin   | INFRASTRUCTURE, DEPLOYMENT & LOCAL SERVICES     | 9, 10, 11, 12, 13, 14, 15, 16      | PENDING |
| 34  | `34-admin-database-migrations-cross-tenant-data-re.md`  | Admin   | DATABASE, MIGRATIONS & CROSS-TENANT DATA REPAIR | 17, 18, 19, 20, 21, 22, 23, 24     | PENDING |
| 35  | `35-admin-payments-finance-accounting.md`               | Admin   | PAYMENTS, FINANCE & ACCOUNTING                  | 25, 26, 27, 28, 29, 30, 31, 32     | PENDING |
| 36  | `36-admin-communication-support-user-relationships.md`  | Admin   | COMMUNICATION, SUPPORT & USER RELATIONSHIPS     | 33, 34, 35, 36, 37, 38, 39, 40     | PENDING |
| 37  | `37-admin-web-research-directory-outreach.md`           | Admin   | WEB RESEARCH, DIRECTORY & OUTREACH              | 41, 42, 43, 44, 45, 46, 47, 48     | PENDING |
| 38  | `38-admin-pricing-openclaw-market-data.md`              | Admin   | PRICING, OPENCLAW & MARKET DATA                 | 49, 50, 51, 52, 53, 54, 55, 56     | PENDING |
| 39  | `39-admin-legal-policy-privacy-regulated-flows.md`      | Admin   | LEGAL, POLICY, PRIVACY & REGULATED FLOWS        | 57, 58, 59, 60, 61, 62, 63, 64     | PENDING |
| 40  | `40-admin-qa-security-system-integrity.md`              | Admin   | QA, SECURITY & SYSTEM INTEGRITY                 | 65, 66, 67, 68, 69, 70, 71, 72     | PENDING |
| 41  | `41-guest-public-discovery-trust-validation.md`         | Guest   | PUBLIC DISCOVERY & TRUST VALIDATION             | 1, 2, 3, 4, 5, 6, 7                | PENDING |
| 42  | `42-guest-event-invite-rsvp-coordination.md`            | Guest   | EVENT INVITE & RSVP COORDINATION                | 8, 9, 10, 11, 12, 13, 14           | PENDING |
| 43  | `43-guest-calendar-maps-arrival-logistics.md`           | Guest   | CALENDAR, MAPS & ARRIVAL LOGISTICS              | 15, 16, 17, 18, 19, 20, 21         | PENDING |
| 44  | `44-guest-payments-tickets-money.md`                    | Guest   | PAYMENTS, TICKETS & MONEY                       | 22, 23, 24, 25, 26, 27, 28         | PENDING |
| 45  | `45-guest-dietary-allergy-health-context.md`            | Guest   | DIETARY, ALLERGY & HEALTH CONTEXT               | 29, 30, 31, 32, 33, 34             | PENDING |
| 46  | `46-guest-menu-food-experience-research.md`             | Guest   | MENU, FOOD & EXPERIENCE RESEARCH                | 35, 36, 37, 38, 39, 40             | PENDING |
| 47  | `47-guest-dinner-circle-no-login-profile-access.md`     | Guest   | DINNER CIRCLE & NO-LOGIN PROFILE ACCESS         | 41, 42, 43, 44, 45, 46, 47         | PENDING |
| 48  | `48-guest-photos-social-memory.md`                      | Guest   | PHOTOS, SOCIAL & MEMORY                         | 48, 49, 50, 51, 52, 53             | PENDING |
| 49  | `49-guest-proposal-booking-future-event-handoffs.md`    | Guest   | PROPOSAL, BOOKING & FUTURE EVENT HANDOFFS       | 54, 55, 56, 57, 58, 59             | PENDING |
| 50  | `50-guest-support-privacy-legal.md`                     | Guest   | SUPPORT, PRIVACY & LEGAL                        | 60, 61, 62, 63, 64, 65             | PENDING |
| 51  | `51-partner-account-claiming-access.md`                 | Partner | ACCOUNT CLAIMING & ACCESS                       | 1, 2, 3, 4, 5                      | PENDING |
| 52  | `52-partner-partner-intake-chef-relationship-setup.md`  | Partner | PARTNER INTAKE & CHEF RELATIONSHIP SETUP        | 6, 7, 8, 9, 10                     | PENDING |
| 53  | `53-partner-profile-content-public-showcase.md`         | Partner | PROFILE CONTENT & PUBLIC SHOWCASE               | 11, 12, 13, 14, 15, 16, 17         | PENDING |
| 54  | `54-partner-location-details-venue-operations.md`       | Partner | LOCATION DETAILS & VENUE OPERATIONS             | 18, 19, 20, 21, 22, 23, 24         | PENDING |
| 55  | `55-partner-event-history-attribution-reporting.md`     | Partner | EVENT HISTORY, ATTRIBUTION & REPORTING          | 25, 26, 27, 28, 29, 30             | PENDING |
| 56  | `56-partner-commission-payouts-money.md`                | Partner | COMMISSION, PAYOUTS & MONEY                     | 31, 32, 33, 34, 35, 36             | PENDING |
| 57  | `57-partner-communication-relationship-management.md`   | Partner | COMMUNICATION & RELATIONSHIP MANAGEMENT         | 37, 38, 39, 40, 41                 | PENDING |
| 58  | `58-partner-referral-generation-external-discovery.md`  | Partner | REFERRAL GENERATION & EXTERNAL DISCOVERY        | 42, 43, 44, 45, 46                 | PENDING |
| 59  | `59-partner-legal-privacy-compliance.md`                | Partner | LEGAL, PRIVACY & COMPLIANCE                     | 47, 48, 49, 50, 51                 | PENDING |
| 60  | `60-partner-day-of-operations.md`                       | Partner | DAY-OF OPERATIONS                               | 52, 53, 54, 55, 56                 | PENDING |
| 61  | `61-vendor-invite-account-access-boundaries.md`         | Vendor  | INVITE, ACCOUNT & ACCESS BOUNDARIES             | 1, 2, 3, 4, 5, 6, 7                | PENDING |
| 62  | `62-vendor-catalog-price-sheets-product-data.md`        | Vendor  | CATALOG, PRICE SHEETS & PRODUCT DATA            | 8, 9, 10, 11, 12, 13, 14, 15, 16   | PENDING |
| 63  | `63-vendor-purchase-order-fulfillment.md`               | Vendor  | PURCHASE ORDER FULFILLMENT                      | 17, 18, 19, 20, 21, 22, 23, 24, 25 | PENDING |
| 64  | `64-vendor-delivery-logistics-physical-fulfillment.md`  | Vendor  | DELIVERY, LOGISTICS & PHYSICAL FULFILLMENT      | 26, 27, 28, 29, 30, 31, 32, 33     | PENDING |
| 65  | `65-vendor-invoices-payments-accounting.md`             | Vendor  | INVOICES, PAYMENTS & ACCOUNTING                 | 34, 35, 36, 37, 38, 39, 40, 41     | PENDING |
| 66  | `66-vendor-communication-disputes-relationship-memo.md` | Vendor  | COMMUNICATION, DISPUTES & RELATIONSHIP MEMORY   | 42, 43, 44, 45, 46, 47, 48, 49     | PENDING |
| 67  | `67-vendor-compliance-business-ops-supplier-systems.md` | Vendor  | COMPLIANCE, BUSINESS OPS & SUPPLIER SYSTEMS     | 50, 51, 52, 53, 54, 55, 56         | PENDING |
| 68  | `68-staff-day-of-communication-escalation.md`           | Staff   | DAY-OF COMMUNICATION & ESCALATION               | 1, 2, 3, 4, 5, 6, 7, 8             | PENDING |
| 69  | `69-staff-maps-travel-arrival.md`                       | Staff   | MAPS, TRAVEL & ARRIVAL                          | 9, 10, 11, 12, 13, 14              | PENDING |
| 70  | `70-staff-clock-pay-banking-tax.md`                     | Staff   | CLOCK, PAY, BANKING & TAX                       | 15, 16, 17, 18, 19, 20, 21         | PENDING |
| 71  | `71-staff-schedule-availability-swaps.md`               | Staff   | SCHEDULE, AVAILABILITY & SWAPS                  | 22, 23, 24, 25, 26, 27             | PENDING |
| 72  | `72-staff-kitchen-execution-hardware.md`                | Staff   | KITCHEN EXECUTION & HARDWARE                    | 28, 29, 30, 31, 32, 33             | PENDING |
| 73  | `73-staff-recipe-sop-training-reference.md`             | Staff   | RECIPE, SOP & TRAINING REFERENCE                | 34, 35, 36, 37, 38, 39             | PENDING |
| 74  | `74-staff-supplies-inventory-emergency-purchasing.md`   | Staff   | SUPPLIES, INVENTORY & EMERGENCY PURCHASING      | 40, 41, 42, 43, 44                 | PENDING |
| 75  | `75-staff-account-access-support.md`                    | Staff   | ACCOUNT, ACCESS & SUPPORT                       | 45, 46, 47, 48, 49                 | PENDING |
| 76  | `76-staff-offline-low-signal-device-boundaries.md`      | Staff   | OFFLINE, LOW-SIGNAL & DEVICE BOUNDARIES         | 50, 51, 52, 53, 54                 | PENDING |

## Progress Tracking

After completing each prompt, update the Status column above from PENDING to DONE.

When a full wave is complete, update `docs/exit-system-roadmap.md` role status from NOT STARTED/IN PROGRESS to DONE.

## Quality Contract

- Every scenario gets all 7 rubric questions answered
- Classifications must be one of: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent
- Solution designs grounded in what ChefFlow actually has today (check the codebase)
- All output marked NEEDS-DEVELOPER-REVIEW (solo mode)
- Specs written only for Reducible scenarios complex enough to warrant standalone docs
- Each output file ends with a Batch Summary table
