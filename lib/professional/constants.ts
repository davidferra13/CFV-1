// Professional Development Constants
// Lives in a separate file (no 'use server') so it can be imported by client components.

export const ACHIEVE_TYPE_LABELS: Record<string, string> = {
  competition:   'Competition',
  stage:         'Stage / Internship',
  trail:         'Trail Day',
  press_feature: 'Press Feature',
  award:         'Award',
  speaking:      'Speaking Engagement',
  certification: 'Certification',
  course:        'Course / Training',
  book:          'Book / Publication',
  podcast:       'Podcast Appearance',
  other:         'Other',
}

export const GOAL_CATEGORY_LABELS: Record<string, string> = {
  technique:      'Technique',
  cuisine:        'Cuisine / Culture',
  business:       'Business Skills',
  sustainability: 'Sustainability',
  pastry:         'Pastry & Baking',
  beverage:       'Beverage / Pairing',
  nutrition:      'Nutrition',
  other:          'Other',
}
