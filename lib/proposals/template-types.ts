export type ProposalTemplate = {
  id: string
  chefId: string
  name: string
  coverPhotoUrl: string | null
  description: string | null
  defaultMenuId: string | null
  basePriceCents: number
  includedServices: string[] | Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}
