# Chef vs Remy Inventory by Business Flow

Generated: 2026-03-03

This view groups capability lists by business flow to prioritize parity work.

## Totals

- Chef policy/resource actions: 30
- Chef portal route actions: 469
- Remy orchestrator-supported tasks: 56
- Remy agent actions (including restricted): 58
- Remy explicitly restricted actions: 8

## Growth & Sales

Chef policy/resource actions (5):

- API keys (own)
- Convert inquiry to event
- Create quote
- View inquiry
- Webhook endpoints

Chef portal route actions (66):

- /community/templates
- /guest-leads
- /inquiries
- /inquiries/[id]
- /inquiries/awaiting-client-reply
- /inquiries/awaiting-response
- /inquiries/declined
- /inquiries/menu-drafting
- /inquiries/new
- /inquiries/sent-to-client
- /leads
- /leads/archived
- /leads/contacted
- /leads/converted
- /leads/new
- /leads/qualified
- /marketing
- /marketing/[id]
- /marketing/push-dinners
- /marketing/push-dinners/[id]
- /marketing/push-dinners/new
- /marketing/sequences
- /marketing/templates
- /network
- /network/[chefId]
- /network/channels/[slug]
- /network/notifications
- /network/saved
- /partners
- /partners/[id]
- /partners/[id]/edit
- /partners/[id]/report
- /partners/active
- /partners/events-generated
- /partners/inactive
- /partners/new
- /partners/referral-performance
- /prospecting
- /prospecting/[id]
- /prospecting/clusters
- /prospecting/import
- /prospecting/pipeline
- /prospecting/queue
- /prospecting/scripts
- /prospecting/scrub
- /quotes
- /quotes/[id]
- /quotes/[id]/edit
- /quotes/accepted
- /quotes/draft
- /quotes/expired
- /quotes/new
- /quotes/rejected
- /quotes/sent
- /quotes/viewed
- /reputation/mentions
- /social
- /social/connections
- /social/hub-overview
- /social/planner
- /social/planner/[month]
- /social/posts/[id]
- /social/settings
- /social/vault
- /testimonials
- /wix-submissions/[id]

Remy orchestrator tasks (20):

- draft.cancellation_response
- draft.confirmation
- draft.decline_response
- draft.food_safety_incident
- draft.milestone_recognition
- draft.payment_reminder
- draft.quote_cover_letter
- draft.re_engagement
- draft.referral_request
- draft.testimonial_request
- draft.thank_you
- email.draft_reply
- email.followup
- email.generic
- email.inbox_summary
- email.recent
- email.search
- email.thread
- inquiry.details
- inquiry.list_open

Remy agent actions (8):

- agent.convert_inquiry
- agent.create_inquiry
- agent.create_quote
- agent.decline_inquiry
- agent.draft_email
- agent.transition_inquiry
- agent.transition_quote
- agent.update_inquiry

Remy restricted actions (0):

- (none)

## Clients & Guest Experience

Chef policy/resource actions (10):

- Create client
- Create menu
- Delete client
- Invite client (portal)
- Send message
- Update client
- View client list
- View conversation
- View menu
- View own client record

Chef portal route actions (45):

- /clients
- /clients/[id]
- /clients/[id]/preferences
- /clients/[id]/recurring
- /clients/active
- /clients/communication
- /clients/communication/follow-ups
- /clients/communication/notes
- /clients/communication/upcoming-touchpoints
- /clients/duplicates
- /clients/gift-cards
- /clients/history
- /clients/history/event-history
- /clients/history/past-menus
- /clients/history/spending-history
- /clients/inactive
- /clients/insights
- /clients/insights/at-risk
- /clients/insights/most-frequent
- /clients/insights/top-clients
- /clients/loyalty
- /clients/loyalty/points
- /clients/loyalty/referrals
- /clients/loyalty/rewards
- /clients/new
- /clients/preferences
- /clients/preferences/allergies
- /clients/preferences/dietary-restrictions
- /clients/preferences/dislikes
- /clients/preferences/favorite-dishes
- /clients/presence
- /clients/segments
- /clients/vip
- /guest-analytics
- /guests
- /guests/[id]
- /guests/reservations
- /loyalty
- /loyalty/learn
- /loyalty/raffle
- /loyalty/raffle/[id]
- /loyalty/rewards/new
- /loyalty/settings
- /reviews
- /surveys

Remy orchestrator tasks (8):

- chef.favorite_chefs
- client.details
- client.event_recap
- client.list_recent
- client.menu_explanation
- client.search
- dietary.check
- loyalty.status

Remy agent actions (7):

