export interface PageAnnotation {
  /** CSS selector to find the element (e.g., '[data-info="queue"]', '#invite', 'h1') */
  selector: string
  /** Short label (e.g., "Priority Queue") */
  label: string
  /** What it does */
  description: string
  /** Which side to place the label - auto-detected if omitted */
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface PageInfoEntry {
  title: string
  description: string
  features: string[]
  annotations?: PageAnnotation[]
}
