// Menu Builder Chef-Grade Workspace Types
// Drag-drop ordering, section management, builder preferences

export interface MenuSection {
  id: string
  menuId: string
  title: string
  description: string | null
  order: number
  collapsed: boolean
  dishes: SectionDish[]
}

export interface SectionDish {
  id: string
  sectionId: string
  recipeId: string | null
  customTitle: string
  description: string | null
  price: number | null
  order: number
  tags: string[]
}

export interface BuilderState {
  id: string
  tenantId: string
  menuId: string
  viewMode: 'edit' | 'preview' | 'print'
  showPrices: boolean
  showDescriptions: boolean
  showAllergens: boolean
  expandedSections: string[]
  lastSavedAt: string
}

export interface MenuBuilderTemplate {
  id: string
  tenantId: string
  name: string
  sections: { title: string; description: string | null }[]
  createdAt: string
}
