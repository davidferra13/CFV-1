type QueryWithEq = {
  eq(column: string, value: unknown): any
}

type QueryWithInsert = {
  insert(values: Record<string, unknown>): any
}

type QueryWithUpsert = {
  upsert(values: Record<string, unknown>): any
}

type QueryWithUpdate = {
  update(values: Record<string, unknown>): QueryWithEq
}

type QueryWithDelete = {
  delete(): QueryWithEq
}

const COMMON_SCOPE_COLUMNS = ['tenant_id', 'chef_id'] as const

export type TenantScopeConfig<ScopeColumn extends string = string> = {
  tenantId: string | null | undefined
  scopeColumn: ScopeColumn
}

export type TenantScope<ScopeColumn extends string = string> = ReturnType<
  typeof createTenantScope<ScopeColumn>
>

function requireNonNullTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new Error('Chef account is missing tenant context. Please contact support.')
  }

  return tenantId
}

function scopeColumnsFor(scopeColumn: string): string[] {
  return Array.from(new Set([...COMMON_SCOPE_COLUMNS, scopeColumn]))
}

export function createTenantScope<ScopeColumn extends string>({
  tenantId,
  scopeColumn,
}: TenantScopeConfig<ScopeColumn>) {
  const scopedTenantId = requireNonNullTenantId(tenantId)

  function assertNoConflictingScopeValues(values: Record<string, unknown>): void {
    for (const column of scopeColumnsFor(scopeColumn)) {
      if (!Object.prototype.hasOwnProperty.call(values, column)) continue

      const value = values[column]
      if (column !== scopeColumn && value != null) {
        throw new Error(
          `Unexpected tenant scope column "${column}" for scope column "${scopeColumn}"`
        )
      }

      if (column === scopeColumn && value != null && value !== scopedTenantId) {
        throw new Error(`Conflicting tenant scope value for "${scopeColumn}"`)
      }
    }
  }

  function withoutScopeValues<TValues extends Record<string, unknown>>(values: TValues): TValues {
    assertNoConflictingScopeValues(values)

    const next = { ...values }
    for (const column of scopeColumnsFor(scopeColumn)) {
      delete next[column]
    }

    return next
  }

  function stamp<TValues extends Record<string, unknown>>(
    values: TValues
  ): TValues & Record<ScopeColumn, string> {
    return {
      ...withoutScopeValues(values),
      [scopeColumn]: scopedTenantId,
    } as TValues & Record<ScopeColumn, string>
  }

  function apply<TQuery extends QueryWithEq>(query: TQuery): ReturnType<TQuery['eq']> {
    return query.eq(scopeColumn, scopedTenantId)
  }

  function byId<TQuery extends QueryWithEq>(query: TQuery, id: string): any {
    return apply(query.eq('id', id))
  }

  function insert<TValues extends Record<string, unknown>>(
    query: QueryWithInsert,
    values: TValues
  ): any {
    return query.insert(stamp(values))
  }

  function upsert<TValues extends Record<string, unknown>>(
    query: QueryWithUpsert,
    values: TValues
  ): any {
    return query.upsert(stamp(values))
  }

  function update<TValues extends Record<string, unknown>>(
    query: QueryWithUpdate,
    values: TValues
  ): any {
    return apply(query.update(withoutScopeValues(values)))
  }

  function updateById<TValues extends Record<string, unknown>>(
    query: QueryWithUpdate,
    id: string,
    values: TValues
  ): any {
    return byId(query.update(withoutScopeValues(values)), id)
  }

  function remove(query: QueryWithDelete): any {
    return apply(query.delete())
  }

  function deleteById(query: QueryWithDelete, id: string): any {
    return byId(query.delete(), id)
  }

  return {
    tenantId: scopedTenantId,
    scopeColumn,
    apply,
    byId,
    insert,
    remove,
    stamp,
    update,
    updateById,
    upsert,
    deleteById,
  }
}

export async function requireChefTenantScope<ScopeColumn extends string>(scopeColumn: ScopeColumn) {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  return createTenantScope({ tenantId: requireNonNullTenantId(user.tenantId), scopeColumn })
}
