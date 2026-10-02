export function resolveVerificationPort(value) {
  if (value === undefined || value === '') return 3100
  if (!/^\d+$/.test(String(value))) throw new Error('CF_VERIFY_PORT must be an integer')
  const port = Number(value)
  if (port < 1024 || port > 65535) throw new Error('CF_VERIFY_PORT must be between 1024 and 65535')
  return port
}
export function assertReadOnlyVerificationCommand(port, command) {
  if (port !== 3100 && !['status', 'snapshot', 'verify', 'assert', 'last-snapshot', 'help', '--help'].includes(command)) {
    throw new Error('Isolated verification ports only permit read-only runtime checks')
  }
}
