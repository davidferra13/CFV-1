/**
 * PostgreSQL Query Builder Compatibility Layer
 *
 * Provides a chainable query builder API backed by raw SQL via postgres.js.
 * All consumer files use this for database access.
 *
 * Supported patterns:
 *   .from('table').select('*').eq('col', val).order('col', { ascending: false }).limit(n)
 *   .from('table').select('*, related(col)') - nested selects via LEFT JOIN
 *   .from('table').select('id', { count: 'exact', head: true }) - count queries
 *   .from('table').insert({}).select().single()
 *   .from('table').update({}).eq('id', id).select()
 *   .from('table').upsert({}, { onConflict: 'col' })
 *   .from('table').delete().eq('id', id)
 *   .rpc('fn_name', { param1: val1 })
 */

import { pgClient } from '@/lib/db'

// ─── Types ───────────────────────────────────────────────────────────────────

type PostgrestError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type PostgrestResponse<T> = {
  data: T | null
  error: PostgrestError | null
  count: number | null
  status: number
  statusText: string
}

type SelectOptions = {
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
}

type OrderOptions = {
  ascending?: boolean
  nullsFirst?: boolean
  foreignTable?: string
}

type UpsertOptions = {
  onConflict?: string
  ignoreDuplicates?: boolean
  count?: 'exact'
}

