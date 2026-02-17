// Business Constants
// Extracted from legacy ChefFlow codebase — stable operational data
// Used across inquiry pipeline, events, financials, and client management

// ============================================================
// Inquiry & Lead Sources
// ============================================================

export const INQUIRY_SOURCE_OPTIONS = [
  'Word of Mouth',
  'Google Search',
  'Instagram',
  'Facebook',
  'Referral',
  'TakeAChef',
  'Website',
  'Phone Call',
  'Other',
] as const

export type InquirySource = (typeof INQUIRY_SOURCE_OPTIONS)[number]

// ============================================================
// Menu & Service Types
// ============================================================

export const MENU_TYPE_OPTIONS = [
  'Plated Dinner',
  'Family Style',
  'Buffet',
  'Tasting Menu',
  'Cocktail Party',
  'Brunch',
  'Meal Prep',
  'Cooking Class',
] as const

export type MenuType = (typeof MENU_TYPE_OPTIONS)[number]

// ============================================================
// Priority Levels
// ============================================================

export const PRIORITY_LEVELS = ['Urgent', 'High', 'Normal', 'Low'] as const
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

// ============================================================
// Income Sources
// ============================================================

export const INCOME_SOURCES = [
  { value: 'catering', label: 'Catering' },
  { value: 'personal_chef', label: 'Personal Chef' },
  { value: 'cooking_class', label: 'Cooking Class' },
  { value: 'meal_prep', label: 'Meal Prep' },
  { value: 'product_sales', label: 'Product Sales' },
  { value: 'other', label: 'Other' },
] as const

export type IncomeSource = (typeof INCOME_SOURCES)[number]['value']

// ============================================================
// Expense Categories
// ============================================================

export const EXPENSE_CATEGORIES = [
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'rent', label: 'Rent' },
  { value: 'other', label: 'Other' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['value']

// ============================================================
// Payment Methods
// ============================================================

export const PAYMENT_METHODS = [
  'Stripe',
  'Cash',
  'Check',
  'Venmo',
  'Zelle',
  'Wire Transfer',
  'Credit Card',
  'Other',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// ============================================================
// Conversation Tracking
// ============================================================

export const CONVERSATION_STATUSES = [
  { value: 'my_turn', label: 'My Turn' },
  { value: 'their_turn', label: 'Their Turn' },
  { value: 'follow_up_scheduled', label: 'Follow-up Scheduled' },
  { value: 'completed', label: 'Completed' },
] as const

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]['value']

export const CLIENT_SENTIMENTS = ['Positive', 'Neutral', 'Negative'] as const
export type ClientSentiment = (typeof CLIENT_SENTIMENTS)[number]

// ============================================================
// Communication Log Types
// ============================================================

export const COMMUNICATION_TYPES = ['Email', 'Call', 'Meeting', 'Note', 'Text', 'DM'] as const
export type CommunicationType = (typeof COMMUNICATION_TYPES)[number]

// ============================================================
// Staff Roles
// ============================================================

export const STAFF_ROLES = ['Chef', 'Server', 'Bartender', 'Assistant'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

// ============================================================
// Vendor Statuses
// ============================================================

export const VENDOR_STATUSES = ['Preferred', 'Active', 'Inactive'] as const
export type VendorStatus = (typeof VENDOR_STATUSES)[number]

// ============================================================
// Inventory Categories & Units
// ============================================================

export const INVENTORY_CATEGORIES = [
  'Produce',
  'Protein',
  'Dairy',
  'Dry Goods',
  'Spices',
  'Other',
] as const

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number]

export const INVENTORY_UNITS = ['pcs', 'g', 'kg', 'oz', 'lb', 'L', 'ml', 'cup', 'tbsp', 'tsp'] as const
export type InventoryUnit = (typeof INVENTORY_UNITS)[number]

// ============================================================
// Dashboard Widget Config
// ============================================================

export type WidgetConfig = {
  name: string
  icon: string
  visible: boolean
}

export const DEFAULT_WIDGET_SETTINGS: Record<string, WidgetConfig> = {
  pnl: { name: 'P&L Snapshot', icon: 'piggy-bank', visible: true },
  upcomingEvents: { name: 'Upcoming Events', icon: 'calendar-check', visible: true },
  weather: { name: 'Local Weather', icon: 'cloud-sun', visible: true },
  monthlyProfitChart: { name: 'Monthly Profit', icon: 'chart-bar', visible: true },
  inquirySourceChart: { name: 'Inquiry Sources', icon: 'chart-pie', visible: true },
  eventTypesChart: { name: 'Event Types', icon: 'chart-line', visible: true },
  auditLog: { name: 'Audit Log', icon: 'shield', visible: false },
}

// ============================================================
// Contract Templates
// ============================================================

export const DEFAULT_CONTRACT_TEMPLATE = `This agreement is between {{clientName}} and {{chefName}} for the event: {{eventName}} on {{eventDate}}.

Event Details:
- Date: {{eventDate}}
- Time: {{eventTime}}
- Location: {{eventLocation}}
- Guest Count: {{guestCount}}
- Menu Style: {{menuType}}

Total Price: {{totalPrice}}
Deposit Required: {{depositAmount}}

Terms & Conditions:
1. A deposit of {{depositAmount}} is required to confirm the booking.
2. Final payment is due 48 hours before the event.
3. Cancellations made more than 7 days before the event receive a full refund of the deposit.
4. Menu changes must be communicated at least 72 hours before the event.
5. Guest count changes of more than 10% may result in price adjustments.`
