# Chef Navbar Icon Inventory

Scope: chef navbar surfaces only.

- standaloneTop
- navGroups
- standaloneBottom
- communitySectionItems
- QUICK_CREATE_ITEMS

## standaloneTop

- label: Dashboard
  route: /dashboard
  icon: SquaresFourIcon
  icon_status: explicitly declared in code
- label: Inbox
  route: /inbox
  icon: TrayIcon
  icon_status: explicitly declared in code
- label: Events
  route: /events
  icon: CalendarDotsIcon
  icon_status: explicitly declared in code
- label: Clients
  route: /clients
  icon: UsersIcon
  icon_status: explicitly declared in code
- label: Dinner Circles
  route: /circles
  icon: ChatsIcon
  icon_status: explicitly declared in code
- label: Culinary
  route: /culinary
  icon: ChefHatIcon
  icon_status: explicitly declared in code
- label: Finance
  route: /financials
  icon: CurrencyDollarIcon
  icon_status: explicitly declared in code
- label: Operations
  route: /operations
  icon: PulseIcon
  icon_status: explicitly declared in code
- label: Growth
  route: /growth
  icon: TrendUpIcon
  icon_status: explicitly declared in code
- label: Admin
  route: /admin
  icon: ShieldWarningIcon
  icon_status: explicitly declared in code
- label: Pulse
  route: /admin/pulse
  icon: ShieldWarningIcon
  icon_status: explicitly declared in code
- label: All Inquiries
  route: /admin/inquiries
  icon: ShieldWarningIcon
  icon_status: explicitly declared in code

## navGroup: Analytics (analytics)

- label: Business Analytics
  route: /analytics/benchmarks
  icon: TrendUpIcon
  icon_status: explicitly declared in code
  - label: Client Value
    route: /analytics/client-ltv
    icon: none
    icon_status: no icon declared in code
  - label: Demand Heatmap
    route: /analytics/demand
    icon: none
    icon_status: no icon declared in code
  - label: Pipeline Forecast
    route: /analytics/pipeline
    icon: none
    icon_status: no icon declared in code
  - label: Referral Sources
    route: /analytics/referral-sources
    icon: none
    icon_status: no icon declared in code
- label: Conversion Funnel
  route: /analytics/funnel
  icon: FunnelIcon
  icon_status: explicitly declared in code
- label: Goals
  route: /goals
  icon: TargetIcon
  icon_status: explicitly declared in code
  - label: Goal Setup
    route: /goals/setup
    icon: none
    icon_status: no icon declared in code
  - label: Revenue Path
    route: /goals/revenue-path
    icon: none
    icon_status: no icon declared in code
- label: Insights
  route: /insights
  icon: ChartBarIcon
  icon_status: explicitly declared in code
  - label: Custom Reports
    route: /analytics/reports
    icon: none
    icon_status: no icon declared in code
  - label: Daily Report
    route: /analytics/daily-report
    icon: none
    icon_status: no icon declared in code
  - label: Source Analytics
    route: /analytics
    icon: none
    icon_status: no icon declared in code
  - label: Time Analysis
    route: /insights/time-analysis
    icon: none
    icon_status: no icon declared in code
- label: Intelligence Hub
  route: /intelligence
  icon: CompassIcon
  icon_status: explicitly declared in code
  - label: Full Dashboard
    route: /intelligence
    icon: none
    icon_status: no icon declared in code
- label: Reports
  route: /reports
  icon: FileTextIcon
  icon_status: explicitly declared in code
- label: Surveys
  route: /surveys
  icon: ClipboardTextIcon
  icon_status: explicitly declared in code

## navGroup: Clients (clients)

- label: Client Directory
  route: /clients
  icon: UsersIcon
  icon_status: explicitly declared in code
  - label: Active
    route: /clients/active
    icon: none
    icon_status: no icon declared in code
  - label: Add Client
    route: /clients/new
    icon: none
    icon_status: no icon declared in code
  - label: Duplicates
    route: /clients/duplicates
    icon: none
    icon_status: no icon declared in code
  - label: Gift Cards
    route: /clients/gift-cards
    icon: none
    icon_status: no icon declared in code
  - label: Inactive
    route: /clients/inactive
    icon: none
    icon_status: no icon declared in code
  - label: Segments
    route: /clients/segments
    icon: none
    icon_status: no icon declared in code
  - label: VIP
    route: /clients/vip
    icon: none
    icon_status: no icon declared in code
- label: Client History
  route: /clients/history
  icon: ClockIcon
  icon_status: explicitly declared in code
  - label: Event History
    route: /clients/history/event-history
    icon: none
    icon_status: no icon declared in code
  - label: Past Menus
    route: /clients/history/past-menus
    icon: none
    icon_status: no icon declared in code
  - label: Payment History
    route: /clients/history/spending-history
    icon: none
    icon_status: no icon declared in code
- label: Client Insights
  route: /clients/insights
  icon: ChartLineUpIcon
  icon_status: explicitly declared in code
  - label: At Risk
    route: /clients/insights/at-risk
    icon: none
    icon_status: no icon declared in code
  - label: Most Frequent
    route: /clients/insights/most-frequent
    icon: none
    icon_status: no icon declared in code
  - label: Top Clients
    route: /clients/insights/top-clients
    icon: none
    icon_status: no icon declared in code
- label: Client Intake
  route: /clients/intake
  icon: ClipboardTextIcon
  icon_status: explicitly declared in code
- label: Client Presence
  route: /clients/presence
  icon: WifiHighIcon
  icon_status: explicitly declared in code
- label: Communication
  route: /clients/communication
  icon: ChatDotsIcon
  icon_status: explicitly declared in code
  - label: Client Notes
    route: /clients/communication/notes
    icon: none
    icon_status: no icon declared in code
  - label: Follow-Ups
    route: /clients/communication/follow-ups
    icon: none
    icon_status: no icon declared in code
  - label: Upcoming Touchpoints
    route: /clients/communication/upcoming-touchpoints
    icon: none
    icon_status: no icon declared in code
- label: Guest Directory
  route: /guests
  icon: AddressBookIcon
  icon_status: explicitly declared in code
  - label: Guest Insights
    route: /guest-analytics
    icon: none
    icon_status: no icon declared in code
  - label: Guest Pipeline
    route: /guest-leads
    icon: none
    icon_status: no icon declared in code
  - label: Reservations
    route: /guests/reservations
    icon: none
    icon_status: no icon declared in code
