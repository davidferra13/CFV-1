export function validateInputClient(input: string): { allowed: boolean; reason?: string } {
  if (!input || input.trim().length === 0) {
    return { allowed: false, reason: 'empty' }
  }

  return { allowed: true }
}
