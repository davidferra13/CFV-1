/**
 * OpenClaw Pull Service Configuration
 * Standalone Node.js script config - no Next.js dependency.
 */
export default {
  pi: {
    host: '10.0.0.177',
    port: 8081,
    dbEndpoint: '/api/sync/database',
    timeoutMs: 120000, // 2 min for large DB downloads
  },
  pg: {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  tempDir: 'C:/Users/david/Documents/CFv1/.openclaw-temp',
  logFile: 'C:/Users/david/Documents/CFv1/logs/openclaw-pull.log',
}