- label: Loyalty & Rewards
  route: /loyalty
  icon: GiftIcon
  icon_status: explicitly declared in code
  - label: Create Reward
    route: /loyalty/rewards/new
    icon: none
    icon_status: no icon declared in code
  - label: Learn About Loyalty
    route: /loyalty/learn
    icon: none
    icon_status: no icon declared in code
  - label: Loyalty Overview
    route: /clients/loyalty
    icon: none
    icon_status: no icon declared in code
  - label: Points
    route: /clients/loyalty/points
    icon: none
    icon_status: no icon declared in code
  - label: Program Settings
    route: /loyalty/settings
    icon: none
    icon_status: no icon declared in code
  - label: Raffle
    route: /loyalty/raffle
    icon: none
    icon_status: no icon declared in code
  - label: Referrals
    route: /clients/loyalty/referrals
    icon: none
    icon_status: no icon declared in code
  - label: Rewards
    route: /clients/loyalty/rewards
    icon: none
    icon_status: no icon declared in code
- label: Partners & Referrals
  route: /partners
  icon: HandshakeIcon
  icon_status: explicitly declared in code
  - label: Active
    route: /partners/active
    icon: none
    icon_status: no icon declared in code
  - label: Add Partner
    route: /partners/new
    icon: none
    icon_status: no icon declared in code
  - label: Events Generated
    route: /partners/events-generated
    icon: none
    icon_status: no icon declared in code
  - label: Inactive
    route: /partners/inactive
    icon: none
    icon_status: no icon declared in code
  - label: Referral Performance
    route: /partners/referral-performance
    icon: none
    icon_status: no icon declared in code
- label: Preferences & Dietary
  route: /clients/preferences
  icon: SlidersHorizontalIcon
  icon_status: explicitly declared in code
  - label: Allergies
    route: /clients/preferences/allergies
    icon: none
    icon_status: no icon declared in code
  - label: Dietary Restrictions
    route: /clients/preferences/dietary-restrictions
    icon: none
    icon_status: no icon declared in code
  - label: Dislikes
    route: /clients/preferences/dislikes
    icon: none
    icon_status: no icon declared in code
  - label: Favorite Dishes
    route: /clients/preferences/favorite-dishes
    icon: none
    icon_status: no icon declared in code
- label: Recurring Clients
  route: /clients/recurring
  icon: ArrowClockwiseIcon
  icon_status: explicitly declared in code

## navGroup: Commerce (commerce)

- label: Clover Parity
  route: /commerce/parity
  icon: ChartBarIcon
  icon_status: explicitly declared in code
- label: Commerce Hub
  route: /commerce
  icon: StorefrontIcon
  icon_status: explicitly declared in code
- label: Observability
  route: /commerce/observability
  icon: WarningIcon
  icon_status: explicitly declared in code
- label: Order Queue
  route: /commerce/orders
  icon: ReceiptIcon
  icon_status: explicitly declared in code
- label: Payment Schedules
  route: /commerce/schedules
  icon: CalendarCheckIcon
  icon_status: explicitly declared in code
- label: POS Register
  route: /commerce/register
  icon: ShoppingCartIcon
  icon_status: explicitly declared in code
- label: Products
  route: /commerce/products
  icon: PackageIcon
  icon_status: explicitly declared in code
  - label: New Product
    route: /commerce/products/new
    icon: none
    icon_status: no icon declared in code
- label: Promotions
  route: /commerce/promotions
  icon: PercentIcon
  icon_status: explicitly declared in code
- label: Reconciliation
  route: /commerce/reconciliation
  icon: ScalesIcon
  icon_status: explicitly declared in code
- label: Reports
  route: /commerce/reports
  icon: ChartPieIcon
  icon_status: explicitly declared in code
  - label: Shift Reports
    route: /commerce/reports/shifts
    icon: none
    icon_status: no icon declared in code
- label: Sales History
  route: /commerce/sales
  icon: CurrencyDollarIcon
  icon_status: explicitly declared in code
- label: Settlements
  route: /commerce/settlements
  icon: BankIcon
  icon_status: explicitly declared in code
- label: Table Service
  route: /commerce/table-service
  icon: ForkKnifeIcon
  icon_status: explicitly declared in code
- label: Virtual Terminal
  route: /commerce/virtual-terminal
  icon: CreditCardIcon
  icon_status: explicitly declared in code

## navGroup: Culinary (culinary)

- label: Components
  route: /culinary/components
  icon: PackageIcon
  icon_status: explicitly declared in code
  - label: Ferments
    route: /culinary/components/ferments
    icon: none
    icon_status: no icon declared in code
  - label: Garnishes
    route: /culinary/components/garnishes
    icon: none
    icon_status: no icon declared in code
  - label: Sauces
    route: /culinary/components/sauces
    icon: none
    icon_status: no icon declared in code
  - label: Shared Elements
    route: /culinary/components/shared-elements
    icon: none
    icon_status: no icon declared in code
  - label: Stocks
    route: /culinary/components/stocks
    icon: none
    icon_status: no icon declared in code
- label: Costing
  route: /culinary/costing
  icon: CalculatorIcon
  icon_status: explicitly declared in code
  - label: Food Cost Analysis
    route: /culinary/costing/food-cost
    icon: none
    icon_status: no icon declared in code
  - label: Menu Costs
    route: /culinary/costing/menu
    icon: none
    icon_status: no icon declared in code
  - label: On Sale This Week
    route: /culinary/costing/sales
    icon: none
    icon_status: no icon declared in code
  - label: Recipe Costs
    route: /culinary/costing/recipe
    icon: none
    icon_status: no icon declared in code
- label: Culinary Board
  route: /culinary-board
  icon: ChalkboardIcon
  icon_status: explicitly declared in code
- label: Culinary Hub
  route: /culinary
  icon: ChefHatIcon
  icon_status: explicitly declared in code
- label: Food Catalog
  route: /culinary/price-catalog
  icon: StorefrontIcon
  icon_status: explicitly declared in code
