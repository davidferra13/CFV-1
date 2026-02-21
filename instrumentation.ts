// Next.js Instrumentation Hook
// Runs once when the server process starts (both dev and production).
// Used to register background tasks that should run automatically — no user
// interaction required.
//
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only run in the Node.js runtime (not Edge), and only on the server.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Auto-schedule the weekly simulation quality loop.
  // This checks every 6 hours and fires the simulation if it hasn't run in 7 days.
  // Ollama must be running — if it's offline the run fails gracefully and retries next check.
  const { scheduleSimulation } = await import('./lib/simulation/auto-schedule')
  scheduleSimulation()
}
