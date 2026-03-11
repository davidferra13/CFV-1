# Chef Portal Nav

Current inventory for the chef portal nav as of March 11, 2026.

Scope:
- Normal non-admin chef account
- Desktop expanded sidebar
- Default shortcut preferences
- Mobile bottom tabs included
- Event lock-in does not hide the rest of the portal

Source of truth:
- `components/navigation/nav-config.tsx`
- `components/navigation/chef-nav.tsx`

## Desktop Sidebar

### Header
- `ChefFlow` logo
- If event lock-in is active: locked event title, event date, and `Exit` button
- Search
- Notifications
- Offline indicator
- Activity indicator
- Collapse toggle

### Shortcuts
Default shortcut list:
- `Dashboard`
- `Inbox`
- `Clients`
- `Inquiries`
- `Quotes`
- `Calendar`
- `All Events`
- `Menus`
- `Recipes`
- `Communications`
- `Inventory`
- `Documents`
- `Invoices`

Available extra shortcuts:
- `Briefing`
- `Daily Ops`
- `Messaging`
- `Circles`
- `Rate Card`
- `Travel`
- `Staff`
- `Tasks`
- `Stations`
- `Activity`
- `Goals`
- `Portfolio`
- `Commerce`

Admin-only shortcuts not shown to normal chefs:
- `Commands`
- `Prospecting`
- `Charity Hub`

### Quick Create
- `New Event`
- `New Quote`
- `New Inquiry`
- `New Client`

### Grouped Navigation

#### Sales
- `Inquiries`
Children: `New`, `Needs Response`, `Waiting for Reply`, `Menu Drafting`, `Ready to Book`, `Declined`, `Log New Inquiry`
- `Quotes`
Children: `New Quote`, `Draft`, `Sent`, `Viewed`, `Accepted`, `Expired`, `Rejected`
- `Rate Card`
- `Proposals`
Children: `Templates`, `Add-Ons`
- `Leads`
Children: `New`, `Contacted`, `Qualified`, `Converted`, `Archived`
- `Marketplace`
Children: `Capture Leads`
- `Wix Submissions`
- `Calls & Meetings`
Children: `Schedule Call`, `Upcoming`, `Completed`
- `Testimonials`

#### Clients
- `Client Directory`
Children: `Active`, `Inactive`, `VIP`, `Add Client`, `Recurring Clients`, `Client Presence`, `Segments`, `Duplicates`, `Gift Cards`
- `Quick Requests`
- `Communications`
Children: `Client Workspace`, `Client Notes`, `Follow-Ups`, `Upcoming Touchpoints`, `Outreach & Referrals`
- `Client History`
Children: `Event History`, `Past Menus`, `Spending History`
- `Preferences & Dietary`
Children: `Dietary Restrictions`, `Allergies`, `Favorite Dishes`, `Dislikes`
- `Client Insights`
Children: `Top Clients`, `Most Frequent`, `At Risk`
- `Feedback`
Children: `Survey Inbox`
- `Loyalty & Rewards`
Children: `Program Settings`, `Learn Loyalty`, `Raffle`, `Create Reward`, `Loyalty Overview`, `Points`, `Rewards`, `Referrals`
- `Guest Directory`
Children: `Reservations`, `Guest Pipeline`, `Guest Insights`
- `Partners & Referrals`
Children: `Active`, `Inactive`, `Add Partner`, `Referral Performance`, `Events Generated`

#### Events
- `My Events`
Children: `Create Event`, `Create from Text`, `Event Wizard`, `Kanban Board`, `Deposit Pending`, `Confirmed`, `Completed`, `Cancelled`
- `Calendar`
Children: `Day View`, `Week Planner`, `Year View`, `Share Calendar`, `Production Calendar`, `Scheduling Dashboard`, `Availability`, `Shifts`, `Swaps`, `Waitlist`
- `Event Reviews`
Children: `Reviews`, `Smart Import`

