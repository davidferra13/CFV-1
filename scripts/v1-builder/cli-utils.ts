export function parseArgs(argv = process.argv.slice(2)) {
  const args: Record<string, string | boolean> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === '--') continue
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    index += 1
  }
  return args
}

export function requireArg(args: Record<string, string | boolean>, name: string) {
  const value = args[name]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required --${name}`)
  }
  return value.trim()
}

export function printResult(result: unknown) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

export function toBoolean(value: string | boolean | undefined) {
  if (value === true) return true
  if (typeof value !== 'string') return false
  return ['1', 'true', 'yes'].includes(value.toLowerCase())
}
