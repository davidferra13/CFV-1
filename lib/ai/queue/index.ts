// AI Task Queue - Barrel Export
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

// Actions - server actions (chef-facing, auth-gated)
export {
  enqueueTask,
  approveTask,
  rejectTask,
  getTasksAwaitingApproval,
  getTaskHistory,
  getQueueStats,
} from './actions'

// Actions - internal only (NOT server actions, for system/worker callers)
export {
  enqueueTaskInternal,
  claimNextTask,
  claimNextTaskForEndpoint,
  completeTask,
  failTask,
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
