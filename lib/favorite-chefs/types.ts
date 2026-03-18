// Favorite Chefs - Shared Types
// Extracted from server action file to avoid 'use server' export restrictions.

export type FavoriteChef = {
  id: string
  chefId: string
  chefName: string
  reason: string | null
  imageUrl: string | null
  websiteUrl: string | null
  sortOrder: number
  createdAt: string
}

export type CreateFavoriteChefInput = {
  chefName: string
  reason?: string
  imageUrl?: string | ''
  websiteUrl?: string | ''
}

export type UpdateFavoriteChefInput = {
  chefName?: string
  reason?: string | null
  imageUrl?: string | '' | null
  websiteUrl?: string | '' | null
}
