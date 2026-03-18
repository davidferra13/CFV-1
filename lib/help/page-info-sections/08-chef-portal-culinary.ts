import type { PageInfoEntry } from '../page-info-types'

export const CHEF_PORTAL_CULINARY_PAGE_INFO: Record<string, PageInfoEntry> = {
  '/culinary': {
    title: 'Culinary Hub',
    description:
      'Your culinary workspace - recipes, menus, ingredients, food costing, prep planning, and vendors.',
    features: [
      'Quick stats: recipe count, menu count, ingredient count, vendor count',
      '6 navigation tiles to all subsections',
      'Central jumping-off point for all culinary tools',
    ],
  },

  '/culinary/recipes': {
    title: 'Recipe Book',
    description: 'Your full library of documented recipes with costing and yield.',
    features: [
      'Recipe count and category badges',
      'Time, yield, ingredient count per recipe',
      'Recipe cost calculation',
      'Times cooked tracking',
    ],
  },

  '/culinary/recipes/[id]': {
    title: 'Recipe Detail',
    description: 'Full recipe view - ingredients, instructions, cost breakdown, and event history.',
    features: [
      'Ingredient list with costs',
      'Step-by-step instructions',
      'Yield calculator',
      'Event history',
    ],
  },

  '/culinary/recipes/[id]/edit': {
    title: 'Edit Recipe',
    description: 'Update recipe details - ingredients, instructions, yield, and costing.',
    features: ['Ingredient editor', 'Instruction editor', 'Yield adjustment', 'Cost recalculation'],
  },

  '/culinary/recipes/new': {
    title: 'New Recipe',
    description: 'Create a new recipe from scratch.',
    features: [
      'Recipe name and description',
      'Ingredient list builder',
      'Instruction steps',
      'Yield and costing',
    ],
  },

  '/culinary/recipes/sprint': {
    title: 'Recipe Sprint',
    description: 'Focused recipe development session - batch-create and test new recipes.',
    features: ['Sprint timer', 'Batch recipe creation', 'Testing notes'],
  },

  '/culinary/recipes/drafts': {
    title: 'Draft Recipes',
    description: 'Recipes in progress - not yet finalized.',
    features: ['Draft filter', 'In-progress count', 'Quick edit links'],
  },

  '/culinary/recipes/dietary-flags': {
    title: 'Dietary Flags',
    description: 'Tag recipes by dietary category - vegan, gluten-free, nut-free, etc.',
    features: ['Dietary category tagging', 'Filter recipes by restriction', 'Allergen flagging'],
  },

  '/culinary/recipes/tags': {
    title: 'Recipe Tags',
    description: 'Organize recipes with custom tags - cuisine type, difficulty, season, etc.',
    features: ['Custom tag creation', 'Tag-based filtering', 'Recipe grouping'],
  },

  '/culinary/recipes/seasonal-notes': {
    title: 'Seasonal Notes',
    description: 'Notes on ingredient availability and seasonal variations for recipes.',
    features: ['Seasonal sourcing guidance', 'Best-time-to-buy notes', 'Variation suggestions'],
  },

  '/culinary/menus': {
    title: 'Menus',
    description: 'Event menus and reusable templates - build, share, and track approvals.',
    features: [
      'Menu count and status labels (draft, shared, approved, archived)',
      'Service style tags (plated, family, buffet, cocktail, tasting)',
      'Template indicator',
    ],
  },

  '/culinary/menus/[id]': {
    title: 'Menu Detail',
    description: 'Full menu view - courses, recipes, guest count scaling, and food cost.',
    features: [
      'Course breakdown',
      'Recipe compositions',
      'Guest count scaling',
      'Food cost at scale',
    ],
  },

  '/culinary/menus/new': {
    title: 'New Menu',
    description: 'Create a new event menu - select courses, assign recipes, set service style.',
    features: ['Course builder', 'Recipe selection', 'Service style', 'Guest count'],
  },

  '/culinary/menus/drafts': {
    title: 'Draft Menus',
    description: 'Menus still being developed - not yet shared with clients.',
    features: ['Draft filter', 'In-progress count'],
  },

  '/culinary/menus/approved': {
    title: 'Approved Menus',
    description: 'Menus that have been locked and approved by clients.',
    features: ['Approved filter', 'Locked status indicator'],
  },

  '/culinary/menus/templates': {
    title: 'Menu Templates',
    description: 'Reusable menu blueprints - save time on similar events.',
    features: ['Template library', 'Save as template', 'Apply to new events'],
  },

  '/culinary/menus/scaling': {
    title: 'Menu Scaling',
    description: 'Adjust recipe quantities for different guest counts.',
    features: [
      'Ingredient scaling calculator',
      'Yield adjustments',
      'Cost recalculation per guest',
    ],
  },

  '/culinary/menus/substitutions': {
    title: 'Substitutions',
    description: 'Ingredient swaps and recipe variations for dietary needs or availability.',
    features: ['Seasonal swap suggestions', 'Dietary accommodations', 'Alternative ingredients'],
  },

  '/culinary/ingredients': {
    title: 'Ingredients',
    description: 'Your pantry database and price library - every ingredient you use.',
    features: ['Total ingredient count', 'Price tracking', 'Vendor notes', 'Seasonal availability'],
  },

  '/culinary/ingredients/seasonal-availability': {
    title: 'Seasonal Availability',
    description: "Track ingredient availability by season - know what's fresh and when.",
    features: ['Seasonal calendar', 'Best time to buy indicators', 'Regional availability'],
  },

  '/culinary/ingredients/vendor-notes': {
    title: 'Vendor Notes',
    description: 'Sourcing notes - where to get the best ingredients, pricing, and lead times.',
    features: ['Vendor pricing', 'Lead time notes', 'Quality observations'],
  },

  '/culinary/costing': {
    title: 'Food Costing',
    description: 'Recipe and menu cost breakdowns - know your margins.',
    features: [
      'Food cost percentage analysis',
      'Menu-level costing',
      'Recipe-level costing',
      'Benchmarking',
    ],
  },

  '/culinary/costing/recipe': {
    title: 'Recipe Costing',
    description: 'Cost breakdown by recipe - ingredient costs per yield and per portion.',
    features: ['Cost per yield', 'Cost per portion', 'Ingredient cost line items'],
  },

  '/culinary/costing/menu': {
    title: 'Menu Costing',
    description: 'Total menu cost and per-guest breakdown by course.',
    features: ['Total menu cost', 'Per-guest cost', 'Cost by course'],
  },

  '/culinary/costing/food-cost': {
    title: 'Food Cost Analysis',
    description: 'Food cost percentage tracking - target vs. actual across events.',
    features: ['Food cost % by event', 'Target benchmarks', 'Trend analysis'],
  },

  '/culinary/prep': {
    title: 'Prep Overview',
    description: 'All make-ahead components sorted by lead time - what to prep and when.',
    features: [
      'Component list by lead time',
      'Upcoming event prep',
      'Shopping list and timeline links',
    ],
  },

  '/culinary/prep/shopping': {
    title: 'Shopping List',
    description: 'Consolidated ingredient shopping list across upcoming events.',
    features: ['Events to prep for', 'Consolidated ingredients', 'Quantity aggregation'],
  },

  '/culinary/prep/timeline': {
    title: 'Prep Timeline',
    description: 'Day-by-day prep schedule - what to make and when.',
    features: ['Lead time sequencing', 'Task ordering', 'Component readiness tracking'],
  },

  '/culinary/vendors': {
    title: 'Vendor Directory',
    description: 'Your go-to suppliers, farms, and specialty purveyors.',
    features: ['Vendor contact info', 'Specialty categories', 'Lead times', 'Pricing notes'],
  },

  '/culinary/components': {
    title: 'Components Hub',
    description:
      'Reusable recipe building blocks - stocks, sauces, garnishes, ferments, and shared elements.',
    features: ['5 subcategory tiles', 'Cross-recipe usage tracking'],
  },

  '/culinary/components/stocks': {
    title: 'Stocks',
    description: 'Stock recipes - yields, shelf life, and cost per unit.',
    features: ['Stock library', 'Yield and shelf life', 'Cost per batch'],
  },

  '/culinary/components/sauces': {
    title: 'Sauces',
    description: 'Sauce recipes and variations.',
    features: ['Sauce library', 'Component ingredients', 'Cost per batch'],
  },

  '/culinary/components/garnishes': {
    title: 'Garnishes',
    description: 'Garnish components and prep instructions.',
    features: ['Garnish library', 'Lead time', 'Seasonality notes'],
  },

  '/culinary/components/ferments': {
    title: 'Ferments',
    description: 'Fermented components - kimchi, pickles, and other long-lead items.',
    features: ['Ferment library', 'Fermentation time', 'Shelf life'],
  },

  '/culinary/components/shared-elements': {
    title: 'Shared Elements',
    description: 'Reusable components used across multiple recipes.',
    features: ['Shared component library', 'Cross-recipe usage', 'Prep instructions'],
  },

  '/culinary/my-kitchen': {
    title: 'My Kitchen',
    description: 'Your kitchen setup - equipment inventory and workspace details.',
    features: ['Equipment list', 'Kitchen capacity', 'Mise en place notes'],
  },
}