- agent.add_client_note
- agent.add_client_tag
- agent.add_inquiry_note
- agent.create_client
- agent.invite_client
- agent.remove_client_tag
- agent.update_client

Remy restricted actions (0):

- (none)

## Events & Scheduling

Chef policy/resource actions (8):

- Create event
- Delete event
- Transition: \*â†’cancelled
- Transition: draftâ†’proposed
- Transition: in_progressâ†’completed
- Transition: paidâ†’confirmed
- Update event
- View event

Chef portal route actions (75):

- /calendar
- /calendar/day
- /calendar/share
- /calendar/week
- /calendar/year
- /calls
- /calls/[id]
- /calls/[id]/edit
- /calls/new
- /cannabis
- /cannabis/about
- /cannabis/agreement
- /cannabis/compliance
- /cannabis/control-packet/template
- /cannabis/events
- /cannabis/events/[id]/control-packet
- /cannabis/handbook
- /cannabis/hub
- /cannabis/invite
- /cannabis/ledger
- /cannabis/rsvps
- /cannabis/unlock
- /charity
- /charity/hours
- /events
- /events/[id]
- /events/[id]/aar
- /events/[id]/close-out
- /events/[id]/debrief
- /events/[id]/documents
- /events/[id]/dop/mobile
- /events/[id]/edit
- /events/[id]/financial
- /events/[id]/grocery-quote
- /events/[id]/guest-card
- /events/[id]/interactive
- /events/[id]/invoice
- /events/[id]/kds
- /events/[id]/pack
- /events/[id]/receipts
- /events/[id]/schedule
- /events/[id]/split-billing
- /events/[id]/travel
- /events/awaiting-deposit
- /events/board
- /events/cancelled
- /events/completed
- /events/confirmed
- /events/new
- /events/new/from-text
- /events/new/wizard
- /events/upcoming
- /operations
- /operations/equipment
- /operations/kitchen-rentals
- /production
- /safety/backup-chef
- /safety/incidents
- /safety/incidents/[id]
- /safety/incidents/new
- /schedule
- /scheduling
- /stations
- /stations/[id]
- /stations/[id]/clipboard
- /stations/[id]/clipboard/print
- /stations/daily-ops
- /stations/ops-log
- /stations/orders
- /stations/orders/print
- /stations/waste
- /tasks
- /tasks/templates
- /travel
- /waitlist

Remy orchestrator tasks (10):

- calendar.availability
- event.create_draft
- event.details
- event.list_by_status
- event.list_upcoming
- nudge.list
- prep.timeline
- safety.event_allergens
- scheduling.next_available
- waitlist.list

Remy agent actions (15):

- agent.acknowledge_scope_drift
- agent.clone_event
- agent.complete_safety_checklist
- agent.create_calendar_entry
- agent.create_event
- agent.generate_prep_timeline
- agent.hold_date
- agent.log_alcohol
- agent.log_mileage
- agent.record_tip
- agent.save_debrief
- agent.schedule_call
- agent.transition_event
- agent.update_calendar_entry
- agent.update_event

Remy restricted actions (0):

- (none)

## Culinary & Menu Engineering

Chef policy/resource actions (1):

- Manage recipes

Chef portal route actions (71):

- /culinary
- /culinary/components
- /culinary/components/ferments
- /culinary/components/garnishes
- /culinary/components/sauces
- /culinary/components/shared-elements
- /culinary/components/stocks
- /culinary/costing
- /culinary/costing/food-cost
- /culinary/costing/menu
- /culinary/costing/recipe
- /culinary/dish-index
- /culinary/dish-index/[id]
- /culinary/dish-index/insights
- /culinary/ingredients
- /culinary/ingredients/seasonal-availability
- /culinary/ingredients/vendor-notes
- /culinary/menus
- /culinary/menus/[id]
- /culinary/menus/approved
- /culinary/menus/drafts
- /culinary/menus/scaling
- /culinary/menus/substitutions
- /culinary/menus/templates
- /culinary/my-kitchen
- /culinary/prep
- /culinary/prep/shopping
- /culinary/prep/timeline
- /culinary/recipes
- /culinary/recipes/[id]
- /culinary/recipes/dietary-flags
- /culinary/recipes/drafts
- /culinary/recipes/seasonal-notes
- /culinary/recipes/tags
- /culinary/vendors
- /food-cost
- /food-cost/revenue
- /inventory
- /inventory/audits
- /inventory/audits/[id]
- /inventory/audits/new
- /inventory/counts
- /inventory/demand
- /inventory/expiry
- /inventory/food-cost
- /inventory/locations
- /inventory/procurement
- /inventory/purchase-orders
- /inventory/purchase-orders/[id]
- /inventory/purchase-orders/new
- /inventory/staff-meals
- /inventory/transactions
- /inventory/vendor-invoices
- /inventory/waste
- /menus
- /menus/[id]
- /menus/[id]/editor
- /menus/dishes
- /menus/new
- /menus/upload
- /recipes
- /recipes/[id]
- /recipes/[id]/edit
- /recipes/ingredients
- /recipes/new
- /recipes/production-log
- /recipes/sprint
- /vendors
- /vendors/[id]
- /vendors/invoices
- /vendors/price-comparison

