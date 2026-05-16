export type ServiceIntentPage = {
  slug: string
  label: string
  seoTitle: string
  metaDescription: string
  h1: string
  serviceType: string
  consumerPromise: string
  bestFor: string[]
  queryExamples: string[]
}

export const SERVICE_INTENT_PAGES: ServiceIntentPage[] = [
  {
    slug: 'private-chef',
    label: 'Private Chef',
    seoTitle: 'Private Chef Near You',
    metaDescription:
      'Find private chefs near you for dinners, parties, and chef-led events. Browse live ChefFlow profiles or start one booking request.',
    h1: 'Find a private chef near you.',
    serviceType: 'private_dinner',
    consumerPromise:
      'Use this page when you want a chef for an at-home meal, tasting menu, anniversary, birthday, or hosted dinner.',
    bestFor: ['At-home dinners', 'Anniversaries', 'Tasting menus', 'Hosted gatherings'],
    queryExamples: ['private chef near me', 'hire a private chef', 'personal chef for dinner'],
  },
  {
    slug: 'dinner-party-chef',
    label: 'Dinner Party Chef',
    seoTitle: 'Dinner Party Chef for Private Events',
    metaDescription:
      'Browse chefs for dinner parties, tasting menus, birthdays, anniversaries, and private group meals on ChefFlow.',
    h1: 'Book a chef for a dinner party.',
    serviceType: 'private_dinner',
    consumerPromise:
      'Dinner party searches route to chefs who publish private dinner or event services, then let you compare profile details before sending an inquiry.',
    bestFor: ['Dinner parties', 'Birthdays', 'Small celebrations', 'Private group meals'],
    queryExamples: ['dinner party chef', 'chef for birthday dinner', 'chef for anniversary dinner'],
  },
  {
    slug: 'catering',
    label: 'Catering',
    seoTitle: 'Private Chef Catering Near You',
    metaDescription:
      'Find chefs and caterers for staffed events, drop-off catering, receptions, and group meals through ChefFlow.',
    h1: 'Find catering and chef-led event service.',
    serviceType: 'catering',
    consumerPromise:
      'Catering pages only count chefs who have published catering as a service tag in the public directory.',
    bestFor: ['Receptions', 'Staffed events', 'Drop-off meals', 'Family gatherings'],
    queryExamples: ['catering near me', 'private chef catering', 'event catering chef'],
  },
  {
    slug: 'meal-prep',
    label: 'Meal Prep',
    seoTitle: 'Meal Prep Chef Near You',
    metaDescription:
      'Find private chefs offering meal prep, household cooking, and recurring chef service through live ChefFlow profiles.',
    h1: 'Find a meal prep chef.',
    serviceType: 'meal_prep',
    consumerPromise:
      'Meal prep searches route to chefs who publish household cooking or meal prep service details.',
    bestFor: ['Weekly meals', 'Household cooking', 'Dietary planning', 'Recurring support'],
    queryExamples: ['meal prep chef near me', 'personal chef meal prep', 'weekly private chef'],
  },
  {
    slug: 'cooking-classes',
    label: 'Cooking Classes',
    seoTitle: 'Private Cooking Classes Near You',
    metaDescription:
      'Browse chefs offering private cooking classes, group lessons, and team cooking sessions through ChefFlow.',
    h1: 'Find private cooking classes.',
    serviceType: 'cooking_class',
    consumerPromise:
      'Cooking class pages connect searchers to chefs who explicitly publish lessons or group class services.',
    bestFor: ['Private lessons', 'Group classes', 'Team sessions', 'Date nights'],
    queryExamples: ['cooking classes near me', 'private cooking class', 'chef cooking lesson'],
  },
  {
    slug: 'wedding-chef',
    label: 'Wedding Chef',
    seoTitle: 'Wedding Chef and Private Event Catering',
    metaDescription:
      'Find chefs for rehearsal dinners, wedding weekends, receptions, and private celebration meals on ChefFlow.',
    h1: 'Find a chef for wedding events.',
    serviceType: 'wedding',
    consumerPromise:
      'Wedding searches route to published wedding or event-service tags and fall back to the booking request path when local tagged supply is thin.',
    bestFor: ['Rehearsal dinners', 'Wedding weekends', 'Receptions', 'Family celebrations'],
    queryExamples: ['wedding chef', 'rehearsal dinner chef', 'private chef wedding catering'],
  },
  {
    slug: 'corporate-dining',
    label: 'Corporate Dining',
    seoTitle: 'Corporate Dining and Private Chef Service',
    metaDescription:
      'Find chefs for office meals, client dinners, executive dining, retreats, and team events through ChefFlow.',
    h1: 'Find chefs for corporate dining.',
    serviceType: 'corporate',
    consumerPromise:
      'Corporate dining pages route to live chef profiles that publish business, team, or event dining services.',
    bestFor: ['Client dinners', 'Office meals', 'Team retreats', 'Executive dining'],
    queryExamples: [
      'corporate dining chef',
      'office catering chef',
      'private chef for team dinner',
    ],
  },
]

export function getServiceIntentPage(slug: string) {
  return SERVICE_INTENT_PAGES.find((page) => page.slug === slug) ?? null
}
