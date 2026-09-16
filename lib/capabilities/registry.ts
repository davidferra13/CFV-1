import {
  CHEFFLOW_CHEF_PERSONAS,
  CHEFFLOW_OPERATION_TYPES,
  type ChefFlowBuildStatus,
  type ChefFlowCapability,
  type ChefFlowChefPersona,
  type ChefFlowOperationType,
  type ChefFlowPriority,
  type ChefFlowShellArea,
  type ChefFlowStrategy,
  type ChefFlowTestStatus,
  type ChefFlowUsageFrequency,
} from "./types"

const RESEARCH_AS_OF = "2026-09-16"
const ALL_OPS = [...CHEFFLOW_OPERATION_TYPES]
const ALL_PERSONAS = [...CHEFFLOW_CHEF_PERSONAS]

const EVENT_OPS: ChefFlowOperationType[] = ["Private / Personal Chef", "Catering", "Hotel", "Resort", "Casino", "Stadium / Venue", "Estate", "Yacht", "Other Professional Culinary Operation"]
const SERVICE_OPS: ChefFlowOperationType[] = ["Restaurant", "Hotel", "Resort", "Casino", "Food Truck", "Ghost Kitchen", "Stadium / Venue", "Corporate Dining", "Multi-Location Group"]
const INSTITUTIONAL_OPS: ChefFlowOperationType[] = ["Hospital", "Senior Living", "School", "University", "Corporate Dining"]
const PRODUCTION_OPS: ChefFlowOperationType[] = ["Bakery", "Commissary", "Ghost Kitchen", "Meal Prep", "R&D Kitchen", "Restaurant", "Catering", "Multi-Location Group"]

const LEADS: ChefFlowChefPersona[] = ["Executive Chef / Chef-Owner", "Kitchen Manager / Production Chef", "Multi-Location Culinary Director"]
const KITCHEN: ChefFlowChefPersona[] = ["Executive Chef / Chef-Owner", "Sous Chef / Lead Line Cook", "Kitchen Manager / Production Chef"]
const EVENTS: ChefFlowChefPersona[] = ["Private / Personal Chef", "Catering Chef / Event Lead", "Executive Chef / Chef-Owner"]
const OPS: ChefFlowChefPersona[] = ["Purchasing / Operations Chef", "Executive Chef / Chef-Owner", "Commissary Manager", "Multi-Location Culinary Director"]

interface ShellProfile {
  leaders: string[]
  best: string[]
  pain: string[]
  apps: string[]
  evidence: string[]
  sources: string[]
}

const SOURCES = {
  pos: "https://www.clover.com/pos-solutions/restaurant",
  recipes: "https://www.getmeez.com/",
  costing: "https://www.getmeez.com/costing",
  inventory: "https://www.marketman.com/platform/recipe-costing-software",
  crm: "https://sevenrooms.com/platform/crm/",
  accounting: "https://www.restaurant365.com/restaurant-accounting-mgmt-software/",
  training: "https://www.7shifts.com/employee-training/",
  scheduling: "https://www.7shifts.com/",
  delivery: "https://www.deliverect.com/en-us",
} as const

