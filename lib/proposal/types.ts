// Proposal section types for the interactive proposal system

export type SectionType = 'hero' | 'menu' | 'text' | 'gallery' | 'testimonial' | 'divider'

export type ProposalSection = {
  id: string
  quoteId: string
  sectionType: SectionType
  title: string | null
  bodyText: string | null
  photoUrl: string | null
  photoUrls: string[]
  sortOrder: number
  isVisible: boolean
}