- label: Ingredients
  route: /recipes/ingredients
  icon: PackageIcon
  icon_status: explicitly declared in code
  - label: Ingredients Database
    route: /culinary/ingredients
    icon: none
    icon_status: no icon declared in code
  - label: Receipt Scanner
    route: /culinary/ingredients/receipt-scan
    icon: none
    icon_status: no icon declared in code
  - label: Seasonal Availability
    route: /culinary/ingredients/seasonal-availability
    icon: none
    icon_status: no icon declared in code
  - label: Vendor Notes
    route: /culinary/ingredients/vendor-notes
    icon: none
    icon_status: no icon declared in code
- label: Menu Engine Settings
  route: /settings/menu-engine
  icon: SlidersHorizontalIcon
  icon_status: explicitly declared in code
- label: Menus
  route: /menus
  icon: ForkKnifeIcon
  icon_status: explicitly declared in code
  - label: All Menus
    route: /culinary/menus
    icon: none
    icon_status: no icon declared in code
  - label: Approved
    route: /culinary/menus/approved
    icon: none
    icon_status: no icon declared in code
  - label: Dish Index
    route: /culinary/dish-index
    icon: none
    icon_status: no icon declared in code
  - label: Dish Insights
    route: /culinary/dish-index/insights
    icon: none
    icon_status: no icon declared in code
  - label: Dishes
    route: /menus/dishes
    icon: none
    icon_status: no icon declared in code
  - label: Drafts
    route: /culinary/menus/drafts
    icon: none
    icon_status: no icon declared in code
  - label: Estimate
    route: /menus/estimate
    icon: CalculatorIcon
    icon_status: explicitly declared in code
  - label: Menu Engineering
    route: /culinary/menus/engineering
    icon: none
    icon_status: no icon declared in code
  - label: Menu Upload
    route: /menus/upload
    icon: UploadIcon
    icon_status: explicitly declared in code
  - label: New Menu
    route: /menus/new
    icon: none
    icon_status: no icon declared in code
  - label: Scaling
    route: /culinary/menus/scaling
    icon: none
    icon_status: no icon declared in code
  - label: Substitutions
    route: /culinary/menus/substitutions
    icon: none
    icon_status: no icon declared in code
  - label: Tasting Menus
    route: /menus/tasting
    icon: none
    icon_status: no icon declared in code
  - label: Templates
    route: /culinary/menus/templates
    icon: none
    icon_status: no icon declared in code
- label: My Kitchen
  route: /culinary/my-kitchen
  icon: FireIcon
  icon_status: explicitly declared in code
- label: Prep Workspace
  route: /culinary/prep
  icon: TimerIcon
  icon_status: explicitly declared in code
  - label: Prep Timeline
    route: /culinary/prep/timeline
    icon: none
    icon_status: no icon declared in code
  - label: Shopping Lists
    route: /culinary/prep/shopping
    icon: none
    icon_status: no icon declared in code
- label: Recipe Import Hub
  route: /recipes/import
  icon: UploadIcon
  icon_status: explicitly declared in code
- label: Recipe Sprint
  route: /recipes/sprint
  icon: LightningIcon
  icon_status: explicitly declared in code
- label: Recipes
  route: /recipes
  icon: BookOpenIcon
  icon_status: explicitly declared in code
  - label: Brain Dump
    route: /recipes/dump
    icon: none
    icon_status: no icon declared in code
  - label: By Dietary Flags
    route: /culinary/recipes/dietary-flags
    icon: none
    icon_status: no icon declared in code
  - label: Drafts
    route: /culinary/recipes/drafts
    icon: none
    icon_status: no icon declared in code
  - label: New Recipe
    route: /recipes/new
    icon: none
    icon_status: no icon declared in code
  - label: Production Log
    route: /recipes/production-log
    icon: none
    icon_status: no icon declared in code
  - label: Recipe Library
    route: /culinary/recipes
    icon: none
    icon_status: no icon declared in code
  - label: Seasonal Notes
    route: /culinary/recipes/seasonal-notes
    icon: none
    icon_status: no icon declared in code
  - label: Step Photos
    route: /recipes/photos
    icon: none
    icon_status: no icon declared in code
  - label: Tags
    route: /culinary/recipes/tags
    icon: none
    icon_status: no icon declared in code
- label: Seasonal Palettes
  route: /settings/repertoire
  icon: FlowerIcon
  icon_status: explicitly declared in code
- label: Substitutions
  route: /culinary/substitutions
  icon: ArrowClockwiseIcon
  icon_status: explicitly declared in code
- label: Vendor Directory
  route: /culinary/vendors
  icon: TruckIcon
  icon_status: explicitly declared in code

## navGroup: Events (events)

- label: Calendar
  route: /calendar
  icon: CalendarDotsIcon
  icon_status: explicitly declared in code
  - label: Day View
    route: /calendar/day
    icon: none
    icon_status: no icon declared in code
  - label: Share Calendar
    route: /calendar/share
    icon: none
    icon_status: no icon declared in code
  - label: Waitlist
    route: /waitlist
    icon: none
    icon_status: no icon declared in code
  - label: Week Planner
    route: /calendar/week
    icon: none
    icon_status: no icon declared in code
  - label: Year View
    route: /calendar/year
    icon: none
    icon_status: no icon declared in code
- label: Client Feedback
  route: /feedback
  icon: StarIcon
  icon_status: explicitly declared in code
  - label: Feedback Dashboard
    route: /feedback/dashboard
    icon: none
    icon_status: no icon declared in code
  - label: Send Requests
    route: /feedback/requests
    icon: none
    icon_status: no icon declared in code
- label: Event Calendar
  route: /production
  icon: CalendarDotsIcon
  icon_status: explicitly declared in code
- label: Event Reviews
  route: /aar
  icon: ExamIcon
  icon_status: explicitly declared in code
  - label: Reviews
    route: /reviews
    icon: none
    icon_status: no icon declared in code
  - label: Smart Import
    route: /import
    icon: none
    icon_status: no icon declared in code
- label: Event Status
  route: /events/upcoming
  icon: CalendarDotsIcon
  icon_status: explicitly declared in code
  - label: Awaiting Deposit
    route: /events/awaiting-deposit
    icon: none
    icon_status: no icon declared in code
  - label: Cancelled
    route: /events/cancelled
    icon: none
    icon_status: no icon declared in code
  - label: Completed
    route: /events/completed
    icon: none
    icon_status: no icon declared in code
  - label: Confirmed
    route: /events/confirmed
    icon: none
    icon_status: no icon declared in code
  - label: Create Event
    route: /events/new
    icon: none
    icon_status: no icon declared in code
  - label: Create from Text
    route: /events/new/from-text
    icon: none
    icon_status: no icon declared in code
  - label: Event Wizard
    route: /events/new/wizard
    icon: none
    icon_status: no icon declared in code
  - label: Kanban Board
    route: /events/board
    icon: none
    icon_status: no icon declared in code