Remy orchestrator tasks (7):

- chef.culinary_profile
- grocery.quick_add
- menu.list
- ops.cross_contamination
- ops.packing_list
- ops.portion_calc
- recipe.search

Remy agent actions (14):

- agent.add_component
- agent.add_dish
- agent.create_doc_folder
- agent.create_menu
- agent.duplicate_menu
- agent.link_menu_event
- agent.log_grocery_actual
- agent.run_grocery_quote
- agent.save_menu_template
- agent.search_documents
- agent.send_menu_approval
- agent.transition_menu
- agent.update_dish
- agent.update_menu

Remy restricted actions (0):

- (none)

## Commerce & POS

Chef policy/resource actions (0):

- (none listed in matrix for this flow)

Chef portal route actions (16):

- /commerce
- /commerce/orders
- /commerce/products
- /commerce/products/[id]
- /commerce/products/new
- /commerce/reconciliation
- /commerce/reconciliation/[id]
- /commerce/register
- /commerce/reports
- /commerce/reports/shifts
- /commerce/sales
- /commerce/sales/[id]
- /commerce/schedules
- /commerce/settlements
- /commerce/settlements/[id]
- /payments/splitting

Remy orchestrator tasks (0):

- (none)

Remy agent actions (0):

- (none)

Remy restricted actions (0):

- (none)

## Finance & Accounting

Chef policy/resource actions (3):

- Create ledger entry (adjustment)
- Export financial data (Excel/CSV)
- View ledger (own tenant)

Chef portal route actions (72):

- /expenses
- /expenses/[id]
- /expenses/new
- /finance
- /finance/bank-feed
- /finance/cash-flow
- /finance/contractors
- /finance/disputes
- /finance/expenses
- /finance/expenses/food-ingredients
- /finance/expenses/labor
- /finance/expenses/marketing
- /finance/expenses/miscellaneous
- /finance/expenses/rentals-equipment
- /finance/expenses/software
- /finance/expenses/travel
- /finance/forecast
- /finance/goals
- /finance/invoices
- /finance/invoices/cancelled
- /finance/invoices/draft
- /finance/invoices/overdue
- /finance/invoices/paid
- /finance/invoices/refunded
- /finance/invoices/sent
- /finance/ledger
- /finance/ledger/adjustments
- /finance/ledger/transaction-log
- /finance/overview
- /finance/overview/cash-flow
- /finance/overview/outstanding-payments
- /finance/overview/revenue-summary
- /finance/payments
- /finance/payments/deposits
- /finance/payments/failed
- /finance/payments/installments
- /finance/payments/refunds
- /finance/payouts
- /finance/payouts/manual-payments
- /finance/payouts/reconciliation
- /finance/payouts/stripe-payouts
- /finance/payroll
- /finance/payroll/941
- /finance/payroll/employees
- /finance/payroll/run
- /finance/payroll/w2
- /finance/planning/break-even
- /finance/recurring
- /finance/reporting
- /finance/reporting/expense-by-category
- /finance/reporting/profit-by-event
- /finance/reporting/profit-loss
- /finance/reporting/revenue-by-client
- /finance/reporting/revenue-by-event
- /finance/reporting/revenue-by-month
- /finance/reporting/tax-summary
- /finance/reporting/year-to-date-summary
- /finance/retainers
- /finance/retainers/[id]
- /finance/retainers/new
- /finance/sales-tax
- /finance/sales-tax/remittances
- /finance/sales-tax/settings
- /finance/tax
- /finance/tax/1099-nec
- /finance/tax/depreciation
- /finance/tax/home-office
- /finance/tax/quarterly
- /finance/tax/retirement
- /finance/tax/year-end
- /finance/year-end
- /financials

Remy orchestrator tasks (5):

- analytics.break_even
- analytics.client_ltv
- analytics.recipe_cost
- finance.monthly_snapshot
- finance.summary

Remy agent actions (2):

- agent.log_expense
- agent.update_expense

Remy restricted actions (2):

- agent.ledger_write
- agent.refund

## Team & Workforce

