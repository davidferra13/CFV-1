export interface DiscoveryImageRef {
  src: string
  alt: string
  fallbackGradient: string
}

const TASTE_GRADIENT = 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)'
const OCCASION_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)'
const VIBE_GRADIENT = 'linear-gradient(135deg, #701a75 0%, #86198f 50%, #4a044e 100%)'
const INGREDIENT_GRADIENT = 'linear-gradient(135deg, #365314 0%, #3f6212 50%, #1a2e05 100%)'

export const DISCOVERY_CUISINE_IMAGES: Record<string, { alt: string; gradient: string }> = {
  italian: {
    alt: 'Italian cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
  },
  japanese: {
    alt: 'Japanese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
  },
  mexican: {
    alt: 'Mexican cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
  },
  french: { alt: 'French cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)' },
  chinese: {
    alt: 'Chinese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  indian: { alt: 'Indian cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)' },
  thai: { alt: 'Thai cuisine', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
  korean: { alt: 'Korean cuisine', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)' },
  mediterranean: {
    alt: 'Mediterranean cuisine',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0369a1 100%)',
  },
  american: {
    alt: 'American cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
  },
  vietnamese: {
    alt: 'Vietnamese cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
  },
  greek: { alt: 'Greek cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  spanish: {
    alt: 'Spanish cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
  },
  ethiopian: {
    alt: 'Ethiopian cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #4d7c0f 100%)',
  },
  moroccan: {
    alt: 'Moroccan cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  },
  caribbean: {
    alt: 'Caribbean cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
  },
  brazilian: {
    alt: 'Brazilian cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  },
  peruvian: {
    alt: 'Peruvian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  turkish: {
    alt: 'Turkish cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  lebanese: {
    alt: 'Lebanese cuisine',
    gradient: 'linear-gradient(135deg, #14532d 0%, #22c55e 100%)',
  },
  cajun: { alt: 'Cajun cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)' },
  southern: {
    alt: 'Southern cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
  },
  fusion: { alt: 'Fusion cuisine', gradient: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)' },
  hawaiian: {
    alt: 'Hawaiian cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #14b8a6 100%)',
  },
  filipino: {
    alt: 'Filipino cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  german: { alt: 'German cuisine', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  jamaican: {
    alt: 'Jamaican cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 100%)',
  },
  persian: {
    alt: 'Persian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
  },
  soul_food: { alt: 'Soul food', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  colombian: {
    alt: 'Colombian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  cuban: { alt: 'Cuban cuisine', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  argentinian: {
    alt: 'Argentinian cuisine',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #22d3ee 100%)',
  },
  british: {
    alt: 'British cuisine',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
  },
  african: {
    alt: 'African cuisine',
    gradient: 'linear-gradient(135deg, #365314 0%, #65a30d 100%)',
  },
  indonesian: {
    alt: 'Indonesian cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  },
  malaysian: {
    alt: 'Malaysian cuisine',
    gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)',
  },
  taiwanese: {
    alt: 'Taiwanese cuisine',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)',
  },
  bbq: { alt: 'BBQ', gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)' },
  seafood: { alt: 'Seafood', gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)' },
  vegan: { alt: 'Vegan cuisine', gradient: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)' },
}

const DISCOVERY_OCCASION_IMAGES: Record<string, { alt: string; gradient: string }> = {
  'date-night': {
    alt: 'Date night',
    gradient: 'linear-gradient(135deg, #701a75 0%, #a21caf 100%)',
  },
  'dinner-party': {
    alt: 'Dinner party',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)',
  },
  corporate: {
    alt: 'Corporate event',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
  },
  wedding: { alt: 'Wedding', gradient: 'linear-gradient(135deg, #f5f5f4 0%, #d6d3d1 100%)' },
  birthday: { alt: 'Birthday', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
  brunch: { alt: 'Brunch', gradient: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)' },
  holiday: {
    alt: 'Holiday gathering',
    gradient: 'linear-gradient(135deg, #14532d 0%, #dc2626 100%)',
  },
  casual: {
    alt: 'Casual gathering',
    gradient: 'linear-gradient(135deg, #365314 0%, #4d7c0f 100%)',
  },
  family: { alt: 'Family meal', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  anniversary: {
    alt: 'Anniversary',
    gradient: 'linear-gradient(135deg, #701a75 0%, #be185d 100%)',
  },
  graduation: { alt: 'Graduation', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' },
  'meal-prep': { alt: 'Meal prep', gradient: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)' },
  catering: { alt: 'Catering', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  'cooking-class': {
    alt: 'Cooking class',
    gradient: 'linear-gradient(135deg, #78350f 0%, #ea580c 100%)',
  },
  tasting: { alt: 'Tasting event', gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' },
}

const DISCOVERY_VIBE_IMAGES: Record<string, { alt: string; gradient: string }> = {
  romantic: {
    alt: 'Romantic dining',
    gradient: 'linear-gradient(135deg, #701a75 0%, #be185d 100%)',
  },
  cozy: { alt: 'Cozy atmosphere', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  elevated: {
    alt: 'Elevated dining',
    gradient: 'linear-gradient(135deg, #1e1e1e 0%, #374151 100%)',
  },
  adventurous: {
    alt: 'Adventurous food',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
  },
  comfort: { alt: 'Comfort food', gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)' },
  elegant: {
    alt: 'Elegant experience',
    gradient: 'linear-gradient(135deg, #1e1e1e 0%, #6b7280 100%)',
  },
  festive: {
    alt: 'Festive celebration',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #fbbf24 100%)',
  },
  rustic: { alt: 'Rustic setting', gradient: 'linear-gradient(135deg, #365314 0%, #78350f 100%)' },
  modern: { alt: 'Modern cuisine', gradient: 'linear-gradient(135deg, #1e1e1e 0%, #4b5563 100%)' },
  intimate: {
    alt: 'Intimate dining',
    gradient: 'linear-gradient(135deg, #701a75 0%, #4c1d95 100%)',
  },
}

const DISCOVERY_INGREDIENT_IMAGES: Record<string, { alt: string; gradient: string }> = {
  truffle: { alt: 'Truffle', gradient: INGREDIENT_GRADIENT },
  lobster: { alt: 'Lobster', gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' },
  wagyu: { alt: 'Wagyu beef', gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)' },
  seasonal: { alt: 'Seasonal ingredients', gradient: INGREDIENT_GRADIENT },
  citrus: { alt: 'Citrus', gradient: 'linear-gradient(135deg, #78350f 0%, #fbbf24 100%)' },
  herbs: { alt: 'Fresh herbs', gradient: INGREDIENT_GRADIENT },
  mushroom: { alt: 'Mushrooms', gradient: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)' },
  chocolate: { alt: 'Chocolate', gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)' },
  avocado: { alt: 'Avocado', gradient: 'linear-gradient(135deg, #14532d 0%, #4d7c0f 100%)' },
  salmon: { alt: 'Salmon', gradient: 'linear-gradient(135deg, #9a3412 0%, #ea580c 100%)' },
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getDiscoveryCuisineImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_CUISINE_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/cuisine/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/cuisine/_default.webp',
    alt: `${slug} cuisine`,
    fallbackGradient: TASTE_GRADIENT,
  }
}

export function getDiscoveryOccasionImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_OCCASION_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/occasion/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/occasion/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: OCCASION_GRADIENT,
  }
}

function getDiscoveryVibeImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_VIBE_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/vibe/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/vibe/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: VIBE_GRADIENT,
  }
}

function getDiscoveryIngredientImage(slug: string): DiscoveryImageRef {
  const entry = DISCOVERY_INGREDIENT_IMAGES[slug]
  if (entry) {
    return {
      src: `/discovery/ingredient/${slug}.webp`,
      alt: entry.alt,
      fallbackGradient: entry.gradient,
    }
  }
  return {
    src: '/discovery/ingredient/_default.webp',
    alt: slug.replace(/-/g, ' '),
    fallbackGradient: INGREDIENT_GRADIENT,
  }
}

const TYPE_TO_RESOLVER: Record<string, (slug: string) => DiscoveryImageRef> = {
  cuisine: getDiscoveryCuisineImage,
  food_type: getDiscoveryCuisineImage,
  craving: getDiscoveryCuisineImage,
  occasion: getDiscoveryOccasionImage,
  service: getDiscoveryOccasionImage,
  special_dining: getDiscoveryOccasionImage,
  vibe: getDiscoveryVibeImage,
  mood: getDiscoveryVibeImage,
  ingredient: getDiscoveryIngredientImage,
  culinary_signal: getDiscoveryIngredientImage,
  seasonal: getDiscoveryIngredientImage,
}

export function getDiscoveryImage(itemType: string, label: string): DiscoveryImageRef {
  const slug = slugify(label)
  const resolver = TYPE_TO_RESOLVER[itemType]
  if (resolver) return resolver(slug)
  return {
    src: '/discovery/cuisine/_default.webp',
    alt: label,
    fallbackGradient: TASTE_GRADIENT,
  }
}
