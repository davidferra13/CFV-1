export type StoryElementType =
  | 'intro'
  | 'course_note'
  | 'wine_pairing'
  | 'chef_note'
  | 'sourcing_story'
  | 'technique_note'
  | 'closing'

export interface StoryElement {
  id: string
  menuId: string
  type: StoryElementType
  title: string | null
  content: string
  dishId: string | null
  order: number
  fohOnly: boolean
  createdAt: string
}

export interface WinePairing {
  id: string
  menuId: string
  dishId: string | null
  wineName: string
  vineyard: string | null
  vintage: string | null
  notes: string | null
  pricePerBottle: number | null
  order: number
}

export interface PresentationGuide {
  menuId: string
  stories: StoryElement[]
  pairings: WinePairing[]
  serviceNotes: string | null
  printReady: boolean
}
