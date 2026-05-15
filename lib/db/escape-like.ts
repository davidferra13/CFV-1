/**
 * Escapes special characters in a string for use in SQL LIKE/ILIKE patterns.
 * Prevents wildcard injection by escaping %, _, and \.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}