const SHELL_PROFILES: Record<ChefFlowShellArea, ShellProfile> = {
  "Today": { leaders: ["Restaurant365", "Crunchtime", "Toast"], best: ["one-glance priorities", "exception-first operations", "multi-location rollups"], pain: ["critical work is scattered across dashboards", "alerts lack operational context"], apps: ["Toast", "Homebase", "Slack", "Restaurant365"], evidence: ["lib/command-center", "lib/action-center", "lib/briefing", "lib/current"], sources: [SOURCES.accounting] },
  "Tasks": { leaders: ["Jolt", "MaintainX", "7shifts"], best: ["assignable checklists", "recurrence", "proof of completion"], pain: ["tasks split between chat, paper, and maintenance tools", "handoffs are easy to lose"], apps: ["Jolt", "MaintainX", "Slack"], evidence: ["lib/tasks", "lib/checklist", "lib/todos", "lib/equipment"], sources: [SOURCES.training] },
  "Schedule": { leaders: ["7shifts", "Homebase", "Fourth"], best: ["availability-aware schedules", "labor forecasting", "shift swaps and approvals"], pain: ["production calendars and labor schedules diverge", "changes trigger manual messages"], apps: ["7shifts", "Homebase", "Google Calendar"], evidence: ["lib/scheduling", "lib/calendar", "lib/shifts", "lib/availability"], sources: [SOURCES.scheduling] },
  "Team": { leaders: ["Slack", "Microsoft Teams", "7shifts"], best: ["contextual channels", "announcements", "role-aware collaboration"], pain: ["kitchen context disappears in generic chat", "staff search multiple channels for operational truth"], apps: ["Slack", "Microsoft Teams", "Homebase"], evidence: ["lib/team", "lib/chat", "lib/collaboration", "lib/staff"], sources: [SOURCES.training] },
  "Inbox": { leaders: ["Gmail", "Front", "Slack"], best: ["threading", "search", "actionable notifications"], pain: ["work arrives in disconnected channels", "operators re-key messages into operations tools"], apps: ["Gmail", "Outlook", "Slack", "SMS"], evidence: ["lib/inbox", "lib/email", "lib/gmail", "lib/sms", "lib/calls"], sources: [] },
  "Clients / Guests": { leaders: ["SevenRooms", "OpenTable", "HubSpot"], best: ["automatic guest profiles", "preference memory", "segmentation and lifecycle marketing"], pain: ["dietary and relationship data fragment by channel", "guest history is not portable across service types"], apps: ["SevenRooms", "OpenTable", "HubSpot", "Gmail"], evidence: ["lib/clients", "lib/guests", "lib/client-intelligence", "lib/loyalty"], sources: [SOURCES.crm] },
  "Orders / Reservations": { leaders: ["Toast", "Clover", "OpenTable", "Deliverect"], best: ["real-time order state", "reservation pacing", "delivery-channel aggregation"], pain: ["orders and reservations live in separate systems", "marketplaces create duplicate menus and tablets"], apps: ["Toast", "Clover", "OpenTable", "Uber Eats", "DoorDash"], evidence: ["lib/order-operations", "lib/commerce", "lib/booking", "lib/restaurant", "lib/tickets"], sources: [SOURCES.pos, SOURCES.delivery] },
  "Menus": { leaders: ["meez", "Toast", "Deliverect"], best: ["versioned menus", "cost visibility", "multi-channel publishing"], pain: ["cost, recipe, POS, and presentation versions drift", "channel menus require duplicate edits"], apps: ["meez", "Toast", "Deliverect", "Google Drive"], evidence: ["lib/menus", "lib/menu-performance", "lib/front-of-house", "lib/pricing"], sources: [SOURCES.recipes, SOURCES.delivery] },
  "Recipes": { leaders: ["meez", "MarketMan", "Crunchtime"], best: ["single-source recipes", "scaling and yields", "live food costing"], pain: ["recipes live apart from cost and production", "unit conversions and yield changes create margin errors"], apps: ["meez", "MarketMan", "spreadsheets"], evidence: ["lib/recipes", "lib/scaling", "lib/nutrition", "lib/costing"], sources: [SOURCES.recipes, SOURCES.costing, SOURCES.inventory] },
  "Prep": { leaders: ["Crunchtime", "Jolt", "Toast KDS"], best: ["production plans", "station execution", "live kitchen status"], pain: ["prep is rebuilt from menus and forecasts", "paper sheets do not update downstream state"], apps: ["Crunchtime", "Jolt", "Toast KDS", "paper prep sheets"], evidence: ["lib/prep", "lib/prep-timeline", "lib/stations", "lib/service-execution", "lib/production"], sources: [] },
  "Inventory": { leaders: ["MarginEdge", "MarketMan", "Crunchtime"], best: ["mobile counts", "actual versus theoretical", "forecasted depletion"], pain: ["counts are slow and disconnected from recipes", "waste and unit conversion distort truth"], apps: ["MarginEdge", "MarketMan", "spreadsheets"], evidence: ["lib/inventory", "lib/waste", "lib/ingredients"], sources: [SOURCES.inventory] },
  "Purchasing": { leaders: ["MarketMan", "Choco", "BlueCart"], best: ["purchase orders", "catalog ordering", "approval workflows"], pain: ["ordering happens across portals, texts, and sales reps", "price changes appear too late"], apps: ["MarketMan", "Choco", "BlueCart", "vendor portals"], evidence: ["lib/procurement", "lib/grocery", "lib/vendors", "lib/shopping"], sources: [SOURCES.inventory] },
  "Receiving": { leaders: ["MarginEdge", "Restaurant365", "MarketMan", "Ottimate"], best: ["invoice capture", "PO matching", "discrepancy workflows"], pain: ["receiving and accounts payable are separate steps", "substitutions break cost truth"], apps: ["MarginEdge", "Restaurant365", "MarketMan", "vendor invoices"], evidence: ["lib/receipts", "lib/invoices", "lib/ocr", "lib/inventory"], sources: [SOURCES.accounting, SOURCES.inventory] },
  "Vendors": { leaders: ["MarketMan", "Choco", "BlueCart"], best: ["normalized catalogs", "vendor comparison", "order and credit history"], pain: ["supplier data is inconsistent", "contract pricing and credits are hard to reconcile"], apps: ["vendor portals", "MarketMan", "Choco", "BlueCart"], evidence: ["lib/vendors", "lib/openclaw", "lib/procurement"], sources: [SOURCES.inventory] },
  "Food Safety": { leaders: ["Jolt", "FoodDocs", "Crunchtime"], best: ["HACCP workflows", "temperature logs", "corrective actions"], pain: ["paper records are hard to audit", "safety data is isolated from inventory and staff"], apps: ["Jolt", "FoodDocs", "paper logs"], evidence: ["lib/haccp", "lib/safety", "lib/compliance", "lib/incidents", "lib/dietary"], sources: [] },
  "Events": { leaders: ["Tripleseat", "Caterease", "Cvent"], best: ["BEO workflows", "event timelines", "client and venue coordination"], pain: ["sales details are re-entered into production docs", "day-of changes fragment across messages"], apps: ["Tripleseat", "Caterease", "Google Drive"], evidence: ["lib/events", "lib/tickets", "lib/service-execution", "lib/venues"], sources: [] },
  "Payments": { leaders: ["Stripe", "Toast", "Square"], best: ["online and in-person payments", "refunds", "tips and payout reconciliation"], pain: ["payment state diverges from operational state", "multiple processors complicate reconciliation"], apps: ["Stripe", "Toast", "Square"], evidence: ["lib/payments", "lib/stripe", "lib/billing", "lib/invoices"], sources: [SOURCES.pos] },
  "Documents": { leaders: ["Google Drive", "Microsoft 365", "DocuSign"], best: ["searchable storage", "collaboration", "electronic signatures"], pain: ["operational documents become detached files", "versions and approvals are hard to trace"], apps: ["Google Drive", "Microsoft 365", "DocuSign"], evidence: ["lib/documents", "lib/templates", "lib/exports", "lib/ocr", "lib/contracts"], sources: [] },
  "Employees": { leaders: ["7shifts", "Homebase", "Gusto", "ADP"], best: ["onboarding", "time tracking", "payroll and training"], pain: ["HR, scheduling, certifications, training, and payroll live apart", "tipped and multi-rate labor is complex"], apps: ["7shifts", "Homebase", "Gusto", "ADP"], evidence: ["lib/staff", "lib/team", "lib/shifts", "lib/credentials", "lib/onboarding"], sources: [SOURCES.scheduling, SOURCES.training] },
  "Financials": { leaders: ["Restaurant365", "QuickBooks", "Xero"], best: ["bank and POS feeds", "AP and reconciliation", "P&L and cash flow"], pain: ["culinary data must be reclassified for accounting", "operators lack real-time margin truth"], apps: ["Restaurant365", "QuickBooks", "Xero"], evidence: ["lib/finance", "lib/ledger", "lib/expenses", "lib/tax", "lib/invoices"], sources: [SOURCES.accounting] },
  "Analytics": { leaders: ["Restaurant365", "Crunchtime", "MarginEdge"], best: ["prime cost", "menu engineering", "multi-location benchmarking"], pain: ["reports explain the past but rarely drive the next action", "metrics disagree across source systems"], apps: ["Restaurant365", "MarginEdge", "BI tools"], evidence: ["lib/analytics", "lib/reports", "lib/intelligence", "lib/insights", "lib/statistics"], sources: [SOURCES.accounting, SOURCES.inventory] },
}

