// Global symbol registry for ChefFlow.
// One central place defining all symbols used across the app.
// The symbol key component reads from this registry.

export interface SymbolDef {
  id: string
  label: string
  description?: string
  icon: string // Phosphor icon name from components/ui/icons.ts
  color?: string // Tailwind text color class
}

export interface SymbolCategory {
  name: string
  symbols: SymbolDef[]
}

export const SYMBOL_REGISTRY: SymbolCategory[] = [
  {
    name: 'Timeline',
    symbols: [
      {
        id: 'freezable',
        label: 'Freezable',
        description: 'Can be frozen to extend prep window',
        icon: 'Snowflake',
        color: 'text-sky-400',
      },
      {
        id: 'day_of',
        label: 'Day-of only',
        description: 'Must be prepared fresh on service day',
        icon: 'Flame',
        color: 'text-orange-400',
      },
      {
        id: 'fresh',
        label: 'Short window',
        description: 'Best within a few hours of prep',
        icon: 'Leaf',
        color: 'text-emerald-400',
      },
      {
        id: 'safety_warning',
        label: 'Safety note',
        description: 'Exceeds recommended safety window',
        icon: 'AlertTriangle',
        color: 'text-amber-400',
      },
      {
        id: 'prep_time',
        label: 'Prep time',
        description: 'Estimated active prep duration',
        icon: 'Clock',
        color: 'text-stone-400',
      },
      {
        id: 'serve_immediately',
        label: 'Serve immediately',
        description: 'Must be plated within minutes of cooking',
        icon: 'Flame',
        color: 'text-red-400',
      },
      {
        id: 'hold_warm',
        label: 'Can hold warm',
        description: 'Holds safely at 135F+ for service',
        icon: 'Thermometer',
        color: 'text-amber-400',
      },
      {
        id: 'prep_tier_base',
        label: 'Base prep',
        description: 'Stocks, blanching liquids, base preparations (prep first)',
        icon: 'Layers',
        color: 'text-violet-400',
      },
    ],
  },
  {
    name: 'Storage',
    symbols: [
      {
        id: 'storage_fridge',
        label: 'Refrigerate',
        description: 'Store in refrigerator',
        icon: 'Thermometer',
        color: 'text-blue-400',
      },
      {
        id: 'storage_freezer',
        label: 'Freeze',
        description: 'Store in freezer',
        icon: 'Snowflake',
        color: 'text-cyan-400',
      },
      {
        id: 'storage_room',
        label: 'Room temp',
        description: 'Store at room temperature',
        icon: 'Home',
        color: 'text-stone-400',
      },
    ],
  },
  {
    name: 'Allergens',
    symbols: [
      { id: 'allergen_nuts', label: 'Tree nuts', icon: 'Circle', color: 'text-red-500' },
      { id: 'allergen_peanuts', label: 'Peanuts', icon: 'Circle', color: 'text-red-400' },
      { id: 'allergen_dairy', label: 'Dairy', icon: 'Circle', color: 'text-yellow-400' },
      { id: 'allergen_gluten', label: 'Gluten', icon: 'Circle', color: 'text-orange-400' },
      { id: 'allergen_shellfish', label: 'Shellfish', icon: 'Circle', color: 'text-blue-400' },
      { id: 'allergen_eggs', label: 'Eggs', icon: 'Circle', color: 'text-purple-400' },
      { id: 'allergen_soy', label: 'Soy', icon: 'Circle', color: 'text-stone-400' },
      { id: 'allergen_fish', label: 'Fish', icon: 'Circle', color: 'text-teal-400' },
    ],
  },
  {
    name: 'Dietary',
    symbols: [
      { id: 'vegetarian', label: 'Vegetarian', icon: 'Leaf', color: 'text-green-400' },
      { id: 'vegan', label: 'Vegan', icon: 'Leaf', color: 'text-green-500' },
    ],
  },
]

// Flat lookup for quick access by symbol ID
export function getSymbol(id: string): SymbolDef | undefined {
  for (const cat of SYMBOL_REGISTRY) {
    const found = cat.symbols.find((s) => s.id === id)
    if (found) return found
  }
  return undefined
}
