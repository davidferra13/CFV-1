/**
 * OpenClaw Pull Service Configuration
 * Standalone Node.js script config - no Next.js dependency.
 */
export default {
  pi: {
    host: '10.0.0.177',
    port: 8081,
    dbEndpoint: '/api/sync/database',
    timeoutMs: 600000, // 10 min - snapshot creation on busy Pi can take 3-5 min
    authToken: process.env.OPENCLAW_API_TOKEN || null,
  },
  pg: {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  },
  tempDir: 'C:/Users/david/Documents/CFv1/.openclaw-temp',
  backupDir: 'C:/Users/david/Documents/CFv1/data/openclaw-backups',
  backups: {
    latestFile: 'openclaw-latest.db',
    snapshotPrefix: 'openclaw-',
    maxSnapshots: 168,
  },
  logFile: 'C:/Users/david/Documents/CFv1/logs/openclaw-pull.log',
}