## navGroup: Finance (finance)

- label: 1099 Contractors
  route: /finance/contractors
  icon: IdentificationBadgeIcon
  icon_status: explicitly declared in code
- label: Break-Even Analysis
  route: /finance/planning/break-even
  icon: TargetIcon
  icon_status: explicitly declared in code
- label: Expenses
  route: /expenses
  icon: CoinsIcon
  icon_status: explicitly declared in code
  - label: Add Expense
    route: /expenses/new
    icon: none
    icon_status: no icon declared in code
  - label: By Category
    route: /finance/expenses
    icon: none
    icon_status: no icon declared in code
  - label: Food & Ingredients
    route: /finance/expenses/food-ingredients
    icon: none
    icon_status: no icon declared in code
  - label: Labor
    route: /finance/expenses/labor
    icon: none
    icon_status: no icon declared in code
  - label: Marketing
    route: /finance/expenses/marketing
    icon: none
    icon_status: no icon declared in code
  - label: Miscellaneous
    route: /finance/expenses/miscellaneous
    icon: none
    icon_status: no icon declared in code
  - label: Plate Costs
    route: /finance/plate-costs
    icon: none
    icon_status: no icon declared in code
  - label: Receipt Library
    route: /receipts
    icon: none
    icon_status: no icon declared in code
  - label: Rentals & Equipment
    route: /finance/expenses/rentals-equipment
    icon: none
    icon_status: no icon declared in code
  - label: Software
    route: /finance/expenses/software
    icon: none
    icon_status: no icon declared in code
  - label: Travel
    route: /finance/expenses/travel
    icon: none
    icon_status: no icon declared in code
- label: Financial Goals
  route: /finance/goals
  icon: TargetIcon
  icon_status: explicitly declared in code
- label: Financial Hub
  route: /financials
  icon: CurrencyDollarIcon
  icon_status: explicitly declared in code
  - label: Cash Flow
    route: /finance/overview/cash-flow
    icon: none
    icon_status: no icon declared in code
  - label: Finance Home
    route: /finance
    icon: none
    icon_status: no icon declared in code
  - label: Outstanding Payments
    route: /finance/overview/outstanding-payments
    icon: none
    icon_status: no icon declared in code
  - label: Overview
    route: /finance/overview
    icon: none
    icon_status: no icon declared in code
  - label: Revenue Summary
    route: /finance/overview/revenue-summary
    icon: none
    icon_status: no icon declared in code
- label: Forecasting
  route: /finance/forecast
  icon: TrendUpIcon
  icon_status: explicitly declared in code
  - label: Cash Flow Forecast
    route: /finance/cash-flow
    icon: none
    icon_status: no icon declared in code
- label: Invoices
  route: /finance/invoices
  icon: InvoiceIcon
  icon_status: explicitly declared in code
  - label: Cancelled
    route: /finance/invoices/cancelled
    icon: none
    icon_status: no icon declared in code
  - label: Draft
    route: /finance/invoices/draft
    icon: none
    icon_status: no icon declared in code
  - label: Overdue
    route: /finance/invoices/overdue
    icon: none
    icon_status: no icon declared in code
  - label: Paid
    route: /finance/invoices/paid
    icon: none
    icon_status: no icon declared in code
  - label: Recurring Invoices
    route: /finance/recurring
    icon: none
    icon_status: no icon declared in code
  - label: Refunded
    route: /finance/invoices/refunded
    icon: none
    icon_status: no icon declared in code
  - label: Sent
    route: /finance/invoices/sent
    icon: none
    icon_status: no icon declared in code
- label: Ledger
  route: /finance/ledger
  icon: NotebookIcon
  icon_status: explicitly declared in code
  - label: Adjustments
    route: /finance/ledger/adjustments
    icon: none
    icon_status: no icon declared in code
  - label: Transaction Log
    route: /finance/ledger/transaction-log
    icon: none
    icon_status: no icon declared in code
- label: Payment Splitting
  route: /payments/splitting
  icon: CurrencyCircleDollarIcon
  icon_status: explicitly declared in code
- label: Payments
  route: /finance/payments
  icon: CurrencyCircleDollarIcon
  icon_status: explicitly declared in code
  - label: Deposits
    route: /finance/payments/deposits
    icon: none
    icon_status: no icon declared in code
  - label: Disputes
    route: /finance/disputes
    icon: none
    icon_status: no icon declared in code
  - label: Failed Payments
    route: /finance/payments/failed
    icon: none
    icon_status: no icon declared in code
  - label: Installments
    route: /finance/payments/installments
    icon: none
    icon_status: no icon declared in code
  - label: New Retainer
    route: /finance/retainers/new
    icon: none
    icon_status: no icon declared in code
  - label: Refunds
    route: /finance/payments/refunds
    icon: none
    icon_status: no icon declared in code
  - label: Retainers
    route: /finance/retainers
    icon: none
    icon_status: no icon declared in code
- label: Payouts
  route: /finance/payouts
  icon: BankIcon
  icon_status: explicitly declared in code
  - label: Bank Feed
    route: /finance/bank-feed
    icon: none
    icon_status: no icon declared in code
  - label: Manual Payments
    route: /finance/payouts/manual-payments
    icon: none
    icon_status: no icon declared in code
  - label: Reconciliation
    route: /finance/payouts/reconciliation
    icon: none
    icon_status: no icon declared in code
  - label: Stripe Payouts
    route: /finance/payouts/stripe-payouts
    icon: none
    icon_status: no icon declared in code
- label: Payroll
  route: /finance/payroll
  icon: WalletIcon
  icon_status: explicitly declared in code
  - label: 941 Filing
    route: /finance/payroll/941
    icon: none
    icon_status: no icon declared in code
  - label: Employees
    route: /finance/payroll/employees
    icon: none
    icon_status: no icon declared in code
  - label: Run Payroll
    route: /finance/payroll/run
    icon: none
    icon_status: no icon declared in code
  - label: W-2 Forms
    route: /finance/payroll/w2
    icon: none
    icon_status: no icon declared in code
