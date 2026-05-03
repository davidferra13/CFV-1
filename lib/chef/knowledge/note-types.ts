// ChefNotes types and constants (separate from 'use server' file)

export type ChefNoteType = 'journal' | 'reference'

export type ChefNote = {
  id: string
  chef_id: string
  title: string
  body: string
  note_type: ChefNoteType
  tags: string[]
  shared: boolean
  pinned: boolean
  review: boolean
  created_at: string
  updated_at: string
}

export type ChefNoteWithMeta = ChefNote & {
  linked_tip_count?: number
  attachment_count?: number
}

export const NOTE_TYPES: { value: ChefNoteType; label: string }[] = [
  { value: 'journal', label: 'Journal Entry' },
  { value: 'reference', label: 'Reference Doc' },
]
