export async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    return await fn()
  } finally {
    console.log(`[perf] ${label}: ${(performance.now() - start).toFixed(1)}ms`)
  }
}
