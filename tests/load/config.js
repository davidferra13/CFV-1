// Shared configuration for all k6 load test scenarios.
// Reads from environment variables with sensible defaults for local dev.

// Base URL of the target server
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100'

// Database config (for direct auth)
export const DB_URL = __ENV.DB_URL || 'http://127.0.0.1:54321'
export const DB_ANON_KEY =
  __ENV.DB_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Agent test account
export const AGENT_EMAIL = __ENV.AGENT_EMAIL || 'agent@chefflow.test'
export const AGENT_PASSWORD = __ENV.AGENT_PASSWORD || 'AgentChefFlow!2026'

// Shared thresholds (override per-scenario as needed)
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
  http_req_failed: ['rate<0.01'], // Less than 1% errors
}

// Relaxed thresholds for stress/spike tests (finding breaking point, not pass/fail)
export const STRESS_THRESHOLDS = {
  http_req_duration: ['p(95)<2000'], // 2s under extreme load is acceptable
  http_req_failed: ['rate<0.05'], // Up to 5% errors when finding limits
}

// AI endpoint thresholds (Ollama is slow by nature)
export const AI_THRESHOLDS = {
  http_req_duration: ['p(95)<10000'], // 10s for AI responses
  http_req_failed: ['rate<0.05'], // 5% error tolerance
}

// Standard load test stages
export const LOAD_STAGES = [
  { duration: '2m', target: 20 }, // Ramp up
  { duration: '5m', target: 50 }, // Hold at 50 VUs
  { duration: '2m', target: 50 }, // Steady state
  { duration: '1m', target: 0 }, // Ramp down
]

export const STRESS_STAGES = [
  { duration: '2m', target: 50 },
  { duration: '2m', target: 100 },
  { duration: '2m', target: 200 },
  { duration: '5m', target: 200 }, // Hold at peak
  { duration: '2m', target: 0 },
]

export const SPIKE_STAGES = [
  { duration: '2m', target: 10 }, // Warm up
  { duration: '10s', target: 200 }, // Spike
  { duration: '2m', target: 200 }, // Hold spike
  { duration: '10s', target: 10 }, // Drop
  { duration: '2m', target: 10 }, // Recovery
]
