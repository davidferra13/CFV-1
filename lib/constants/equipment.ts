// Master Equipment & Supplies Catalog
// Extracted from legacy ChefFlow codebase
// Used for event prep checklists, inventory tracking, and procurement

// ============================================================
// Equipment by Category
// ============================================================

export const MASTER_EQUIPMENT_CATALOG: Record<string, string[]> = {
  'Cooking Equipment': [
    '8" Sauté Pan',
    '10" Sauté Pan',
    '12" Sauté Pan',
    'Small Saucepan',
    'Medium Saucepan',
    'Large Saucepan',
    'Stock Pot',
    'Sheet Trays',
    'Roasting Pan',
    'Tongs',
    'Spatulas',
    'Whisks',
    'Mixing Bowls',
    'Cutting Boards',
    "Chef's Knife",
    'Paring Knife',
    'Serrated Knife',
  ],
  'Plating & Service': [
    'Dinner Plates',
    'Salad Plates',
    'Dessert Plates',
    'Forks',
    'Knives',
    'Spoons',
    'Wine Glasses',
    'Water Glasses',
    'Napkins',
    'Platters',
    'Serving Spoons',
    'Serving Forks',
  ],
  'Pantry & Staples': [
    'Olive Oil',
    'Canola Oil',
    'Salt (Kosher)',
    'Black Pepper',
    'Flour',
    'Sugar',
    'Butter',
    'Garlic',
    'Onions',
    'Vinegar (Red Wine)',
    'Vinegar (White Wine)',
    'Chicken Stock',
    'Vegetable Stock',
  ],
  'Cleaning & Sanitation': [
    'Dish Soap',
    'Sanitizer',
    'Sponges',
    'Scrubbers',
    'Dish Towels',
    'Paper Towels',
    'Trash Bags',
    'Recycling Bags',
    'First-Aid Kit',
  ],
  Utensils: [
    'Measuring Cups',
    'Measuring Spoons',
    'Vegetable Peeler',
    'Can Opener',
    'Grater/Zester',
    'Ladle',
    'Slotted Spoon',
    'Fish Spatula',
    'Kitchen Shears',
  ],
}

// ============================================================
// Flat list for autocomplete / search
// ============================================================

export const ALL_EQUIPMENT_ITEMS = Object.values(MASTER_EQUIPMENT_CATALOG).flat()

// ============================================================
// Equipment categories as a list
// ============================================================

export const EQUIPMENT_CATEGORIES = Object.keys(MASTER_EQUIPMENT_CATALOG) as readonly string[]