- label: Reports
  route: /finance/reporting
  icon: ChartBarIcon
  icon_status: explicitly declared in code
  - label: Expense by Category
    route: /finance/reporting/expense-by-category
    icon: none
    icon_status: no icon declared in code
  - label: Profit & Loss
    route: /finance/reporting/profit-loss
    icon: none
    icon_status: no icon declared in code
  - label: Profit by Event
    route: /finance/reporting/profit-by-event
    icon: none
    icon_status: no icon declared in code
  - label: Revenue by Client
    route: /finance/reporting/revenue-by-client
    icon: none
    icon_status: no icon declared in code
  - label: Revenue by Event
    route: /finance/reporting/revenue-by-event
    icon: none
    icon_status: no icon declared in code
  - label: Revenue by Month
    route: /finance/reporting/revenue-by-month
    icon: none
    icon_status: no icon declared in code
  - label: Year-to-Date Summary
    route: /finance/reporting/year-to-date-summary
    icon: none
    icon_status: no icon declared in code
- label: Sales Tax
  route: /finance/sales-tax
  icon: ReceiptIcon
  icon_status: explicitly declared in code
  - label: Remittances
    route: /finance/sales-tax/remittances
    icon: none
    icon_status: no icon declared in code
  - label: Tax Settings
    route: /finance/sales-tax/settings
    icon: none
    icon_status: no icon declared in code
- label: Tax Center
  route: /finance/tax
  icon: ChartPieIcon
  icon_status: explicitly declared in code
  - label: 1099-NEC
    route: /finance/tax/1099-nec
    icon: none
    icon_status: no icon declared in code
  - label: Depreciation
    route: /finance/tax/depreciation
    icon: none
    icon_status: no icon declared in code
  - label: Home Office
    route: /finance/tax/home-office
    icon: none
    icon_status: no icon declared in code
  - label: Quarterly Estimates
    route: /finance/tax/quarterly
    icon: none
    icon_status: no icon declared in code
  - label: Retirement
    route: /finance/tax/retirement
    icon: none
    icon_status: no icon declared in code
  - label: Tax Summary
    route: /finance/reporting/tax-summary
    icon: none
    icon_status: no icon declared in code
  - label: Year-End Package
    route: /finance/tax/year-end
    icon: none
    icon_status: no icon declared in code
- label: Year-End Close
  route: /finance/year-end
  icon: CalendarCheckIcon
  icon_status: explicitly declared in code

## navGroup: Marketing (marketing)

- label: Brand Mentions
  route: /reputation/mentions
  icon: ShieldWarningIcon
  icon_status: explicitly declared in code
- label: Campaign Content
  route: /marketing/content-pipeline
  icon: PenNibIcon
  icon_status: explicitly declared in code
- label: Content Pipeline
  route: /content
  icon: KanbanIcon
  icon_status: explicitly declared in code
- label: Content Planner
  route: /social/planner
  icon: PenNibIcon
  icon_status: explicitly declared in code
  - label: Content Calendar
    route: /social/calendar
    icon: none
    icon_status: no icon declared in code
  - label: Media Vault
    route: /social/vault
    icon: none
    icon_status: no icon declared in code
  - label: Platform Connections
    route: /social/connections
    icon: none
    icon_status: no icon declared in code
  - label: Post from Event
    route: /social/compose
    icon: none
    icon_status: no icon declared in code
  - label: Queue Settings
    route: /social/settings
    icon: none
    icon_status: no icon declared in code
  - label: Social Templates
    route: /social/templates
    icon: none
    icon_status: no icon declared in code
- label: Email Campaigns
  route: /marketing
  icon: EnvelopeIcon
  icon_status: explicitly declared in code
  - label: New Push Dinner
    route: /marketing/push-dinners/new
    icon: none
    icon_status: no icon declared in code
  - label: Push Dinners
    route: /marketing/push-dinners
    icon: none
    icon_status: no icon declared in code
  - label: Sequences
    route: /marketing/sequences
    icon: none
    icon_status: no icon declared in code
  - label: Templates
    route: /marketing/templates
    icon: none
    icon_status: no icon declared in code
- label: Event Portfolio
  route: /portfolio
  icon: ImageIcon
  icon_status: explicitly declared in code
- label: Reviews
  route: /reviews
  icon: StarIcon
  icon_status: explicitly declared in code
- label: Social Media
  route: /social
  icon: ChatsIcon
  icon_status: explicitly declared in code
  - label: Dinner Circle Overview
    route: /social/hub-overview
    icon: none
    icon_status: no icon declared in code
  - label: Post Planner
    route: /social/planner
    icon: none
    icon_status: no icon declared in code

## navGroup: Network (network)

- label: Chef Network
  route: /network
  icon: UsersIcon
  icon_status: explicitly declared in code
  - label: Collaborations
    route: /network/collabs
    icon: none
    icon_status: no icon declared in code
  - label: Notifications
    route: /network/notifications
    icon: none
    icon_status: no icon declared in code
  - label: Saved Chefs
    route: /network/saved
    icon: none
    icon_status: no icon declared in code
- label: Community Impact
  route: /charity
  icon: HandHeartIcon
  icon_status: explicitly declared in code
  - label: Volunteer Hours
    route: /charity/hours
    icon: none
    icon_status: no icon declared in code
- label: Community Templates
  route: /community/templates
  icon: FileTextIcon
  icon_status: explicitly declared in code
- label: Wix Submissions
  route: /wix-submissions
  icon: TrayIcon
  icon_status: explicitly declared in code

## navGroup: Operations (operations)

- label: Daily Ops
  route: /stations/daily-ops
  icon: PulseIcon
  icon_status: explicitly declared in code
- label: Daily View
  route: /daily
  icon: ListChecksIcon
  icon_status: explicitly declared in code
- label: Documents
  route: /documents
  icon: FileTextIcon
  icon_status: explicitly declared in code
- label: Equipment
  route: /operations/equipment
  icon: WrenchIcon
  icon_status: explicitly declared in code
  - label: Maintenance Schedule
    route: /operations/equipment?tab=maintenance
    icon: none
    icon_status: no icon declared in code
- label: Kitchen Mode
  route: /kitchen
  icon: FireIcon
  icon_status: explicitly declared in code
