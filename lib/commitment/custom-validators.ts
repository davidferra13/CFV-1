type ValidatorFn = (tenantId: string, context: Record<string, unknown>) => Promise<boolean>

const registry = new Map<string, ValidatorFn>()

export function registerValidator(id: string, fn: ValidatorFn) {
  registry.set(id, fn)
}

export function getValidator(id: string): ValidatorFn | undefined {
  return registry.get(id)
}

export async function runValidator(
  id: string,
  tenantId: string,
  context: Record<string, unknown>
): Promise<boolean> {
  const fn = registry.get(id)
  if (!fn) return true
  return fn(tenantId, context)
}
