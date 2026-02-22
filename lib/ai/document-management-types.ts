// Document Management — Shared Types
// Extracted from server action file to avoid 'use server' export restrictions.

export interface ChefFolder {
  id: string
  name: string
  parentFolderId: string | null
  color: string | null
  icon: string | null
  documentCount: number
  createdAt: string
}

export interface ChefDocument {
  id: string
  title: string
  type: string | null
  folderId: string | null
  folderName: string | null
  createdAt: string
  updatedAt: string
}
