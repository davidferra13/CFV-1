import { US_STATES } from './constants'

export const DIRECTORY_DISCOVERABLE_STATUSES = ['discovered', 'claimed', 'verified'] as const

export function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''")
}

export function buildCanonicalStateSql(columnName: string) {
  const trimmedColumn = `btrim(${columnName})`
  const upperColumn = `upper(${trimmedColumn})`
  const lowerColumn = `lower(${trimmedColumn})`
  const cases = Object.entries(US_STATES).flatMap(([code, name]) => [
    `WHEN ${upperColumn} = '${escapeSqlLiteral(code)}' THEN '${escapeSqlLiteral(code)}'`,
    `WHEN ${lowerColumn} = '${escapeSqlLiteral(name.toLowerCase())}' THEN '${escapeSqlLiteral(code)}'`,
  ])

  return `CASE WHEN ${columnName} IS NULL THEN NULL ${cases.join(' ')} ELSE NULL END`
}

export const DIRECTORY_CANONICAL_STATE_SQL = buildCanonicalStateSql('state')
