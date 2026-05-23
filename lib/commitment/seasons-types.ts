export interface Season {
  id: string
  tenantId: string
  seasonName: string
  startMonth: number
  endMonth: number
  portfolioId: string | null
  createdAt: Date
}

export function mapSeasonRow(row: Record<string, unknown>): Season {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    seasonName: row.season_name as string,
    startMonth: row.start_month as number,
    endMonth: row.end_month as number,
    portfolioId: (row.portfolio_id as string) ?? null,
    createdAt: new Date(row.created_at as string),
  }
}
