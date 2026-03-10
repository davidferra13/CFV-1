// Workflow Utility Functions
// Shared helpers used by the workflow engine and action handlers.

// Template interpolation: replaces {{field_name}} placeholders with context values.
export function interpolate(template: string, fields: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = fields[key]
    if (value === null || value === undefined) return ''
    return String(value)
  })
}