interface Seed {
  id: string
  capability: string
  shell: ChefFlowShellArea
  job: string
  strategy?: ChefFlowStrategy
  priority?: ChefFlowPriority
  frequency?: ChefFlowUsageFrequency
  build?: ChefFlowBuildStatus
  test?: ChefFlowTestStatus
  personas?: ChefFlowChefPersona[]
  operations?: ChefFlowOperationType[]
  apps?: string[]
  external?: string
  dependencies?: string[]
  implementation?: string
  completion?: string[]
}

const seeds: Seed[] = [
  { id: "today-command-center", capability: "Daily command center", shell: "Today", job: "See the work, risks, and decisions that matter right now", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS", personas: LEADS },
  { id: "today-exception-triage", capability: "Exception and risk triage", shell: "Today", job: "Identify urgent operational exceptions before they disrupt service", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS", personas: LEADS },
  { id: "today-next-actions", capability: "Next-best-action briefing", shell: "Today", job: "Know what to do next without checking every module", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "today-multi-location", capability: "Multi-location operating rollup", shell: "Today", job: "Compare location health and intervene from one view", strategy: "AGGREGATE", priority: "P1", frequency: "DAILY", personas: ["Multi-Location Culinary Director", "Executive Chef / Chef-Owner"] },

  { id: "tasks-capture-assign", capability: "Task capture and assignment", shell: "Tasks", job: "Capture work immediately and assign an accountable owner", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "tasks-recurring-checklists", capability: "Recurring operational checklists", shell: "Tasks", job: "Run repeatable opening, closing, prep, and compliance work", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: KITCHEN },
  { id: "tasks-maintenance", capability: "Maintenance work orders", shell: "Tasks", job: "Report, assign, schedule, and close equipment or facility issues", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", personas: OPS, build: "MISSING", apps: ["MaintainX", "UpKeep", "Limble"] },
  { id: "tasks-handoff", capability: "Shift handoff and completion proof", shell: "Tasks", job: "Hand unfinished work to the next shift with context and proof", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: KITCHEN },

  { id: "schedule-unified-calendar", capability: "Unified operator calendar", shell: "Schedule", job: "See events, prep, deliveries, shifts, deadlines, and blocked time together", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS" },
  { id: "schedule-staff", capability: "Staff scheduling", shell: "Schedule", job: "Build and publish labor schedules against demand and availability", strategy: "OWN", priority: "P0", frequency: "WEEKLY", personas: LEADS },
  { id: "schedule-changes", capability: "Availability, time-off, and shift swaps", shell: "Schedule", job: "Resolve availability and schedule changes without side messages", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN" },
  { id: "schedule-labor-forecast", capability: "Labor forecasting and schedule guardrails", shell: "Schedule", job: "Schedule the right labor against forecast demand, skill mix, and compliance", strategy: "AGGREGATE", priority: "P1", frequency: "WEEKLY", personas: LEADS },

  { id: "team-context-chat", capability: "Contextual team communication", shell: "Team", job: "Discuss work in the same place the operational context lives", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "team-announcements", capability: "Announcements and acknowledgements", shell: "Team", job: "Broadcast operational changes and know who acknowledged them", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", personas: LEADS },
  { id: "team-permissions", capability: "Role and permission management", shell: "Team", job: "Give each person only the access and controls required for their role", strategy: "OWN", priority: "P0", frequency: "OCCASIONAL", personas: LEADS },
  { id: "team-cross-location", capability: "Cross-location collaboration", shell: "Team", job: "Coordinate shared staff, standards, and escalations across locations", strategy: "OWN", priority: "P1", frequency: "DAILY", personas: ["Multi-Location Culinary Director", "Executive Chef / Chef-Owner"] },

  { id: "inbox-email", capability: "Email aggregation and reply", shell: "Inbox", job: "Read, triage, reply to, and attach email to ChefFlow work without opening Gmail or Outlook", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", apps: ["Gmail", "Outlook"] },
  { id: "inbox-sms-calls", capability: "SMS and call aggregation", shell: "Inbox", job: "Handle text and call follow-up from the same operational thread", strategy: "INTEGRATE", priority: "P1", frequency: "CONTINUOUS", apps: ["Twilio", "phone apps"] },
  { id: "inbox-channel-events", capability: "External channel notification aggregation", shell: "Inbox", job: "Normalize reservation, delivery, vendor, and system notifications into one queue", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS", apps: ["OpenTable", "DoorDash", "Uber Eats", "vendor portals"] },
  { id: "inbox-action-extraction", capability: "Action extraction and triage", shell: "Inbox", job: "Turn inbound messages into clients, orders, tasks, schedule changes, and approvals", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },

  { id: "clients-unified-profile", capability: "Unified client and guest profile", shell: "Clients / Guests", job: "See relationship history, preferences, spend, notes, and service history in one profile", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS" },
  { id: "clients-dietary-memory", capability: "Preference, allergy, and dietary memory", shell: "Clients / Guests", job: "Carry dietary requirements and service preferences into every relevant workflow", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "clients-crm-segmentation", capability: "CRM segmentation and lifecycle", shell: "Clients / Guests", job: "Segment guests and clients by behavior, relationship, and service needs", strategy: "OWN", priority: "P1", frequency: "WEEKLY" },
  { id: "clients-marketing", capability: "Relationship marketing and retention", shell: "Clients / Guests", job: "Run targeted follow-up and retention without exporting guest lists to another platform", strategy: "OWN", priority: "P1", frequency: "WEEKLY", apps: ["Mailchimp", "HubSpot", "SevenRooms"] },

  { id: "orders-pos", capability: "POS order lifecycle", shell: "Orders / Reservations", job: "Take, route, modify, fire, settle, and close orders from ChefFlow", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", operations: SERVICE_OPS, build: "PARTIAL", apps: ["Toast", "Clover", "Square"] },
  { id: "orders-reservations", capability: "Reservations, waitlist, table, and pacing management", shell: "Orders / Reservations", job: "Manage booking through seating and service pacing without opening a reservation system", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", operations: SERVICE_OPS, build: "PARTIAL", apps: ["OpenTable", "SevenRooms", "Resy"] },
  { id: "orders-delivery", capability: "Delivery channel aggregation", shell: "Orders / Reservations", job: "Receive and manage delivery orders from every channel in one normalized queue", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS", operations: SERVICE_OPS, build: "PARTIAL", apps: ["DoorDash", "Uber Eats", "Grubhub", "Deliverect"] },
  { id: "orders-catering-booking", capability: "Catering and private-event booking", shell: "Orders / Reservations", job: "Move inquiry through quote, contract, deposit, confirmation, and production handoff", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN", operations: EVENT_OPS, personas: EVENTS },

  { id: "menus-source", capability: "Canonical menu system", shell: "Menus", job: "Maintain one authoritative menu model across service, costing, sales, and production", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "menus-publish", capability: "Multi-channel menu publishing", shell: "Menus", job: "Publish approved menu changes to every customer and order channel without duplicate entry", strategy: "AGGREGATE", priority: "P0", frequency: "EVENT_DRIVEN", apps: ["Toast", "DoorDash", "Uber Eats", "Deliverect"] },
  { id: "menus-engineering", capability: "Menu engineering and profitability", shell: "Menus", job: "Compare popularity, margin, labor, waste, and guest response before changing a menu", strategy: "OWN", priority: "P1", frequency: "WEEKLY" },
  { id: "menus-variants", capability: "Menu variants and dietary substitutions", shell: "Menus", job: "Generate controlled service variants without breaking recipe, prep, or pricing truth", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN" },

  { id: "recipes-system", capability: "Recipe system of record", shell: "Recipes", job: "Store authoritative recipes, sub-recipes, methods, photos, and revisions", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "recipes-scale-yield", capability: "Scaling, yields, and unit conversion", shell: "Recipes", job: "Scale recipes accurately for production while preserving yields and units", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "recipes-costing", capability: "Live recipe and food costing", shell: "Recipes", job: "Recalculate true dish cost automatically when ingredient cost or yield changes", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "recipes-nutrition", capability: "Nutrition, allergens, and labeling", shell: "Recipes", job: "Derive nutrition and allergen outputs from the same recipe truth used by production", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", apps: ["MenuCalc", "ESHA Food Processor"], build: "AUDIT_REQUIRED" },

  { id: "prep-production-plan", capability: "Production and prep plan generation", shell: "Prep", job: "Generate required prep from demand, menus, recipes, inventory, and deadlines", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: KITCHEN },
  { id: "prep-stations", capability: "Station execution and kitchen status", shell: "Prep", job: "Show every station what to make, when, how much, and what is blocked", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS", personas: KITCHEN },
  { id: "prep-kds", capability: "Kitchen display and firing orchestration", shell: "Prep", job: "Coordinate live tickets, coursing, firing, and completion across stations", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", operations: SERVICE_OPS, apps: ["Toast KDS", "Clover KDS"] },
  { id: "prep-packing", capability: "Packing, pickup, and dispatch readiness", shell: "Prep", job: "Verify packing, labeling, handoff, pickup, and delivery readiness before departure", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN" },

  { id: "inventory-counts", capability: "Inventory counts and par levels", shell: "Inventory", job: "Count stock quickly and maintain trusted on-hand quantities", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "inventory-theoretical", capability: "Actual versus theoretical usage", shell: "Inventory", job: "Explain variance between expected recipe depletion and actual stock movement", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "inventory-waste", capability: "Waste, spoilage, and loss tracking", shell: "Inventory", job: "Capture waste at the moment it happens and reflect it in cost and ordering", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "inventory-transfer", capability: "Transfers and multi-location stock", shell: "Inventory", job: "Move inventory between locations while preserving quantity and cost traceability", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", operations: ["Multi-Location Group", "Restaurant", "Hotel", "Resort", "Casino", "Commissary", "Corporate Dining"] },

  { id: "purchasing-requisitions", capability: "Requisitions and purchase orders", shell: "Purchasing", job: "Turn demand into approved purchase orders with quantities, vendors, and due dates", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: OPS },
  { id: "purchasing-vendor-ordering", capability: "Vendor ordering through ChefFlow", shell: "Purchasing", job: "Place supplier orders without opening vendor portals, texting reps, or re-keying carts", strategy: "INTEGRATE", priority: "P0", frequency: "DAILY", personas: OPS, build: "MISSING", apps: ["Choco", "BlueCart", "vendor portals"] },
  { id: "purchasing-suggested", capability: "Forecast-driven suggested ordering", shell: "Purchasing", job: "Recommend what to buy from demand, pars, inventory, lead times, and price", strategy: "OWN", priority: "P1", frequency: "DAILY", personas: OPS },
  { id: "purchasing-approval", capability: "Purchasing approvals and spend controls", shell: "Purchasing", job: "Route high-cost or off-contract purchases to the right approver without leaving ChefFlow", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", personas: LEADS },

  { id: "receiving-capture", capability: "Invoice and packing-slip capture", shell: "Receiving", job: "Digitize incoming invoices and packing slips at receiving", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: OPS },
  { id: "receiving-match", capability: "PO, receipt, and invoice matching", shell: "Receiving", job: "Match what was ordered, delivered, and billed before approving cost", strategy: "OWN", priority: "P0", frequency: "DAILY", personas: OPS },
  { id: "receiving-discrepancy", capability: "Receiving discrepancy workflow", shell: "Receiving", job: "Resolve shorts, substitutions, damage, overages, and price differences immediately", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN", personas: OPS },
  { id: "receiving-ap-handoff", capability: "Invoice processing and AP handoff", shell: "Receiving", job: "Move verified invoices into payable state without duplicate data entry", strategy: "INTEGRATE", priority: "P0", frequency: "DAILY", apps: ["Restaurant365", "QuickBooks", "Ottimate", "MarginEdge"] },

  { id: "vendors-master", capability: "Vendor master and relationship record", shell: "Vendors", job: "Keep contacts, terms, lead times, service history, contracts, and notes together", strategy: "OWN", priority: "P1", frequency: "WEEKLY", personas: OPS },
  { id: "vendors-catalog", capability: "Catalog normalization", shell: "Vendors", job: "Normalize vendor SKUs, pack sizes, units, substitutions, and ingredient mappings", strategy: "AGGREGATE", priority: "P0", frequency: "CONTINUOUS", personas: OPS },
  { id: "vendors-price-compare", capability: "Cross-vendor price and availability comparison", shell: "Vendors", job: "Compare true landed cost and availability before choosing where to buy", strategy: "AGGREGATE", priority: "P1", frequency: "DAILY", personas: OPS },
  { id: "vendors-contracts-credits", capability: "Contracts, credits, and disputes", shell: "Vendors", job: "Track contract pricing, credits, shortages, disputes, and vendor commitments through resolution", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", personas: OPS },

  { id: "safety-haccp", capability: "HACCP and temperature logging", shell: "Food Safety", job: "Run required control-point and temperature checks with audit-ready records", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "safety-corrective", capability: "Corrective actions and incident response", shell: "Food Safety", job: "Turn failed checks or incidents into immediate corrective action and accountable follow-up", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN" },
  { id: "safety-allergen", capability: "Allergen control and service verification", shell: "Food Safety", job: "Carry verified allergen constraints from guest to recipe to prep to service", strategy: "OWN", priority: "P0", frequency: "CONTINUOUS" },
  { id: "safety-compliance", capability: "Compliance, certifications, and inspection readiness", shell: "Food Safety", job: "Keep permits, certifications, logs, expirations, and inspection evidence current", strategy: "OWN", priority: "P1", frequency: "DAILY", operations: [...ALL_OPS, ...INSTITUTIONAL_OPS] },

  { id: "events-beo", capability: "Event and BEO workspace", shell: "Events", job: "Keep sales, guest, menu, staffing, venue, timeline, and service truth in one event record", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN", operations: EVENT_OPS, personas: EVENTS },
  { id: "events-run-of-show", capability: "Run of show and service timeline", shell: "Events", job: "Execute arrival, setup, prep, service, breakdown, and follow-up from one live timeline", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN", operations: EVENT_OPS, personas: EVENTS },
  { id: "events-venue-logistics", capability: "Venue and logistics coordination", shell: "Events", job: "Track access, parking, equipment, rentals, utilities, contacts, and constraints before event day", strategy: "OWN", priority: "P1", frequency: "EVENT_DRIVEN", operations: EVENT_OPS, personas: EVENTS },
  { id: "events-catering-system", capability: "Catering sales-to-operations continuity", shell: "Events", job: "Eliminate re-entry between lead capture, proposal, contract, BEO, production, staffing, and billing", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN", operations: EVENT_OPS, personas: EVENTS, apps: ["Tripleseat", "Caterease", "Cvent"] },

  { id: "payments-accept", capability: "Card, ACH, and in-person payment acceptance", shell: "Payments", job: "Collect payment from the ChefFlow workflow while payment rails operate underneath", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", apps: ["Stripe", "Toast", "Square"] },
  { id: "payments-deposits", capability: "Deposits, payment schedules, and invoices", shell: "Payments", job: "Tie deposits and payment schedules directly to bookings, events, and orders", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN" },
  { id: "payments-refunds-tips", capability: "Refunds, adjustments, tips, and gratuity", shell: "Payments", job: "Resolve payment adjustments without losing connection to the underlying service record", strategy: "INTEGRATE", priority: "P1", frequency: "EVENT_DRIVEN", apps: ["Stripe", "Toast", "Square"] },
  { id: "payments-reconcile", capability: "Processor and payout reconciliation", shell: "Payments", job: "Reconcile payments, fees, refunds, tips, and payouts against ChefFlow financial truth", strategy: "AGGREGATE", priority: "P0", frequency: "DAILY" },

  { id: "documents-records", capability: "Operational document system", shell: "Documents", job: "Store documents where the related client, event, employee, vendor, or financial record lives", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "documents-templates", capability: "Templates, generation, and approvals", shell: "Documents", job: "Generate consistent proposals, BEOs, SOPs, forms, labels, and reports from live ChefFlow data", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "documents-esign", capability: "Electronic signatures", shell: "Documents", job: "Send, sign, countersign, and store agreements without opening a separate signing application", strategy: "INTEGRATE", priority: "P1", frequency: "EVENT_DRIVEN", build: "MISSING", apps: ["DocuSign", "Dropbox Sign"] },
  { id: "documents-import-search", capability: "Scan, OCR, import, and universal search", shell: "Documents", job: "Capture paper or external files and make their contents searchable and actionable", strategy: "OWN", priority: "P1", frequency: "DAILY", apps: ["Google Drive", "Microsoft 365"] },

  { id: "employees-onboarding", capability: "Employee onboarding and records", shell: "Employees", job: "Hire, onboard, collect required records, and establish role access from one workflow", strategy: "OWN", priority: "P0", frequency: "EVENT_DRIVEN" },
  { id: "employees-timeclock", capability: "Time clock, attendance, breaks, and labor records", shell: "Employees", job: "Capture worked time and attendance with schedule and payroll context", strategy: "INTEGRATE", priority: "P0", frequency: "CONTINUOUS", apps: ["7shifts", "Homebase", "Toast"] },
  { id: "employees-payroll", capability: "Payroll calculation, filing, and payout", shell: "Employees", job: "Move verified time, wages, tips, deductions, and taxes to payroll without re-entry", strategy: "INTEGRATE", priority: "P0", frequency: "WEEKLY", build: "MISSING", apps: ["7shifts Pay", "Gusto", "ADP", "Homebase Payroll"] },
  { id: "employees-training", capability: "Training, certifications, and skill progression", shell: "Employees", job: "Assign training by role, verify practical skills, and track certifications and expirations", strategy: "OWN", priority: "P1", frequency: "WEEKLY", apps: ["7shifts", "Jolt", "Schoox"] },

  { id: "financials-accounting", capability: "Accounting system and general ledger continuity", shell: "Financials", job: "Keep sales, purchasing, payroll, tax, and expense data connected to accounting truth", strategy: "INTEGRATE", priority: "P0", frequency: "DAILY", build: "AUDIT_REQUIRED", apps: ["Restaurant365", "QuickBooks", "Xero"] },
  { id: "financials-ap-expenses", capability: "Accounts payable and expense management", shell: "Financials", job: "Approve, classify, schedule, and reconcile vendor bills and operating expenses", strategy: "OWN", priority: "P0", frequency: "DAILY" },
  { id: "financials-pl-cash", capability: "P&L, cash flow, and margin truth", shell: "Financials", job: "See financial performance from live operational data instead of waiting for month-end cleanup", strategy: "AGGREGATE", priority: "P0", frequency: "DAILY" },
  { id: "financials-tax-filing", capability: "Tax calculation and filing handoff", shell: "Financials", job: "Calculate tax obligations and complete filing with the least possible external handoff", strategy: "LAUNCH_ONLY", priority: "P1", frequency: "MONTHLY", build: "PARTIAL", apps: ["tax agency portals", "accounting software"], external: "Some tax jurisdictions still require filing or identity verification in government-controlled systems; ChefFlow must minimize and track that handoff until direct filing is available." },

  { id: "analytics-prime-cost", capability: "Prime cost and controllable-cost analytics", shell: "Analytics", job: "Understand food, labor, and controllable cost together while there is still time to act", strategy: "AGGREGATE", priority: "P0", frequency: "DAILY" },
  { id: "analytics-menu", capability: "Menu and item performance analytics", shell: "Analytics", job: "Connect item popularity, margin, waste, prep burden, and guest response", strategy: "OWN", priority: "P1", frequency: "WEEKLY" },
  { id: "analytics-labor", capability: "Labor productivity and staffing analytics", shell: "Analytics", job: "Compare labor spend and productivity with actual demand and service outcomes", strategy: "AGGREGATE", priority: "P1", frequency: "DAILY" },
  { id: "analytics-multi-location", capability: "Multi-location benchmarking and anomaly detection", shell: "Analytics", job: "Compare locations consistently and surface meaningful deviations automatically", strategy: "AGGREGATE", priority: "P1", frequency: "DAILY", personas: ["Multi-Location Culinary Director", "Executive Chef / Chef-Owner"] },
]

function toCapability(seed: Seed): ChefFlowCapability {
  const profile = SHELL_PROFILES[seed.shell]
  const strategy = seed.strategy ?? "OWN"
  const buildStatus = seed.build ?? "PARTIAL"
  const testStatus = seed.test ?? "AUDIT_REQUIRED"
  const currentAppSwitches = seed.apps ?? profile.apps
  const externalInteractionRemaining = seed.external ?? (buildStatus === "VERIFIED" && testStatus === "VERIFIED" ? "" : `End-to-end stack elimination is not yet verified; this workflow may still require ${currentAppSwitches.join(", ")}.`)
  const productDebt = strategy === "LAUNCH_ONLY" || buildStatus !== "VERIFIED" || testStatus !== "VERIFIED" || externalInteractionRemaining.length > 0

  return {
    id: seed.id,
    capability: seed.capability,
    shell: seed.shell,
    jobToBeDone: seed.job,
    chefPersonas: seed.personas ?? ALL_PERSONAS,
    operationTypes: seed.operations ?? ALL_OPS,
    usageFrequency: seed.frequency ?? "DAILY",
    existingMarketLeaders: profile.leaders,
    bestFeatures: profile.best,
    painPoints: profile.pain,
    marketResearchSources: profile.sources,
    chefFlowImplementation: seed.implementation ?? `Complete ${seed.job.toLowerCase()} inside ChefFlow with shared state, persona-aware presentation, and no manual re-keying.`,
    strategy,
    currentAppSwitches,
    externalInteractionRemaining,
    productDebt,
    dependencies: seed.dependencies ?? [],
    priority: seed.priority ?? "P1",
    buildStatus,
    testStatus,
    evidence: profile.evidence,
    completionCriteria: seed.completion ?? [
      "The chef can start and finish this job inside ChefFlow.",
      "Required external services operate behind ChefFlow unless a documented external control is unavoidable.",
      "Data created here updates every dependent ChefFlow workflow without duplicate entry.",
    ],
    researchAsOf: RESEARCH_AS_OF,
  }
}

export const CHEFFLOW_CAPABILITY_REGISTRY: ChefFlowCapability[] = seeds.map(toCapability)
