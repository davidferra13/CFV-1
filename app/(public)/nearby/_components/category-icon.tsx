import {
  UtensilsCrossed,
  ChefHat,
  ConciergeBell,
  Truck,
  Croissant,
  Package,
  Sparkles,
  Flame,
  Store,
  type LucideIcon,
} from '@/components/ui/icons'

type CategoryConfig = {
  icon: LucideIcon
  gradient: string
  label: string
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  restaurant: {
    icon: UtensilsCrossed,
    gradient: 'from-amber-700 to-orange-600',
    label: 'Restaurant',
  },
  private_chef: {
    icon: ChefHat,
    gradient: 'from-rose-800 to-rose-600',
    label: 'Private Chef',
  },
  caterer: {
    icon: ConciergeBell,
    gradient: 'from-teal-700 to-emerald-600',
    label: 'Caterer',
  },
  food_truck: {
    icon: Truck,
    gradient: 'from-yellow-600 to-lime-500',
    label: 'Food Truck',
  },
  bakery: {
    icon: Croissant,
    gradient: 'from-pink-600 to-rose-400',
    label: 'Bakery',
  },
  meal_prep: {
    icon: Package,
    gradient: 'from-blue-700 to-cyan-500',
    label: 'Meal Prep',
  },
  pop_up: {
    icon: Sparkles,
    gradient: 'from-purple-700 to-violet-500',
    label: 'Pop-Up',
  },
  supper_club: {
    icon: Flame,
    gradient: 'from-amber-700 to-yellow-500',
    label: 'Supper Club',
  },
}

const DEFAULT_CONFIG: CategoryConfig = {
  icon: Store,
  gradient: 'from-stone-700 to-stone-600',
  label: 'Food Business',
}

export function getCategoryConfig(businessType: string): CategoryConfig {
  return CATEGORY_MAP[businessType] || DEFAULT_CONFIG
}

export function CategoryPlaceholder({
  businessType,
  name,
}: {
  businessType: string
  name: string
}) {
  const config = getCategoryConfig(businessType)
  const Icon = config.icon

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br ${config.gradient}`}
    >
      <Icon className="h-10 w-10 text-white/80" strokeWidth={1.5} />
      <span className="mt-2 text-lg font-semibold text-white/60">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export function CategoryPill({
  businessType,
  active,
  onClick,
}: {
  businessType: string
  active: boolean
  onClick: () => void
}) {
  const config = getCategoryConfig(businessType)
  const Icon = config.icon

  return (
    <button
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'border border-stone-700/60 bg-stone-900/60 text-stone-400 hover:border-brand-600/50 hover:text-stone-200'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} />
      {config.label}
    </button>
  )
}