// ─── SQL identifier validation ───────────────────────────────────────────────

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function assertIdent(name: string): string {
  // Allow table-qualified names like "chef_preferences.network_discoverable"
  if (name.includes('.')) {
    name.split('.').forEach((part) => {
      if (!IDENT_RE.test(part)) {
        throw new Error(`Invalid SQL identifier: ${name}`)
      }
    })
    return name
  }
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`)
  }
  return name
}

function quoteIdent(name: string): string {
  assertIdent(name)
  if (name.includes('.')) {
    return name
      .split('.')
      .map((p) => `"${p}"`)
      .join('.')
  }
  return `"${name}"`
}

// ─── Nested select parser ────────────────────────────────────────────────────
// Parses PostgREST select strings like:
//   '*, clients(full_name, email)'
//   'id, client:clients(full_name), event_date'
//   'id, name, dishes(name, description)'

type ParsedSelect = {
  mainColumns: string[] // columns from the main table
  joins: ParsedJoin[]
}

type ParsedJoin = {
  alias: string | null // e.g. 'client' in 'client:clients(full_name)'
  table: string // e.g. 'clients'
  mainColumns: string[] // direct columns selected from the joined table
  joins: ParsedJoin[] // nested joined selections from the joined table
  inner: boolean // true if !inner hint was used
  explicitFk: string | null // e.g. 'author_profile_id' in 'table!author_profile_id(*)'
}

type JoinPlan = {
  join: ParsedJoin
  sqlAlias: string
  parentTable: string
  parentAlias: string
  children: JoinPlan[]
}

function splitTopLevel(input: string): string[] {
  const tokens: string[] = []
  let depth = 0
  let current = ''

  for (const ch of input) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      const token = current.trim()
      if (token) tokens.push(token)
      current = ''
      continue
    }
    current += ch
  }

  const last = current.trim()
  if (last) tokens.push(last)
  return tokens
}

function parseSelectString(select: string): ParsedSelect {
  const mainColumns: string[] = []
  const joins: ParsedJoin[] = []

  if (!select || select.trim() === '*') {
    return { mainColumns: ['*'], joins: [] }
  }

  const tokens = splitTopLevel(select)

  for (const token of tokens) {
    // Check for nested select: table(col1, col2) or alias:table(col1, col2)
    // Also supports PostgREST FK hints: table!fk_column(cols) or table!inner(cols)
    const nestedMatch = token.match(
      /^(?:([a-zA-Z_][a-zA-Z0-9_]*):)?([a-zA-Z_][a-zA-Z0-9_]*)(?:!([a-zA-Z_][a-zA-Z0-9_]*))?\((.+)\)$/
    )
    if (nestedMatch) {
      const [, alias, table, hint, innerCols] = nestedMatch
      const nestedParsed = parseSelectString(innerCols)
      const isInner = hint === 'inner'
      // If hint is not 'inner' or 'left', treat it as an explicit FK column name
      const explicitFk = hint && hint !== 'inner' && hint !== 'left' ? hint : null
      joins.push({
        alias: alias || null,
        table,
        mainColumns: nestedParsed.mainColumns,
        joins: nestedParsed.joins,
        inner: isInner,
        explicitFk,
      })
    } else {
      mainColumns.push(token.trim())
    }
  }

  if (mainColumns.length === 0) {
    mainColumns.push('*')
  }

  return { mainColumns, joins }
}

// ─── FK resolution cache ─────────────────────────────────────────────────────
// Static FK map generated from the schema. No runtime information_schema queries.
// Regenerate with: npm run db:fk-cache

import { FK_MAP } from '@/lib/db/fk-map'

async function loadFkCache(): Promise<void> {
  // No-op: FK map is now static. Kept for call-site compatibility.
}

function resolveFkColumn(sourceTable: string, targetTable: string): string | null {
  return FK_MAP[`${sourceTable}::${targetTable}`] ?? null
}

// ─── Filter types ────────────────────────────────────────────────────────────

type Filter =
  | { type: 'eq'; column: string; value: unknown }
  | { type: 'neq'; column: string; value: unknown }
  | { type: 'gt'; column: string; value: unknown }
  | { type: 'gte'; column: string; value: unknown }
  | { type: 'lt'; column: string; value: unknown }
  | { type: 'lte'; column: string; value: unknown }
  | { type: 'like'; column: string; value: string }
  | { type: 'ilike'; column: string; value: string }
  | { type: 'is'; column: string; value: null | boolean }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'not_is'; column: string; value: null | boolean }
  | { type: 'not_in'; column: string; values: unknown[] }
  | { type: 'not_like'; column: string; value: string }
  | { type: 'contains'; column: string; value: unknown }
  | { type: 'containedBy'; column: string; value: unknown }
  | { type: 'overlaps'; column: string; value: unknown[] }
  | { type: 'or'; expression: string }
  | { type: 'match'; obj: Record<string, unknown> }
  | { type: 'filter'; column: string; operator: string; value: unknown }

// ─── Query Builder ───────────────────────────────────────────────────────────

class QueryBuilder<T = any> {
  private _table: string
  private _selectStr: string = '*'
  private _selectOpts: SelectOptions = {}
  private _filters: Filter[] = []
  private _orders: Array<{ column: string; ascending: boolean; nullsFirst?: boolean }> = []
  private _limitVal: number | null = null
  private _offsetVal: number | null = null
  private _rangeFrom: number | null = null
  private _rangeTo: number | null = null
  private _singleRow = false
  private _maybeSingle = false
  // Mutation state
  private _insertData: Record<string, unknown> | Record<string, unknown>[] | null = null
  private _updateData: Record<string, unknown> | null = null
  private _upsertData: Record<string, unknown> | Record<string, unknown>[] | null = null
  private _upsertOpts: UpsertOptions | null = null
  private _deleteMode = false
  private _returnSelect = false
  private _returnSelectStr = '*'

  constructor(table: string) {
    this._table = assertIdent(table)
  }

  // ── Select ──────────────────────────────────────────────────────────────

  select(columns?: string, options?: SelectOptions): this {
    if (columns !== undefined) this._selectStr = columns
    if (options) this._selectOpts = options
    // If called after insert/update/delete, it means "return the rows"
    if (this._insertData || this._updateData || this._upsertData || this._deleteMode) {
      this._returnSelect = true
      if (columns !== undefined) this._returnSelectStr = columns
    }
    return this
  }

  // ── Filters ─────────────────────────────────────────────────────────────

  eq(column: string, value: unknown): this {
    this._filters.push({ type: 'eq', column: assertIdent(column), value })
    return this
  }

  neq(column: string, value: unknown): this {
    this._filters.push({ type: 'neq', column: assertIdent(column), value })
    return this
  }

  gt(column: string, value: unknown): this {
    this._filters.push({ type: 'gt', column: assertIdent(column), value })
    return this
  }

  gte(column: string, value: unknown): this {
    this._filters.push({ type: 'gte', column: assertIdent(column), value })
    return this
  }

  lt(column: string, value: unknown): this {
    this._filters.push({ type: 'lt', column: assertIdent(column), value })
    return this
  }

  lte(column: string, value: unknown): this {
    this._filters.push({ type: 'lte', column: assertIdent(column), value })
    return this
  }

  like(column: string, value: string): this {
    this._filters.push({ type: 'like', column: assertIdent(column), value })
    return this
  }

  ilike(column: string, value: string): this {
    this._filters.push({ type: 'ilike', column: assertIdent(column), value })
    return this
  }

  is(column: string, value: null | boolean): this {
    this._filters.push({ type: 'is', column: assertIdent(column), value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this._filters.push({ type: 'in', column: assertIdent(column), values })
    return this
  }

  contains(column: string, value: unknown): this {
    this._filters.push({ type: 'contains', column: assertIdent(column), value })
    return this
  }

  containedBy(column: string, value: unknown): this {
    this._filters.push({ type: 'containedBy', column: assertIdent(column), value })
    return this
  }

  overlaps(column: string, value: unknown[]): this {
    this._filters.push({ type: 'overlaps', column: assertIdent(column), value })
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    const col = assertIdent(column)
    if (operator === 'is') {
      this._filters.push({ type: 'not_is', column: col, value: value as null | boolean })
    } else if (operator === 'in') {
      // PostgREST 'in' filter value may come as string '("a","b")' or as array
      let arr: unknown[]
      if (typeof value === 'string') {
        arr = value
          .replace(/^\(|\)$/g, '')
          .split(',')
          .map((s) => s.replace(/^"|"$/g, '').trim())
      } else {
        arr = value as unknown[]
      }
      this._filters.push({ type: 'not_in', column: col, values: arr })
    } else if (operator === 'like') {
      this._filters.push({ type: 'not_like', column: col, value: value as string })
    } else {
      // Generic filter fallback
      this._filters.push({ type: 'filter', column: col, operator: `not.${operator}`, value })
    }
    return this
  }

  or(expression: string): this {
    this._filters.push({ type: 'or', expression })
    return this
  }

  match(obj: Record<string, unknown>): this {
    this._filters.push({ type: 'match', obj })
    return this
  }

  filter(column: string, operator: string, value: unknown): this {
    this._filters.push({ type: 'filter', column: assertIdent(column), operator, value })
    return this
  }

  // ── Modifiers ───────────────────────────────────────────────────────────

  order(column: string, options?: OrderOptions): this {
    this._orders.push({
      column: assertIdent(column),
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst,
    })
    return this
  }

  limit(n: number): this {
    this._limitVal = n
    return this
  }

  range(from: number, to: number): this {
    this._rangeFrom = from
    this._rangeTo = to
    return this
  }

  // ── Result terminators ──────────────────────────────────────────────────

  single(): this {
    this._singleRow = true
    return this
  }

  maybeSingle(): this {
    this._maybeSingle = true
    return this
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this._insertData = data
    return this
  }

  update(data: Record<string, unknown>): this {
    this._updateData = data
    return this
  }

  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: UpsertOptions): this {
    this._upsertData = data
    this._upsertOpts = options ?? null
    return this
  }

  delete(_options?: { count?: 'exact' }): this {
    this._deleteMode = true
    if (_options?.count === 'exact') this._selectOpts.count = 'exact'
    return this
  }

  // ── Execution ───────────────────────────────────────────────────────────

  /** Make this thenable so `await db.from(...).select(...)` works */
  then<TResult1 = PostgrestResponse<any>, TResult2 = never>(
    resolve?: ((value: PostgrestResponse<any>) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(resolve, reject)
  }

  private async execute(): Promise<PostgrestResponse<any>> {
    try {
      if (this._insertData) return await this.executeInsert()
      if (this._updateData) return await this.executeUpdate()
      if (this._upsertData) return await this.executeUpsert()
      if (this._deleteMode) return await this.executeDelete()
      return await this.executeSelect()
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message, code: err.code, details: err.detail },
        count: null,
        status: 500,
        statusText: 'Internal Server Error',
      }
    }
  }

  // ── SELECT execution ────────────────────────────────────────────────────

  private async executeSelect(): Promise<PostgrestResponse<any>> {
    const parsed = parseSelectString(this._selectStr)
    const hasJoins = parsed.joins.length > 0
    const joinPlans = hasJoins
      ? this.buildJoinPlans(parsed.joins, this._table, this._table)
      : ([] as JoinPlan[])
    const relationAliases = this.buildRelationAliasMap(joinPlans)

    // Load FK cache if we have joins
    if (hasJoins) await loadFkCache()

    const params: unknown[] = []
    let paramIdx = 1

    // Build column list
    let columnsSql: string
    if (this._selectOpts.head) {
      columnsSql = '1'
    } else if (hasJoins) {
      columnsSql = this.buildJoinColumns(parsed, joinPlans)
    } else {
      columnsSql = this.buildMainColumns(parsed.mainColumns)
    }

    // Build FROM clause
    let fromSql = quoteIdent(this._table)
    if (hasJoins) {
      fromSql = this.buildJoinFrom(joinPlans)
    }

    // Build WHERE clause
    const { sql: whereSql, params: whereParams } = this.buildWhere(paramIdx, relationAliases)
    params.push(...whereParams)
    paramIdx += whereParams.length

    // Build ORDER BY
    const orderSql = this.buildOrderBy(relationAliases)

    // Build LIMIT/OFFSET
    const { limitSql, offsetSql } = this.buildLimitOffset()

    // Count query
    let count: number | null = null
    if (this._selectOpts.count === 'exact') {
      const countSql = `SELECT COUNT(*) AS "count" FROM ${fromSql}${whereSql}`
      const countResult = await pgClient.unsafe(
        countSql,
        params.slice(0, whereParams.length) as any[]
      )
      count = parseInt(countResult[0]?.count ?? '0', 10)
    }

    // Head mode returns no data
    if (this._selectOpts.head) {
      return { data: null, error: null, count, status: 200, statusText: 'OK' }
    }

    // Main query
    const sql = `SELECT ${columnsSql} FROM ${fromSql}${whereSql}${orderSql}${limitSql}${offsetSql}`
    const rows = await pgClient.unsafe(sql, params.slice(0, whereParams.length) as any[])

    // Post-process: nest joined data
    let data: any[] = hasJoins ? this.nestJoinedRows(rows, parsed) : [...rows]

    // Handle single/maybeSingle
    if (this._singleRow) {
      if (data.length === 0) {
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
          },
          count,
          status: 406,
          statusText: 'Not Acceptable',
        }
      }
      return { data: data[0], error: null, count, status: 200, statusText: 'OK' }
    }

    if (this._maybeSingle) {
      return { data: data[0] ?? null, error: null, count, status: 200, statusText: 'OK' }
    }

    return { data, error: null, count, status: 200, statusText: 'OK' }
  }

  private buildMainColumns(columns: string[]): string {
    if (columns.length === 1 && columns[0] === '*') {
      return `${quoteIdent(this._table)}.*`
    }
    return columns
      .map((c) => {
        if (c === '*') return `${quoteIdent(this._table)}.*`
        const col = c.trim()
        assertIdent(col)
        return `${quoteIdent(this._table)}.${quoteIdent(col)}`
      })
      .join(', ')
  }

  private buildJoinPlans(
    joins: ParsedJoin[],
    parentTable: string,
    parentAlias: string,
    path: string[] = []
  ): JoinPlan[] {
    return joins.map((join) => {
      const relationName = join.alias || join.table
      const currentPath = [...path, relationName]
      const sqlAlias = currentPath.join('__')

      return {
        join,
        sqlAlias,
        parentTable,
        parentAlias,
        children: this.buildJoinPlans(join.joins, join.table, sqlAlias, currentPath),
      }
    })
  }

  private buildRelationAliasMap(joinPlans: JoinPlan[]): Map<string, string> {
    const aliases = new Map<string, string>()

    const visit = (plans: JoinPlan[], path: string[] = []) => {
      for (const plan of plans) {
        const relationName = plan.join.alias || plan.join.table
        const currentPath = [...path, relationName]
        aliases.set(currentPath.join('.'), plan.sqlAlias)
        visit(plan.children, currentPath)
      }
    }

    visit(joinPlans)
    return aliases
  }

  private buildJoinColumns(parsed: ParsedSelect, joinPlans: JoinPlan[]): string {
    const parts: string[] = []

    // Main table columns
    if (parsed.mainColumns.includes('*')) {
      parts.push(`${quoteIdent(this._table)}.*`)
    } else {
      for (const col of parsed.mainColumns) {
        if (col === '*') {
          parts.push(`${quoteIdent(this._table)}.*`)
        } else {
          assertIdent(col)
          parts.push(`${quoteIdent(this._table)}.${quoteIdent(col)}`)
        }
      }
    }

    // Joined table columns - selected as JSON to preserve nesting
    for (const plan of joinPlans) {
      const alias = plan.join.alias || plan.join.table
      parts.push(`${this.buildJoinJson(plan)} AS ${quoteIdent(`__join_${alias}`)}`)
    }

    return parts.join(', ')
  }

  private buildJoinJson(plan: JoinPlan): string {
    const aliasRef = quoteIdent(plan.sqlAlias)
    const directColumns = plan.join.mainColumns.filter((column) => column !== '*')
    const hasWildcard = plan.join.mainColumns.includes('*')
    const jsonParts: string[] = []

    for (const column of directColumns) {
      assertIdent(column)
      jsonParts.push(`'${column}', ${aliasRef}.${quoteIdent(column)}`)
    }

    for (const child of plan.children) {
      jsonParts.push(`'${child.join.alias || child.join.table}', ${this.buildJoinJson(child)}`)
    }

    let jsonExpr = hasWildcard ? `to_jsonb(${aliasRef})` : `'{}'::jsonb`
    if (jsonParts.length > 0) {
      const extraExpr = `jsonb_build_object(${jsonParts.join(', ')})`
      jsonExpr = hasWildcard ? `${jsonExpr} || ${extraExpr}` : extraExpr
    }

    return `CASE WHEN ${this.buildJoinPresenceCheck(plan)} THEN NULL ELSE ${jsonExpr} END`
  }

  private buildJoinPresenceCheck(plan: JoinPlan): string {
    const candidateColumns = plan.join.mainColumns.filter((column) => column !== '*')
    const presenceColumn = candidateColumns.includes('id') ? 'id' : (candidateColumns[0] ?? 'id')
    return `${quoteIdent(plan.sqlAlias)}.${quoteIdent(presenceColumn)} IS NULL`
  }

  private buildJoinFrom(joinPlans: JoinPlan[]): string {
    let sql = quoteIdent(this._table)

    for (const plan of joinPlans) {
      sql += this.buildJoinClause(plan)
    }

    return sql
  }

  private buildJoinClause(plan: JoinPlan): string {
    const targetTable = assertIdent(plan.join.table)
    const targetRef =
      plan.sqlAlias === targetTable
        ? quoteIdent(targetTable)
        : `${quoteIdent(targetTable)} AS ${quoteIdent(plan.sqlAlias)}`
    const joinType = plan.join.inner ? 'INNER JOIN' : 'LEFT JOIN'
    const parentRef = quoteIdent(plan.parentAlias)
    const targetAliasRef = quoteIdent(plan.sqlAlias)

    let onClause: string
    if (plan.join.explicitFk) {
      const fk = assertIdent(plan.join.explicitFk)
      onClause = `${parentRef}.${quoteIdent(fk)} = ${targetAliasRef}."id"`
    } else {
      const fkCol = resolveFkColumn(plan.parentTable, targetTable)
      if (fkCol) {
        onClause = `${parentRef}.${quoteIdent(fkCol)} = ${targetAliasRef}."id"`
      } else {
        const reverseFkCol = resolveFkColumn(targetTable, plan.parentTable)
        if (reverseFkCol) {
          onClause = `${targetAliasRef}.${quoteIdent(reverseFkCol)} = ${parentRef}."id"`
        } else {
          const singularGuess = targetTable.replace(/s$/, '') + '_id'
          onClause = `${parentRef}.${quoteIdent(singularGuess)} = ${targetAliasRef}."id"`
        }
      }
    }

    let sql = ` ${joinType} ${targetRef} ON ${onClause}`
    for (const child of plan.children) {
      sql += this.buildJoinClause(child)
    }
    return sql
  }

  private nestJoinedRows(rows: any[], parsed: ParsedSelect): any[] {
    return rows.map((row) => {
      const result = { ...row }
      for (const join of parsed.joins) {
        const alias = join.alias || join.table
        const joinKey = `__join_${alias}`
        if (joinKey in result) {
          result[alias] = result[joinKey]
          delete result[joinKey]
          // If all values in the nested object are null, the join didn't match
          if (result[alias] && typeof result[alias] === 'object') {
            const allNull = Object.values(result[alias]).every((v) => v === null)
            if (allNull) result[alias] = null
          }
        }
      }
      return result
    })
  }

  // ── WHERE clause builder ────────────────────────────────────────────────

  /** Qualify a column, resolving nested relation paths when joins introduced SQL aliases. */
  private qualifyColumn(col: string, relationAliases: Map<string, string> = new Map()): string {
    if (col.includes('.')) {
      const parts = col.split('.')
      const columnName = parts.pop()!
      const relationPath = parts.join('.')
      const relationAlias = relationAliases.get(relationPath)
      if (relationAlias) {
        return `${quoteIdent(relationAlias)}.${quoteIdent(columnName)}`
      }
      return quoteIdent(col)
    }
    return `${quoteIdent(this._table)}.${quoteIdent(col)}`
  }

  private buildWhere(
    startParamIdx: number = 1,
    relationAliases: Map<string, string> = new Map()
  ): { sql: string; params: unknown[] } {
    if (this._filters.length === 0) return { sql: '', params: [] }

    const conditions: string[] = []
    const params: unknown[] = []
    let idx = startParamIdx

    for (const f of this._filters) {
      switch (f.type) {
        case 'eq':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} = $${idx++}`)
          params.push(f.value)
          break
        case 'neq':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} != $${idx++}`)
          params.push(f.value)
          break
        case 'gt':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} > $${idx++}`)
          params.push(f.value)
          break
        case 'gte':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} >= $${idx++}`)
          params.push(f.value)
          break
        case 'lt':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} < $${idx++}`)
          params.push(f.value)
          break
        case 'lte':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} <= $${idx++}`)
          params.push(f.value)
          break
        case 'like':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} LIKE $${idx++}`)
          params.push(f.value)
          break
        case 'ilike':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} ILIKE $${idx++}`)
          params.push(f.value)
          break
        case 'not_like':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} NOT LIKE $${idx++}`)
          params.push(f.value)
          break
        case 'is':
          if (f.value === null) {
            conditions.push(`${this.qualifyColumn(f.column, relationAliases)} IS NULL`)
          } else {
            conditions.push(
              `${this.qualifyColumn(f.column, relationAliases)} IS ${f.value ? 'TRUE' : 'FALSE'}`
            )
          }
          break
        case 'not_is':
          if (f.value === null) {
            conditions.push(`${this.qualifyColumn(f.column, relationAliases)} IS NOT NULL`)
          } else {
            conditions.push(
              `${this.qualifyColumn(f.column, relationAliases)} IS NOT ${f.value ? 'TRUE' : 'FALSE'}`
            )
          }
          break
        case 'in':
          if (f.values.length === 0) {
            conditions.push('FALSE')
          } else {
            const placeholders = f.values.map(() => `$${idx++}`).join(', ')
            conditions.push(`${this.qualifyColumn(f.column, relationAliases)} IN (${placeholders})`)
            params.push(...f.values)
          }
          break
        case 'not_in':
          if (f.values.length === 0) {
            conditions.push('TRUE')
          } else {
            const placeholders = f.values.map(() => `$${idx++}`).join(', ')
            conditions.push(
              `${this.qualifyColumn(f.column, relationAliases)} NOT IN (${placeholders})`
            )
            params.push(...f.values)
          }
          break
        case 'contains':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} @> $${idx++}`)
          params.push(typeof f.value === 'string' ? f.value : JSON.stringify(f.value))
          break
        case 'containedBy':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} <@ $${idx++}`)
          params.push(typeof f.value === 'string' ? f.value : JSON.stringify(f.value))
          break
        case 'overlaps':
          conditions.push(`${this.qualifyColumn(f.column, relationAliases)} && $${idx++}`)
          params.push(f.value)
          break
        case 'or':
          conditions.push(
            `(${this.parseOrExpression(f.expression, params, () => idx++, relationAliases)})`
          )
          break
        case 'match':
          for (const [key, val] of Object.entries(f.obj)) {
            conditions.push(
              `${quoteIdent(this._table)}.${quoteIdent(assertIdent(key))} = $${idx++}`
            )
            params.push(val)
          }
          break
        case 'filter': {
          // Generic filter - map PostgREST operators to SQL
          const mapped = this.mapFilterOperator(
            f.column,
            f.operator,
            f.value,
            params,
            () => idx++,
            relationAliases
          )
          if (mapped) conditions.push(mapped)
          break
        }
      }
    }

    return { sql: ` WHERE ${conditions.join(' AND ')}`, params }
  }

  /**
   * Parse PostgREST OR expression like:
   *   'id.ilike.%foo%,name.ilike.%foo%'
   *   'pinned.eq.true,created_at.gte.2024-01-01'
   */
  private parseOrExpression(
    expr: string,
    params: unknown[],
    nextIdx: () => number,
    relationAliases: Map<string, string> = new Map()
  ): string {
    const parts = expr.split(',').map((part) => part.trim())
    const sqlParts: string[] = []

    for (const part of parts) {
      const match = part.match(
        /^([a-zA-Z_][a-zA-Z0-9_.]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.(.+)$/
      )
      if (!match) continue
      const [, col, op, val] = match
      const qCol = this.qualifyColumn(assertIdent(col), relationAliases)

      switch (op) {
        case 'eq':
          sqlParts.push(`${qCol} = $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'neq':
          sqlParts.push(`${qCol} != $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'gt':
          sqlParts.push(`${qCol} > $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'gte':
          sqlParts.push(`${qCol} >= $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'lt':
          sqlParts.push(`${qCol} < $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'lte':
          sqlParts.push(`${qCol} <= $${nextIdx()}`)
          params.push(this.parseOrValue(val))
          break
        case 'like':
          sqlParts.push(`${qCol} LIKE $${nextIdx()}`)
          params.push(val)
          break
        case 'ilike':
          sqlParts.push(`${qCol} ILIKE $${nextIdx()}`)
          params.push(val)
          break
        case 'is':
          if (val === 'null') sqlParts.push(`${qCol} IS NULL`)
          else if (val === 'true') sqlParts.push(`${qCol} IS TRUE`)
          else if (val === 'false') sqlParts.push(`${qCol} IS FALSE`)
          break
        case 'in': {
          const items = val
            .replace(/^\(|\)$/g, '')
            .split(',')
            .map((s) => s.replace(/^"|"$/g, '').trim())
          const phs = items.map(() => `$${nextIdx()}`).join(', ')
          sqlParts.push(`${qCol} IN (${phs})`)
          params.push(...items)
          break
        }
        default:
          // Unsupported operator in or - skip
          console.warn(`[compat] Unsupported OR operator: ${op}`)
      }
    }

    return sqlParts.join(' OR ')
  }

  private parseOrValue(val: string): unknown {
    if (val === 'true') return true
    if (val === 'false') return false
    if (val === 'null') return null
    // Try numeric
    const num = Number(val)
    if (!isNaN(num) && val !== '') return num
    return val
  }

  private mapFilterOperator(
    column: string,
    operator: string,
    value: unknown,
    params: unknown[],
    nextIdx: () => number,
    relationAliases: Map<string, string> = new Map()
  ): string | null {
    const qCol = this.qualifyColumn(column, relationAliases)
    switch (operator) {
      case 'eq':
        params.push(value)
        return `${qCol} = $${nextIdx()}`
      case 'neq':
        params.push(value)
        return `${qCol} != $${nextIdx()}`
      case 'gt':
        params.push(value)
        return `${qCol} > $${nextIdx()}`
      case 'gte':
        params.push(value)
        return `${qCol} >= $${nextIdx()}`
      case 'lt':
        params.push(value)
        return `${qCol} < $${nextIdx()}`
      case 'lte':
        params.push(value)
        return `${qCol} <= $${nextIdx()}`
      default:
        console.warn(`[compat] Unmapped filter operator: ${operator}`)
        return null
    }
  }

  // ── ORDER BY builder ────────────────────────────────────────────────────

  private buildOrderBy(relationAliases: Map<string, string> = new Map()): string {
    if (this._orders.length === 0) return ''
    const parts = this._orders.map((o) => {
      const dir = o.ascending ? 'ASC' : 'DESC'
      const nulls =
        o.nullsFirst !== undefined ? (o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST') : ''
      return `${this.qualifyColumn(o.column, relationAliases)} ${dir}${nulls}`
    })
    return ` ORDER BY ${parts.join(', ')}`
  }

  // ── LIMIT/OFFSET builder ────────────────────────────────────────────────

  private buildLimitOffset(): { limitSql: string; offsetSql: string } {
    let limitSql = ''
    let offsetSql = ''

    if (this._rangeFrom !== null && this._rangeTo !== null) {
      const count = this._rangeTo - this._rangeFrom + 1
      limitSql = ` LIMIT ${count}`
      offsetSql = ` OFFSET ${this._rangeFrom}`
    } else {
      if (this._limitVal !== null) limitSql = ` LIMIT ${this._limitVal}`
      if (this._offsetVal !== null) offsetSql = ` OFFSET ${this._offsetVal}`
    }

    return { limitSql, offsetSql }
  }

  // ── INSERT execution ────────────────────────────────────────────────────

  private async executeInsert(): Promise<PostgrestResponse<any>> {
    const dataArr = Array.isArray(this._insertData) ? this._insertData : [this._insertData!]
    if (dataArr.length === 0) {
      return { data: [], error: null, count: null, status: 201, statusText: 'Created' }
    }

    // Get all unique column names across all rows
    const allColumns = [...new Set(dataArr.flatMap((row) => Object.keys(row)))]
    const params: unknown[] = []
    let idx = 1

    const colsSql = allColumns.map((c) => quoteIdent(assertIdent(c))).join(', ')
    const valueRows: string[] = []

    for (const row of dataArr) {
      const vals = allColumns.map((col) => {
        const val = row[col]
        if (val === undefined) return 'DEFAULT'
        params.push(this.serializeValue(val))
        return `$${idx++}`
      })
      valueRows.push(`(${vals.join(', ')})`)
    }

    const returningSql = this._returnSelect ? ` RETURNING *` : ' RETURNING *'

    const sql = `INSERT INTO ${quoteIdent(this._table)} (${colsSql}) VALUES ${valueRows.join(', ')}${returningSql}`
    const rows = await pgClient.unsafe(sql, params as any[])

    let data: any = [...rows]
    if (this._singleRow) {
      data = rows[0] ?? null
      if (!data) {
        return {
          data: null,
          error: { message: 'Row not returned after insert' },
          count: null,
          status: 500,
          statusText: 'Error',
        }
      }
    } else if (this._maybeSingle) {
      data = rows[0] ?? null
    }

    return { data, error: null, count: rows.length, status: 201, statusText: 'Created' }
  }

  // ── UPDATE execution ────────────────────────────────────────────────────

  private async executeUpdate(): Promise<PostgrestResponse<any>> {
    const data = this._updateData!
    const setCols = Object.entries(data)
    if (setCols.length === 0) {
      return { data: [], error: null, count: 0, status: 200, statusText: 'OK' }
    }

    const params: unknown[] = []
    let idx = 1

    const setParts = setCols.map(([col, val]) => {
      params.push(this.serializeValue(val))
      return `${quoteIdent(assertIdent(col))} = $${idx++}`
    })

    const { sql: whereSql, params: whereParams } = this.buildWhere(idx)
    params.push(...whereParams)

    const returningSql = this._returnSelect ? ' RETURNING *' : ''

    const sql = `UPDATE ${quoteIdent(this._table)} SET ${setParts.join(', ')}${whereSql}${returningSql}`
    const rows = await pgClient.unsafe(sql, params as any[])

    let result: any = [...rows]
    if (this._singleRow) {
      result = rows[0] ?? null
    } else if (this._maybeSingle) {
      result = rows[0] ?? null
    }

    return { data: result, error: null, count: rows.length, status: 200, statusText: 'OK' }
  }

  // ── UPSERT execution ───────────────────────────────────────────────────

  private async executeUpsert(): Promise<PostgrestResponse<any>> {
    const dataArr = Array.isArray(this._upsertData) ? this._upsertData : [this._upsertData!]
    if (dataArr.length === 0) {
      return { data: [], error: null, count: null, status: 201, statusText: 'Created' }
    }

    const allColumns = [...new Set(dataArr.flatMap((row) => Object.keys(row)))]
    const params: unknown[] = []
    let idx = 1

    const colsSql = allColumns.map((c) => quoteIdent(assertIdent(c))).join(', ')
    const valueRows: string[] = []

    for (const row of dataArr) {
      const vals = allColumns.map((col) => {
        const val = row[col]
        if (val === undefined) return 'DEFAULT'
        params.push(this.serializeValue(val))
        return `$${idx++}`
      })
      valueRows.push(`(${vals.join(', ')})`)
    }

    const conflictTarget = this._upsertOpts?.onConflict
      ? `(${this._upsertOpts.onConflict
          .split(',')
          .map((c) => quoteIdent(assertIdent(c.trim())))
          .join(', ')})`
      : '(id)'

    let conflictAction: string
    if (this._upsertOpts?.ignoreDuplicates) {
      conflictAction = 'DO NOTHING'
    } else {
      const updateCols = allColumns
        .filter((c) => {
          const conflictCols = (this._upsertOpts?.onConflict ?? 'id')
            .split(',')
            .map((s) => s.trim())
          return !conflictCols.includes(c)
        })
        .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
        .join(', ')
      conflictAction = updateCols ? `DO UPDATE SET ${updateCols}` : 'DO NOTHING'
    }

    const sql = `INSERT INTO ${quoteIdent(this._table)} (${colsSql}) VALUES ${valueRows.join(', ')} ON CONFLICT ${conflictTarget} ${conflictAction} RETURNING *`
    const rows = await pgClient.unsafe(sql, params as any[])

    let data: any = [...rows]
    if (this._singleRow) data = rows[0] ?? null
    else if (this._maybeSingle) data = rows[0] ?? null

    return { data, error: null, count: rows.length, status: 201, statusText: 'Created' }
  }

  // ── DELETE execution ────────────────────────────────────────────────────

  private async executeDelete(): Promise<PostgrestResponse<any>> {
    const params: unknown[] = []
    const { sql: whereSql, params: whereParams } = this.buildWhere(1)
    params.push(...whereParams)

    const returningSql = this._returnSelect ? ' RETURNING *' : ''

    const sql = `DELETE FROM ${quoteIdent(this._table)}${whereSql}${returningSql}`
    const rows = await pgClient.unsafe(sql, params as any[])

    let data: any = this._returnSelect ? [...rows] : null
    if (this._singleRow && data) data = rows[0] ?? null
    else if (this._maybeSingle && data) data = rows[0] ?? null

    return { data, error: null, count: rows.length, status: 200, statusText: 'OK' }
  }

  // ── Value serialization ─────────────────────────────────────────────────

  private serializeValue(val: unknown): unknown {
    if (val === null || val === undefined) return null
    // Arrays of objects are JSONB columns - must be JSON-stringified.
    // Arrays of primitives (string[], int[]) are native PostgreSQL arrays - pass through.
    if (Array.isArray(val)) {
      const hasObjects = val.length > 0 && typeof val[0] === 'object' && val[0] !== null
      // hasObjects = JSONB column, JSON-stringify. Empty [] = native text[] column, pass through.
      if (hasObjects) return JSON.stringify(val)
      return val
    }
    if (typeof val === 'object' && !(val instanceof Date)) return JSON.stringify(val)
    return val
  }
}

// ─── RPC Builder ─────────────────────────────────────────────────────────────

class RpcBuilder {
  private _fn: string
  private _params: Record<string, unknown>
  private _singleRow = false
  private _maybeSingle = false

  constructor(fn: string, params: Record<string, unknown>) {
    this._fn = assertIdent(fn)
    this._params = params
  }

  single(): this {
    this._singleRow = true
    return this
  }

  maybeSingle(): this {
    this._maybeSingle = true
    return this
  }

  // Allow chaining select() for RPC (some code does rpc().select())
  select(_columns?: string, _options?: SelectOptions): this {
    return this
  }

  then<TResult1 = PostgrestResponse<any>, TResult2 = never>(
    resolve?: ((value: PostgrestResponse<any>) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(resolve, reject)
  }

  private async execute(): Promise<PostgrestResponse<any>> {
    try {
      const paramEntries = Object.entries(this._params)
      const paramNames = paramEntries.map(([k], i) => `${assertIdent(k)} := $${i + 1}`).join(', ')
      const paramValues = paramEntries.map(([, v]) => {
        if (v === null || v === undefined) return null
        if (typeof v === 'object') return JSON.stringify(v)
        return v
      })

      const sql = `SELECT * FROM ${quoteIdent(this._fn)}(${paramNames})`
      const rows = await pgClient.unsafe(sql, paramValues as any[])

      let data: any = [...rows]
      if (this._singleRow) data = rows[0] ?? null
      else if (this._maybeSingle) data = rows[0] ?? null

      return { data, error: null, count: rows.length, status: 200, statusText: 'OK' }
    } catch (err: any) {
      return {
        data: null,
        error: { message: err.message, code: err.code },
        count: null,
        status: 500,
        statusText: 'Error',
      }
    }
  }
}

// ─── Auth compat (stub for remaining auth.* calls) ───────────────────────────

class AuthAdminCompat {
  async getUserById(userId: string) {
    try {
      const rows = await pgClient`
        SELECT id, email, raw_user_meta_data, raw_app_meta_data, created_at, last_sign_in_at, email_confirmed_at
        FROM auth.users
        WHERE id = ${userId}
      `
      if (rows.length === 0) {
        return { data: { user: null }, error: { message: 'User not found' } }
      }
      const row = rows[0]
      return {
        data: {
          user: {
            id: row.id,
            email: row.email,
            user_metadata: row.raw_user_meta_data ?? {},
            app_metadata: row.raw_app_meta_data ?? {},
            created_at: row.created_at,
            last_sign_in_at: row.last_sign_in_at,
            email_confirmed_at: row.email_confirmed_at,
          },
        },
        error: null,
      }
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } }
    }
  }

  async updateUserById(
    userId: string,
    opts: {
      password?: string
      email?: string
      email_confirm?: boolean
      user_metadata?: Record<string, unknown>
    }
  ) {
    try {
      const bcrypt = await import('bcryptjs')
      const updates: string[] = []
      const params: unknown[] = []

      if (opts.password) {
        const hash = await bcrypt.hash(opts.password, 10)
        updates.push(`encrypted_password = $${params.length + 1}`)
        params.push(hash)
      }
      if (opts.email) {
        updates.push(`email = $${params.length + 1}`)
        params.push(opts.email.toLowerCase())
      }
      if (opts.email_confirm) {
        updates.push(`email_confirmed_at = $${params.length + 1}`)
        params.push(new Date().toISOString())
      }
      if (opts.user_metadata) {
        updates.push(`raw_user_meta_data = $${params.length + 1}`)
        params.push(JSON.stringify(opts.user_metadata))
      }
      if (updates.length === 0) return { data: { user: { id: userId } }, error: null }

      updates.push(`updated_at = NOW()`)
      params.push(userId)
      await pgClient.unsafe(
        `UPDATE auth.users SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params as any[]
      )
      return { data: { user: { id: userId } }, error: null }
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } }
    }
  }

  async createUser(opts: {
    email: string
    password?: string
    email_confirm?: boolean
    user_metadata?: Record<string, unknown>
  }) {
    try {
      const bcrypt = await import('bcryptjs')
      const crypto = await import('crypto')
      const id = crypto.randomUUID()
      const hash = opts.password ? await bcrypt.hash(opts.password, 10) : null

      await pgClient`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
        VALUES (
          ${id},
          ${opts.email.toLowerCase()},
          ${hash},
          ${opts.email_confirm ? new Date().toISOString() : null},
          ${JSON.stringify(opts.user_metadata ?? {})},
          'authenticated',
          'authenticated',
          NOW(),
          NOW()
        )
      `
      return {
        data: {
          user: { id, email: opts.email.toLowerCase(), user_metadata: opts.user_metadata ?? {} },
        },
        error: null,
      }
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } }
    }
  }

  async deleteUser(userId: string) {
    try {
      await pgClient`DELETE FROM auth.users WHERE id = ${userId}`
      return { data: null, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }

  async listUsers(opts?: { page?: number; perPage?: number }) {
    try {
      const page = opts?.page ?? 1
      const perPage = opts?.perPage ?? 50
      const offset = (page - 1) * perPage

      const rows = await pgClient`
        SELECT id, email, raw_user_meta_data, raw_app_meta_data, created_at, last_sign_in_at
        FROM auth.users
        ORDER BY created_at DESC
        LIMIT ${perPage} OFFSET ${offset}
      `
      const users = rows.map((r: any) => ({
        id: r.id,
        email: r.email,
        user_metadata: r.raw_user_meta_data ?? {},
        app_metadata: r.raw_app_meta_data ?? {},
        created_at: r.created_at,
        last_sign_in_at: r.last_sign_in_at,
      }))
      return { data: { users }, error: null }
    } catch (err: any) {
      return { data: { users: [] }, error: { message: err.message } }
    }
  }
}

class AuthCompat {
  admin = new AuthAdminCompat()

  async getUser() {
    // Auth is handled by Auth.js now. This stub exists for compatibility
    // with code that hasn't been updated yet.
    console.warn('[compat] db.auth.getUser() called - use Auth.js auth() instead')
    return { data: { user: null }, error: { message: 'Use Auth.js auth() instead' } }
  }

  async signInWithPassword(_opts: { email: string; password: string }) {
    console.warn('[compat] db.auth.signInWithPassword() called - use Auth.js signIn() instead')
    return {
      data: { user: null, session: null },
      error: { message: 'Use Auth.js signIn() instead' },
    }
  }
}

// ─── Storage compat (local filesystem via lib/storage/) ──────────────────────
//
// IMPORTANT: Do NOT add a top-level `import * as localStorage from '@/lib/storage'` here.
// The storage module uses Node.js `path` which crashes the edge runtime that
// bundles middleware.ts. All storage access must go through the lazy getter below.

type StorageModule = typeof import('@/lib/storage')

let _storageModule: StorageModule | null = null

async function getStorageModule(): Promise<StorageModule> {
  if (!_storageModule) {
    _storageModule = await import('@/lib/storage')
  }
  return _storageModule
}

class StorageBucketCompat {
  private _bucket: string

  constructor(bucket: string) {
    this._bucket = bucket
  }

  async upload(
    filePath: string,
    file: Blob | Buffer | ArrayBuffer,
    options?: { contentType?: string; upsert?: boolean }
  ) {
    try {
      const storage = await getStorageModule()
      const result = await storage.upload(this._bucket, filePath, file as any, options)
      return { data: { path: result ? result.path : filePath }, error: null }
    } catch (err) {
      return { data: null, error: { message: (err as any).message || 'Upload failed' } }
    }
  }

  async remove(paths: string[]) {
    try {
      const storage = await getStorageModule()
      const results = await storage.remove(this._bucket, paths)
      return { data: results, error: null }
    } catch (err) {
      return { data: null, error: { message: (err as any).message || 'Remove failed' } }
    }
  }

  async createSignedUrl(filePath: string, expiresIn: number) {
    try {
      const storage = await getStorageModule()
      const signedUrl = storage.getSignedUrl(this._bucket, filePath, expiresIn)
      return { data: { signedUrl }, error: null }
    } catch (err) {
      return { data: null, error: { message: (err as any).message || 'Signed URL failed' } }
    }
  }

  async createSignedUrls(paths: string[], expiresIn: number) {
    const storage = await getStorageModule()
    return {
      data: paths.map((p) => ({
        path: p,
        signedUrl: storage.getSignedUrl(this._bucket, p, expiresIn),
        error: null,
      })),
      error: null,
    }
  }

  async getPublicUrl(filePath: string) {
    const storage = await getStorageModule()
    return { data: { publicUrl: storage.getPublicUrl(this._bucket, filePath) } }
  }

  async list(
    prefix?: string,
    options?: { limit?: number; offset?: number; sortBy?: { column: string; order: string } }
  ) {
    try {
      const storage = await getStorageModule()
      const data = await storage.list(this._bucket, prefix, options)
      return { data, error: null }
    } catch (err) {
      return { data: [], error: { message: (err as any).message || 'List failed' } }
    }
  }

  async download(filePath: string) {
    try {
      const storage = await getStorageModule()
      const data = await storage.download(this._bucket, filePath)
      if (!data) return { data: null, error: { message: 'File not found' } }
      return { data: new Blob([new Uint8Array(data)]), error: null }
    } catch (err) {
      return { data: null, error: { message: (err as any).message || 'Download failed' } }
    }
  }
}

class StorageCompat {
  from(bucket: string): StorageBucketCompat {
    return new StorageBucketCompat(bucket)
  }

  async createBucket(
    name: string,
    options?: { public?: boolean; fileSizeLimit?: number; allowedMimeTypes?: string[] }
  ) {
    const storage = await getStorageModule()
    return storage.createBucket(name, options)
  }

  async listBuckets() {
    const storage = await getStorageModule()
    return storage.listBuckets()
  }
}

// ─── Compat Client ───────────────────────────────────────────────────────────

export type CompatClient = {
  from: (table: string) => QueryBuilder
  rpc: (fn: string, params?: Record<string, unknown>) => RpcBuilder
  auth: AuthCompat
  storage: StorageCompat
}

export function createCompatClient(): CompatClient {
  return {
    from(table: string) {
      return new QueryBuilder(table)
    },
    rpc(fn: string, params: Record<string, unknown> = {}) {
      return new RpcBuilder(fn, params)
    },
    auth: new AuthCompat(),
    storage: new StorageCompat(),
  }
}