Chef policy/resource actions (0):

- (none listed in matrix for this flow)

Chef portal route actions (13):

- /onboarding
- /onboarding/clients
- /onboarding/loyalty
- /onboarding/recipes
- /onboarding/staff
- /staff
- /staff/[id]
- /staff/availability
- /staff/clock
- /staff/labor
- /staff/performance
- /staff/schedule
- /team

Remy orchestrator tasks (0):

- (none)

Remy agent actions (3):

- agent.assign_staff
- agent.create_staff
- agent.record_staff_hours

Remy restricted actions (0):

- (none)

## Communications & Inbox

Chef policy/resource actions (0):

- (none listed in matrix for this flow)

Chef portal route actions (9):

- /chat
- /chat/[id]
- /documents
- /inbox
- /inbox/history-scan
- /inbox/triage
- /inbox/triage/[threadId]
- /notifications
- /remy

Remy orchestrator tasks (5):

- document.create_folder
- document.list_folders
- document.search
- web.read
- web.search

Remy agent actions (0):

- (none)

Remy restricted actions (1):

- agent.send_email

## Platform & Settings

Chef policy/resource actions (2):

- Automation rules
- Contract templates

Chef portal route actions (68):

- /contracts/[id]/history
- /dev/simulate
- /games
- /games/galaga
- /games/menu-muse
- /games/snake
- /games/the-line
- /games/tic-tac-toe
- /games/trivia
- /import
- /settings
- /settings/ai-privacy
- /settings/api-keys
- /settings/appearance
- /settings/automations
- /settings/billing
- /settings/calendar-sync
- /settings/change-password
- /settings/client-preview
- /settings/compliance
- /settings/compliance/gdpr
- /settings/compliance/haccp
- /settings/contracts
- /settings/culinary-profile
- /settings/custom-fields
- /settings/dashboard
- /settings/delete-account
- /settings/devices
- /settings/embed
- /settings/emergency
- /settings/event-types
- /settings/favorite-chefs
- /settings/health
- /settings/highlights
- /settings/incidents
- /settings/integrations
- /settings/journal
- /settings/journal/[id]
- /settings/journey
- /settings/journey/[id]
- /settings/menu-templates
- /settings/modules
- /settings/my-profile
- /settings/navigation
- /settings/notifications
- /settings/payment-methods
- /settings/portfolio
- /settings/print
- /settings/professional
- /settings/professional/momentum
- /settings/professional/skills
- /settings/profile
- /settings/protection
- /settings/protection/business-health
- /settings/protection/certifications
- /settings/protection/continuity
- /settings/protection/crisis
- /settings/protection/insurance
- /settings/protection/nda
- /settings/protection/portfolio-removal
- /settings/public-profile
- /settings/repertoire
- /settings/repertoire/[id]
- /settings/stripe-connect
- /settings/templates
- /settings/webhooks
- /settings/yelp
- /settings/zapier

Remy orchestrator tasks (1):

- nav.go

Remy agent actions (0):

- (none)

Remy restricted actions (5):

- agent.add_ingredient
- agent.create_recipe
- agent.delete_data
- agent.modify_roles
- agent.update_recipe

## Executive Home & Misc

Chef policy/resource actions (1):

- Chef profile update

Chef portal route actions (34):

- /aar
- /activity
- /analytics
- /analytics/benchmarks
- /analytics/client-ltv
- /analytics/daily-report
- /analytics/demand
- /analytics/funnel
- /analytics/pipeline
- /analytics/referral-sources
- /analytics/reports
- /api/clients/export
- /api/events/export
- /api/finance/export
- /chef/cannabis/handbook
- /chef/cannabis/rsvps
- /commands
- /culinary-board
- /daily
- /dashboard
- /goals
- /goals/[id]/history
- /goals/revenue-path
- /goals/setup
- /help
- /help/[slug]
- /insights
- /insights/time-analysis
- /proposals
- /proposals/addons
- /proposals/templates
- /queue
- /receipts
- /reports

Remy orchestrator tasks (0):

- (none)

Remy agent actions (9):

- agent.add_emergency_contact
- agent.cancel_call
- agent.create_todo
- agent.daily_briefing
- agent.intake_brain_dump
- agent.intake_bulk_clients
- agent.intake_transcript
- agent.log_call_outcome
- agent.whats_next

Remy restricted actions (0):

- (none)

## Notes

- Route actions represent reachable pages/endpoints in `app/(chef)`; in-page button-level actions are more granular.
- Remy availability can be narrowed at runtime by action filters/focus mode and approval policy blocks.
- Restricted actions are intentionally non-executable by Remy even if discoverable in planning.
