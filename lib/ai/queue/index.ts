// AI Task Queue — Barrel Export
// Single import point for the entire queue system.

// Types
export type {
  AiPriorityLevel,
  ApprovalTier,
  AiTaskStatus,
  LlmEndpoint,
  AiTaskDefinition,
  AiQueueItem,
  EnqueueInput,
  WorkerState,
} from './types'

export { AI_PRIORITY, OLLAMA_GUARD } from './types'

// Actions (server actions)
export {
  enqueueTask,
  claimNextTask,
  claimNextTaskForEndpoint,
  completeTask,
  failTask,
  approveTask,
  rejectTask,
  getTasksAwaitingApproval,
  getTaskHistory,
  getQueueStats,
} from './actions'

// Registry
export {
  registerTask,
  registerTasks,
  getTaskDefinition,
  listRegisteredTasks,
  isRegisteredTask,
} from './registry'

// Worker
export {
  startWorker,
  stopWorker,
  acquireInteractiveLock,
  releaseInteractiveLock,
  getWorkerState,
  isWorkerProcessing,
  isSlotBusy,
} from './worker'

// Monitor
export {
  recordMetric,
  getMonitorReport,
  writeDailySummary,
  writeTaskPerformance,
  getActiveAlerts,
  getQueueHealth,
} from './monitor'
