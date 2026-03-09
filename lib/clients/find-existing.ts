/**
 * Look up an existing client by email within a tenant.
 * Returns the client ID if found, null otherwise.
 * This is a read-only check (no INSERT, no side effects).
 * Used by inquiry creation paths to auto-link when someone
 * who is already a client sends a new inquiry.
 */
export async function findExistingClientByEmail(
  supabase: any,
  tenantId: string,
  email: string
): Promise<string | null> {
  if (!email || !email.includes('@')) return null

  // Skip placeholder emails (these are never real clients)
  if (email.includes('@placeholder.chefflow')) return null
  if (email.includes('@placeholder.cheflowhq')) return null

  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('email', email.trim().toLowerCase())
    .is('deleted_at' as any, null)
    .maybeSingle()

  return data?.id ?? null
}