- label: Kitchen Rentals
  route: /operations/kitchen-rentals
  icon: WarehouseIcon
  icon_status: explicitly declared in code
- label: Meal Prep
  route: /meal-prep
  icon: ArrowClockwiseIcon
  icon_status: explicitly declared in code
  - label: Dashboard
    route: /meal-prep
    icon: none
    icon_status: no icon declared in code
- label: Priority Queue
  route: /queue
  icon: LightningIcon
  icon_status: explicitly declared in code
- label: Scheduling
  route: /scheduling
  icon: CalendarCheckIcon
  icon_status: explicitly declared in code
- label: Staff
  route: /staff
  icon: IdentificationBadgeIcon
  icon_status: explicitly declared in code
  - label: Availability
    route: /staff/availability
    icon: none
    icon_status: no icon declared in code
  - label: Clock In/Out
    route: /staff/clock
    icon: none
    icon_status: no icon declared in code
  - label: Labor Dashboard
    route: /staff/labor
    icon: none
    icon_status: no icon declared in code
  - label: Live Activity
    route: /staff/live
    icon: none
    icon_status: no icon declared in code
  - label: Performance
    route: /staff/performance
    icon: none
    icon_status: no icon declared in code
  - label: Permissions
    route: /staff/permissions
    icon: none
    icon_status: no icon declared in code
  - label: Schedule
    route: /staff/schedule
    icon: none
    icon_status: no icon declared in code
- label: Station Clipboards
  route: /stations
  icon: NotepadIcon
  icon_status: explicitly declared in code
  - label: Ops Log
    route: /stations/ops-log
    icon: none
    icon_status: no icon declared in code
  - label: Order Sheet
    route: /stations/orders
    icon: none
    icon_status: no icon declared in code
  - label: Waste Log
    route: /stations/waste
    icon: none
    icon_status: no icon declared in code
- label: Tasks
  route: /tasks
  icon: ListChecksIcon
  icon_status: explicitly declared in code
  - label: Gantt Chart
    route: /tasks/gantt
    icon: none
    icon_status: no icon declared in code
  - label: Task Templates
    route: /tasks/templates
    icon: none
    icon_status: no icon declared in code
  - label: VA Tasks
    route: /tasks/va
    icon: none
    icon_status: no icon declared in code
- label: Team Management
  route: /team
  icon: UsersIcon
  icon_status: explicitly declared in code
- label: Travel Planning
  route: /travel
  icon: MapPinIcon
  icon_status: explicitly declared in code

## navGroup: Pipeline (pipeline)

- label: Calls & Meetings
  route: /calls
  icon: PhoneIcon
  icon_status: explicitly declared in code
  - label: Completed
    route: /calls?status=completed
    icon: none
    icon_status: no icon declared in code
  - label: Schedule Call
    route: /calls/new
    icon: none
    icon_status: no icon declared in code
  - label: Upcoming
    route: /calls?status=scheduled
    icon: none
    icon_status: no icon declared in code
- label: Consulting Hub
  route: /consulting
  icon: CompassIcon
  icon_status: explicitly declared in code
- label: Contracts
  route: /contracts
  icon: ScrollIcon
  icon_status: explicitly declared in code
  - label: Templates
    route: /settings/contracts
    icon: none
    icon_status: no icon declared in code
- label: Inquiries
  route: /inquiries
  icon: ChatTeardropTextIcon
  icon_status: explicitly declared in code
  - label: Awaiting Response
    route: /inquiries/awaiting-response
    icon: none
    icon_status: no icon declared in code
  - label: Client Reply
    route: /inquiries/awaiting-client-reply
    icon: none
    icon_status: no icon declared in code
  - label: Declined
    route: /inquiries/declined
    icon: none
    icon_status: no icon declared in code
  - label: Menu Drafting
    route: /inquiries/menu-drafting
    icon: none
    icon_status: no icon declared in code
  - label: New Inquiry
    route: /inquiries/new
    icon: none
    icon_status: no icon declared in code
  - label: Sent to Client
    route: /inquiries/sent-to-client
    icon: none
    icon_status: no icon declared in code
- label: Leads
  route: /leads
  icon: TargetIcon
  icon_status: explicitly declared in code
  - label: Archived
    route: /leads/archived
    icon: none
    icon_status: no icon declared in code
  - label: Contacted
    route: /leads/contacted
    icon: none
    icon_status: no icon declared in code
  - label: Converted
    route: /leads/converted
    icon: none
    icon_status: no icon declared in code
  - label: New
    route: /leads/new
    icon: none
    icon_status: no icon declared in code
  - label: Qualified
    route: /leads/qualified
    icon: none
    icon_status: no icon declared in code
- label: Marketplace
  route: /marketplace
  icon: StorefrontIcon
  icon_status: explicitly declared in code
  - label: Availability Broadcaster
    route: /availability
    icon: none
    icon_status: no icon declared in code
  - label: Capture Live Page
    route: /marketplace/capture
    icon: none
    icon_status: no icon declared in code
  - label: Command Center
    route: /marketplace
    icon: none
    icon_status: no icon declared in code
- label: Proposals
  route: /proposals
  icon: PresentationIcon
  icon_status: explicitly declared in code
  - label: Add-Ons
    route: /proposals/addons
    icon: none
    icon_status: no icon declared in code
  - label: Proposal Builder
    route: /proposals/builder
    icon: none
    icon_status: no icon declared in code
  - label: Templates
    route: /proposals/templates
    icon: none
    icon_status: no icon declared in code
- label: Prospecting
  route: /prospecting
  icon: CrosshairIcon
  icon_status: explicitly declared in code
  - label: AI Scrub
    route: /prospecting/scrub
    icon: none
    icon_status: no icon declared in code
  - label: Call Queue
    route: /prospecting/queue
    icon: none
    icon_status: no icon declared in code
  - label: Call Scripts
    route: /prospecting/scripts
    icon: none
    icon_status: no icon declared in code
  - label: Clusters
    route: /prospecting/clusters
    icon: none
    icon_status: no icon declared in code
  - label: Import Leads
    route: /prospecting/import
    icon: none
    icon_status: no icon declared in code
  - label: Pipeline
    route: /prospecting/pipeline
    icon: none
    icon_status: no icon declared in code