#### Commerce
- `Commerce Hub`
- `POS Register`
- `Virtual Terminal`
- `Table Service`
- `Kitchen Display`
- `Products`
Children: `New Product`, `Modifiers`
- `Gift Cards`
- `Order Queue`
- `Purchase Orders`
- `Sales History`
- `Promotions`
- `Specials`
- `QR Menu`
- `Observability`
- `Clover Parity`
- `Reconciliation`
- `Settlements`
- `Reports`
Children: `Analytics`, `Peak Hours`, `Shift Reports`
- `Payment Schedules`

#### Culinary
- `Culinary Hub`
- `Menus`
Children: `Menu Workspace`, `New Menu`, `Dish Library`, `Draft Menus`, `Approved Menus`, `Scaling`, `Substitutions`, `Dish Index`, `Menu Upload`, `Dish Insights`, `Menu Templates`
- `Recipes`
Children: `New Recipe`, `Recipe Library`, `Draft Recipes`, `Dietary Flags`, `Seasonal Notes`, `Recipe Tags`, `Production Log`, `Recipe Sprint`, `Components`
- `Ingredients`
Children: `Ingredients Database`, `Seasonal Availability`, `Vendor Notes`
- `Prep Workspace`
Children: `Prep Shopping`, `Prep Timeline`
- `Costing`
Children: `Recipe Costing`, `Menu Costing`, `Food Cost`
- `My Kitchen`
- `Culinary Vendors`
- `Bakery`
Children: `Orders`, `New Order`, `Oven Schedule`, `Display Case`, `Fermentation`, `Wholesale`, `Seasonal`, `Tastings`, `Batches`, `Yield`
- `Culinary Board`
- `Beverages`
- `Plating Guides`
- `Seasonal Palettes`

#### Operations
- `Operations Hub`
- `Daily Ops`
- `Tasks`
Children: `Task Templates`
- `Station Clipboards`
Children: `Order Sheet`, `Order Sheet Print`, `Waste Log`, `Ops Log`
- `Staff`
Children: `Team Access`, `Schedule`, `Availability`, `Clock In/Out`, `Time Clock`, `Weekly Time Clock`, `Performance`, `Labor Dashboard`, `Staff Forecast`, `Freelancers`, `Live Activity`
- `Training & SOPs`
- `Priority Queue`
- `Meal Prep`
Children: `Container Inventory`, `Cooking Day`, `Delivery Route`, `Container Labels`, `Meal Prep Shopping`, `Meal Prep Waste`
- `Shopping Lists`
Children: `New Shopping List`, `Weekly Shopping`
- `Kitchen Rentals`
- `Equipment`
- `Packing Templates`
- `Food Truck`
Children: `Locations`, `Maintenance`, `Menu Board`, `Menu Board Display`, `Par Planning`, `Permits`, `Preorders`, `Profitability`, `Food Truck Social`, `Weather`

#### Vendors
- `Purveyors`
Children: `Invoices`, `Price Comparison`
- `Food Cost`
Children: `Daily Revenue`

#### Inventory
- `Inventory Hub`
- `Stock Movements`
- `Storage Locations`
- `Purchase Orders`
Children: `New PO`
- `Procurement Hub`
- `Inventory Counts`
Children: `Stocktake`, `Stocktake History`
- `Physical Audits`
Children: `New Audit`
- `Waste Tracking`
- `Vendor Invoices`
- `Food Cost Analysis`
Children: `FIFO`
- `Staff Meals`
- `Expiry Alerts`
- `Demand Forecast`
Children: `Reorder`

