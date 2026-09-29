export const CHEFFLOW_SHELL_AREAS = [
  "Today", "Tasks", "Schedule", "Team", "Inbox", "Clients / Guests",
  "Orders / Reservations", "Menus", "Recipes", "Prep", "Inventory",
  "Purchasing", "Receiving", "Vendors", "Food Safety", "Events",
  "Payments", "Documents", "Employees", "Financials", "Analytics",
] as const

export const CHEFFLOW_STRATEGIES = ["OWN", "INTEGRATE", "AGGREGATE", "LAUNCH_ONLY"] as const
export const CHEFFLOW_USAGE_FREQUENCIES = ["CONTINUOUS", "DAILY", "WEEKLY", "MONTHLY", "EVENT_DRIVEN", "OCCASIONAL"] as const
export const CHEFFLOW_PRIORITIES = ["P0", "P1", "P2", "P3"] as const
export const CHEFFLOW_BUILD_STATUSES = ["VERIFIED", "PARTIAL", "AUDIT_REQUIRED", "MISSING", "BLOCKED"] as const
export const CHEFFLOW_TEST_STATUSES = ["VERIFIED", "PARTIAL", "AUDIT_REQUIRED", "MISSING", "NOT_APPLICABLE"] as const

export const CHEFFLOW_OPERATION_TYPES = [
  "Restaurant", "Private / Personal Chef", "Catering", "Hotel", "Resort", "Casino",
  "Bakery", "Food Truck", "Commissary", "Ghost Kitchen", "Hospital", "Senior Living",
  "School", "University", "Stadium / Venue", "Corporate Dining", "Estate", "Yacht",
  "Meal Prep", "R&D Kitchen", "Multi-Location Group", "Other Professional Culinary Operation",
] as const

export const CHEFFLOW_CHEF_PERSONAS = [
  "Executive Chef / Chef-Owner", "Sous Chef / Lead Line Cook", "Private / Personal Chef",
  "Catering Chef / Event Lead", "Pastry / Bakery Chef", "Purchasing / Operations Chef",
  "Institutional / Clinical Foodservice Leader", "Culinary R&D Lead",
  "Multi-Location Culinary Director", "Kitchen Manager / Production Chef",
  "Food Truck / Ghost Kitchen Operator", "Commissary Manager", "FOH / Guest Operations Lead",
] as const

export type ChefFlowShellArea = (typeof CHEFFLOW_SHELL_AREAS)[number]
export type ChefFlowStrategy = (typeof CHEFFLOW_STRATEGIES)[number]
export type ChefFlowUsageFrequency = (typeof CHEFFLOW_USAGE_FREQUENCIES)[number]
export type ChefFlowPriority = (typeof CHEFFLOW_PRIORITIES)[number]
export type ChefFlowBuildStatus = (typeof CHEFFLOW_BUILD_STATUSES)[number]
export type ChefFlowTestStatus = (typeof CHEFFLOW_TEST_STATUSES)[number]
export type ChefFlowOperationType = (typeof CHEFFLOW_OPERATION_TYPES)[number]
export type ChefFlowChefPersona = (typeof CHEFFLOW_CHEF_PERSONAS)[number]

export interface ChefFlowCapability {
  id: string
  capability: string
  shell: ChefFlowShellArea
  jobToBeDone: string
  chefPersonas: ChefFlowChefPersona[]
  operationTypes: ChefFlowOperationType[]
  usageFrequency: ChefFlowUsageFrequency
  existingMarketLeaders: string[]
  bestFeatures: string[]
  painPoints: string[]
  marketResearchSources: string[]
  chefFlowImplementation: string
  strategy: ChefFlowStrategy
  currentAppSwitches: string[]
  externalInteractionRemaining: string
  productDebt: boolean
  dependencies: string[]
  priority: ChefFlowPriority
  buildStatus: ChefFlowBuildStatus
  testStatus: ChefFlowTestStatus
  evidence: string[]
  completionCriteria: string[]
  researchAsOf: string
}