- label: Quotes
  route: /quotes
  icon: InvoiceIcon
  icon_status: explicitly declared in code
  - label: Accepted
    route: /quotes/accepted
    icon: none
    icon_status: no icon declared in code
  - label: Draft
    route: /quotes/draft
    icon: none
    icon_status: no icon declared in code
  - label: Expired
    route: /quotes/expired
    icon: none
    icon_status: no icon declared in code
  - label: New Quote
    route: /quotes/new
    icon: none
    icon_status: no icon declared in code
  - label: Rejected
    route: /quotes/rejected
    icon: none
    icon_status: no icon declared in code
  - label: Sent
    route: /quotes/sent
    icon: none
    icon_status: no icon declared in code
  - label: Viewed
    route: /quotes/viewed
    icon: none
    icon_status: no icon declared in code
- label: Rate Card
  route: /rate-card
  icon: CoinsIcon
  icon_status: explicitly declared in code
- label: Testimonials
  route: /testimonials
  icon: StarIcon
  icon_status: explicitly declared in code
- label: Wix Forms
  route: /wix-submissions
  icon: TrayIcon
  icon_status: explicitly declared in code

## navGroup: Protection (protection)

- label: Backup Coverage
  route: /safety/backup-chef
  icon: IdentificationBadgeIcon
  icon_status: explicitly declared in code
- label: Business Health
  route: /settings/protection
  icon: ShieldCheckIcon
  icon_status: explicitly declared in code
  - label: Business Continuity
    route: /settings/protection/continuity
    icon: none
    icon_status: no icon declared in code
  - label: Business Health
    route: /settings/protection/business-health
    icon: none
    icon_status: no icon declared in code
  - label: Certifications
    route: /settings/protection/certifications
    icon: none
    icon_status: no icon declared in code
  - label: Crisis Response
    route: /settings/protection/crisis
    icon: none
    icon_status: no icon declared in code
  - label: Insurance
    route: /settings/protection/insurance
    icon: none
    icon_status: no icon declared in code
  - label: NDA & Permissions
    route: /settings/protection/nda
    icon: none
    icon_status: no icon declared in code
  - label: Portfolio Removal
    route: /settings/protection/portfolio-removal
    icon: none
    icon_status: no icon declared in code
- label: Incidents
  route: /safety/incidents
  icon: WarningIcon
  icon_status: explicitly declared in code
  - label: Report Incident
    route: /safety/incidents/new
    icon: none
    icon_status: no icon declared in code
- label: Insurance Claims
  route: /safety/claims
  icon: ShieldWarningIcon
  icon_status: explicitly declared in code
  - label: Claim Documents
    route: /safety/claims/documents
    icon: none
    icon_status: no icon declared in code
  - label: New Claim
    route: /safety/claims/new
    icon: none
    icon_status: no icon declared in code

## navGroup: Supply Chain (supply-chain)

- label: Demand Forecast
  route: /inventory/demand
  icon: TrendUpIcon
  icon_status: explicitly declared in code
- label: Expiry Alerts
  route: /inventory/expiry
  icon: ClockIcon
  icon_status: explicitly declared in code
- label: Food Cost
  route: /food-cost
  icon: CalculatorIcon
  icon_status: explicitly declared in code
  - label: Daily Revenue
    route: /food-cost/revenue
    icon: none
    icon_status: no icon declared in code
- label: Food Cost Analysis
  route: /inventory/food-cost
  icon: CalculatorIcon
  icon_status: explicitly declared in code
- label: Inventory Counts
  route: /inventory/counts
  icon: ListChecksIcon
  icon_status: explicitly declared in code
- label: Inventory Hub
  route: /inventory
  icon: WarehouseIcon
  icon_status: explicitly declared in code
- label: Physical Audits
  route: /inventory/audits
  icon: MagnifyingGlassPlusIcon
  icon_status: explicitly declared in code
  - label: New Audit
    route: /inventory/audits/new
    icon: none
    icon_status: no icon declared in code
- label: Procurement Hub
  route: /inventory/procurement
  icon: HandArrowDownIcon
  icon_status: explicitly declared in code
- label: Purchase Orders
  route: /inventory/purchase-orders
  icon: TruckIcon
  icon_status: explicitly declared in code
  - label: New PO
    route: /inventory/purchase-orders/new
    icon: none
    icon_status: no icon declared in code
- label: Purveyors
  route: /vendors
  icon: TruckIcon
  icon_status: explicitly declared in code
  - label: Invoices
    route: /vendors/invoices
    icon: none
    icon_status: no icon declared in code
  - label: Price Comparison
    route: /vendors/price-comparison
    icon: none
    icon_status: no icon declared in code
- label: Staff Meals
  route: /inventory/staff-meals
  icon: ForkKnifeIcon
  icon_status: explicitly declared in code
- label: Storage Locations
  route: /inventory/locations
  icon: MapPinIcon
  icon_status: explicitly declared in code
- label: Transaction Ledger
  route: /inventory/transactions
  icon: ReceiptIcon
  icon_status: explicitly declared in code
- label: Vendor Invoices
  route: /inventory/vendor-invoices
  icon: InvoiceIcon
  icon_status: explicitly declared in code
- label: Waste Tracking
  route: /inventory/waste
  icon: WarningIcon
  icon_status: explicitly declared in code

## navGroup: Tools (tools)

- label: Activity Log
  route: /activity
  icon: PulseIcon
  icon_status: explicitly declared in code
- label: Data Import
  route: /import
  icon: UploadIcon
  icon_status: explicitly declared in code
  - label: CSV Import
    route: /import/csv
    icon: none
    icon_status: no icon declared in code
  - label: Import History
    route: /import/history
    icon: none
    icon_status: no icon declared in code
  - label: MasterCook Import
    route: /import/mxp
    icon: none
    icon_status: no icon declared in code
- label: Help Center
  route: /help
  icon: CompassIcon
  icon_status: explicitly declared in code
  - label: Food Costing Guide
    route: /help/food-costing
    icon: none
    icon_status: no icon declared in code
- label: Inbox Tools
  route: /inbox/history-scan
  icon: ChatCircleIcon
  icon_status: explicitly declared in code
  - label: Sort Messages
    route: /inbox/triage
    icon: none
    icon_status: no icon declared in code