#### Finance
- `Financial Hub`
Children: `Overview`, `Finance Home`, `Revenue Summary`, `Outstanding Payments`, `Cash Flow Overview`
- `Expenses`
Children: `Add Expense`, `Receipt Library`, `By Category`, `Food Ingredients`, `Labor`, `Marketing`, `Miscellaneous`, `Rentals & Equipment`, `Software`, `Travel`
- `Invoices`
Children: `Draft`, `Sent`, `Paid`, `Overdue`, `Refunded`, `Cancelled`, `Recurring Invoices`
- `Payments`
Children: `Deposits`, `Failed Payments`, `Installments`, `Split Payments`, `Refunds`, `Disputes`, `Retainers`, `New Retainer`
- `Payouts`
Children: `Manual Payments`, `Payout Reconciliation`, `Stripe Payouts`, `Bank Feed`
- `Ledger`
Children: `Transaction Log`, `Adjustments`
- `Budget`
- `Food Cost`
- `Finance Goals`
- `Reports`
Children: `Advanced Reports`, `Revenue by Month`, `Revenue by Client`, `Revenue by Event`, `Expense by Category`, `Profit by Event`, `Profit & Loss`, `Year-to-Date Summary`
- `Tax Center`
Children: `1099-NEC`, `Depreciation`, `Home Office`, `Retirement`, `Tax Summary`, `Quarterly Estimates`, `Year-End Package`
- `Pricing Calculator`
- `Consulting`
- `Revenue Per Hour`
- `Payroll`
Children: `Run Payroll`, `Employees`, `Calculator`, `941`, `W-2`
- `Break-Even Planning`
- `P&L`
- `Sales Tax`
Children: `Jurisdictions`, `Remittances`
- `Tips`
- `Year-End`
- `Forecasting`
Children: `Cash Flow Forecast`
- `1099 Contractors`

#### Marketing
- `Email Campaigns`
Children: `Push Dinners`, `New Push Dinner`, `Sequences`, `Templates`
- `Social Workspace`
- `Content Planner`
Children: `Media Vault`, `Photo Gallery`, `Platform Connections`, `Queue Settings`
- `Portfolio`
- `Brand Mentions`

#### Analytics
- `Insights`
Children: `Daily Report`, `Source Analytics`, `Funnel`, `Locations`, `Menu Engineering`, `Custom Reports`, `Time Analysis`
- `Business Analytics`
Children: `Pipeline Forecast`, `Demand Heatmap`, `Client Value`, `Referral Sources`
- `Capacity Planning`
- `Intelligence Hub`
- `Goals`
Children: `Revenue Path`

#### Protection
- `Business Health`
Children: `Insurance`, `Certifications`, `Daily Compliance`, `NDA & Permissions`, `Business Continuity`, `Crisis Response`
- `Incidents`
Children: `Report Incident`
- `Backup Coverage`

#### Tools
- `Notifications`
Children: `SMS History`
- `Inbox Tools`
Children: `Sort Messages`
- `Template Library`
- `Onboarding Hub`
Children: `Client Onboarding`, `Loyalty Onboarding`, `Recipe Onboarding`, `Staff Onboarding`
- `Help Center`

### Community Section
- `Community Hub`
- `Feed`
- `Channels`
- `Discover Chefs`
- `Collaborations`
- `Connections`
- `Saved Posts`
- `Notifications`
- `Community Templates`

### Settings And Tools
- `Settings`
- `Games`

### Footer
- `Sign Out`

## Mobile Nav

### Top Bar
- `ChefFlow` logo
- Search
- Notifications
- Offline indicator
- Activity indicator
- Menu button

### Bottom Tabs
- `Home`
- `Menus`
- `Inbox`
- `Events`
- `Clients`
- `More`

### Slide-Out Menu
The mobile slide-out menu mirrors the desktop structure:
- `Quick Create`
- `Shortcuts`
- All grouped nav sections
- `Community`
- `Settings & Tools`
- `Sign Out`

## Hidden From Normal Chefs
- `Commands` shortcut
- `Commands` group
- `Prospecting`
- `Charity Hub`
- `Cannabis` section
- `Admin` section
- `Open Tables`
