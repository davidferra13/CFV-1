// Front-of-House Menu customization options
// Controls which sections are visible in the rendered menu.
// Client-side state only; no persistence needed yet.

export type FOHMenuOptions = {
  showDate: boolean
  showCourseNumbers: boolean
  showBeveragePairings: boolean
  showDietaryBadges: boolean
  footerNote: string | null
  showChefAttribution: boolean
  showAllergyDisclaimer: boolean
}

export const defaultFOHMenuOptions: FOHMenuOptions = {
  showDate: true,
  showCourseNumbers: false,
  showBeveragePairings: true,
  showDietaryBadges: true,
  footerNote: null,
  showChefAttribution: true,
  showAllergyDisclaimer: true,
}