- label: Integrations
  route: /settings/integrations
  icon: GearIcon
  icon_status: explicitly declared in code
  - label: API Keys
    route: /settings/api-keys
    icon: none
    icon_status: no icon declared in code
  - label: Automations
    route: /settings/automations
    icon: none
    icon_status: no icon declared in code
  - label: Calendar Sync
    route: /settings/calendar-sync
    icon: none
    icon_status: no icon declared in code
  - label: Custom Fields
    route: /settings/custom-fields
    icon: none
    icon_status: no icon declared in code
  - label: Embed Widget
    route: /settings/embed
    icon: none
    icon_status: no icon declared in code
  - label: Platform Connections
    route: /settings/platform-connections
    icon: none
    icon_status: no icon declared in code
  - label: Stripe Connect
    route: /settings/stripe-connect
    icon: none
    icon_status: no icon declared in code
  - label: Webhooks
    route: /settings/webhooks
    icon: none
    icon_status: no icon declared in code
  - label: Yelp
    route: /settings/yelp
    icon: none
    icon_status: no icon declared in code
  - label: Zapier
    route: /settings/zapier
    icon: none
    icon_status: no icon declared in code
- label: Messaging
  route: /chat
  icon: ChatCircleIcon
  icon_status: explicitly declared in code
- label: Morning Briefing
  route: /briefing
  icon: CompassIcon
  icon_status: explicitly declared in code
- label: Notifications
  route: /notifications
  icon: BellRingingIcon
  icon_status: explicitly declared in code
- label: Quick Commands
  route: /commands
  icon: LightningIcon
  icon_status: explicitly declared in code
- label: Remy History
  route: /remy
  icon: RobotIcon
  icon_status: explicitly declared in code

## navGroup: Admin (admin)

- label: All Events
  route: /admin/events
  icon: CalendarDotsIcon
  icon_status: explicitly declared in code
- label: Analytics
  route: /admin/analytics
  icon: ChartBarIcon
  icon_status: explicitly declared in code
- label: Audit Log
  route: /admin/audit
  icon: NotebookIcon
  icon_status: explicitly declared in code
- label: Cannabis Tier
  route: /admin/cannabis
  icon: SealCheckIcon
  icon_status: explicitly declared in code
- label: Chefs
  route: /admin/users
  icon: UsersIcon
  icon_status: explicitly declared in code
- label: Clients
  route: /admin/clients
  icon: AddressBookIcon
  icon_status: explicitly declared in code
- label: Command Center
  route: /admin/command-center
  icon: BroadcastIcon
  icon_status: explicitly declared in code
- label: Communications
  route: /admin/communications
  icon: EnvelopeIcon
  icon_status: explicitly declared in code
- label: Conversations
  route: /admin/conversations
  icon: ChatDotsIcon
  icon_status: explicitly declared in code
- label: Data Engine Health
  route: /admin/openclaw/health
  icon: PulseIcon
  icon_status: explicitly declared in code
- label: Dinner Circle Groups
  route: /admin/hub
  icon: UsersIcon
  icon_status: explicitly declared in code
- label: Directory
  route: /admin/directory
  icon: TreeStructureIcon
  icon_status: explicitly declared in code
- label: Directory Listings
  route: /admin/directory-listings
  icon: ListIcon
  icon_status: explicitly declared in code
- label: Early Signups
  route: /admin/beta
  icon: StarIcon
  icon_status: explicitly declared in code
- label: Feature Flags
  route: /admin/flags
  icon: FlagBannerIcon
  icon_status: explicitly declared in code
- label: Feedback
  route: /admin/feedback
  icon: StarIcon
  icon_status: explicitly declared in code
- label: Financials
  route: /admin/financials
  icon: CurrencyDollarIcon
  icon_status: explicitly declared in code
- label: Live Presence
  route: /admin/presence
  icon: WifiHighIcon
  icon_status: explicitly declared in code
- label: Notifications
  route: /admin/notifications
  icon: BellRingingIcon
  icon_status: explicitly declared in code
- label: Overview
  route: /admin
  icon: SquaresFourIcon
  icon_status: explicitly declared in code
- label: Reconciliation
  route: /admin/reconciliation
  icon: ScalesIcon
  icon_status: explicitly declared in code
- label: Referral Partners
  route: /admin/referral-partners
  icon: HandshakeIcon
  icon_status: explicitly declared in code
- label: Silent Failures
  route: /admin/silent-failures
  icon: WarningIcon
  icon_status: explicitly declared in code
- label: Social Feed
  route: /admin/social
  icon: ChatsIcon
  icon_status: explicitly declared in code
- label: Surveys
  route: /admin/beta-surveys
  icon: ClipboardTextIcon
  icon_status: explicitly declared in code
- label: System Health
  route: /admin/system
  icon: ShieldCheckIcon
  icon_status: explicitly declared in code
- label: System Payments
  route: /admin/system/payments
  icon: CreditCardIcon
  icon_status: explicitly declared in code

## standaloneBottom

- label: Settings
  route: /settings
  icon: GearIcon
  icon_status: explicitly declared in code

## communitySectionItems

- label: Community Hub
  route: /network
  icon: none
  icon_status: no icon declared in code
- label: Feed
  route: /network?tab=feed
  icon: none
  icon_status: no icon declared in code
- label: Channels
  route: /network?tab=channels
  icon: none
  icon_status: no icon declared in code
- label: Discover Chefs
  route: /network?tab=discover
  icon: none
  icon_status: no icon declared in code
- label: Connections
  route: /network?tab=connections
  icon: none
  icon_status: no icon declared in code
- label: Saved Posts
  route: /network/saved
  icon: none
  icon_status: no icon declared in code
- label: Notifications
  route: /network/notifications
  icon: none
  icon_status: no icon declared in code

## QUICK_CREATE_ITEMS

- label: Event
  route: /events/new
  icon: PlusIcon
  icon_status: explicitly declared in code
- label: Menu
  route: /menus/new
  icon: PlusIcon
  icon_status: explicitly declared in code
- label: Quote
  route: /quotes/new
  icon: PlusIcon
  icon_status: explicitly declared in code
- label: Inquiry
  route: /inquiries/new
  icon: PlusIcon
  icon_status: explicitly declared in code
- label: Client
  route: /clients/new
  icon: PlusIcon
  icon_status: explicitly declared in code

## Counts

- total chef navbar nodes: 444
- icons explicitly declared: 183
- nodes with no icon declared: 261
