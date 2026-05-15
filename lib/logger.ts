// Re-export shim: canonical location is lib/monitoring/logger.ts
export { createLogger, log, pinoLogger, sanitize } from './monitoring/logger'
export type { LogLevel, LogEntry, LogContext } from './monitoring/logger'
