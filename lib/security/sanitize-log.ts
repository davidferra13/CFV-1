/**
 * Strips control characters from a string to prevent log injection.
 * Removes newlines, carriage returns, tabs, and ANSI escape sequences
 * that could be used to forge log entries or inject terminal commands.
 */
export function sanitizeLogInput(input: string): string {
  return input
    .replace(/\x1b\[[0-9;]*m/g, '') // ANSI escape sequences
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // control chars (preserve \t \n \r for readability)
    .replace(/\r?\n/g, ' ') // collapse newlines to space (prevents log line forgery)
}
