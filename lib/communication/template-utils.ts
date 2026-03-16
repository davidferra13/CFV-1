// Pure utility functions for template rendering.
// No 'use server', no auth, no React dependencies.
// Safe to import from tests and server actions alike.

export function renderTemplateVariables(
  template: string,
  variables: Record<string, string | null | undefined>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    result = result.replace(pattern, value ?? '')
  }
  return result
}
