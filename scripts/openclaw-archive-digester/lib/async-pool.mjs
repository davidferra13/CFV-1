export async function mapWithConcurrency(items, concurrency, worker) {
  const limit = Math.max(1, Number.isFinite(concurrency) ? Math.floor(concurrency) : 1)
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex++
      if (currentIndex >= items.length) return
      results[currentIndex] = await worker(items[currentIndex], currentIndex)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}
