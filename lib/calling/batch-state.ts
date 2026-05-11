/**
 * Batch Call State Tracker
 *
 * In-memory state for multi-ingredient batch calls. Each batch call asks about
 * multiple ingredients sequentially. This module tracks which ingredient we are
 * currently asking about, and accumulates results as the vendor responds.
 *
 * Keyed by Twilio CallSid. State is ephemeral: calls are short-lived (under 5
 * minutes), and a server restart naturally clears all state. No persistence needed.
 */

export interface BatchIngredientResult {
  available: boolean | null
  price?: string
  notes?: string
}

export interface BatchCallState {
  callId: string
  vendorPhone: string
  ingredients: string[]
  currentIndex: number
  results: Map<string, BatchIngredientResult>
}

// In-memory store keyed by Twilio CallSid
const batchStates = new Map<string, BatchCallState>()

/**
 * Store batch state for a call. Overwrites any existing state for this CallSid.
 */
export function setBatchState(callSid: string, state: BatchCallState): void {
  batchStates.set(callSid, state)
}

/**
 * Retrieve batch state for a call. Returns null if no state exists (expired or
 * never created).
 */
export function getBatchState(callSid: string): BatchCallState | null {
  return batchStates.get(callSid) ?? null
}

/**
 * Advance to the next ingredient in the batch. Returns the next ingredient name,
 * or null if all ingredients have been asked about.
 */
export function advanceBatchState(callSid: string): string | null {
  const state = batchStates.get(callSid)
  if (!state) return null

  state.currentIndex += 1
  if (state.currentIndex >= state.ingredients.length) {
    return null
  }
  return state.ingredients[state.currentIndex]
}

/**
 * Record the vendor's response for the current ingredient.
 */
export function recordBatchResult(callSid: string, result: BatchIngredientResult): void {
  const state = batchStates.get(callSid)
  if (!state) return

  const currentIngredient = state.ingredients[state.currentIndex]
  if (currentIngredient) {
    state.results.set(currentIngredient, result)
  }
}

/**
 * Remove batch state for a completed or failed call. Frees memory.
 */
export function clearBatchState(callSid: string): void {
  batchStates.delete(callSid)
}

/**
 * Get the current ingredient being asked about. Returns null if state is missing
 * or index is out of bounds.
 */
export function getCurrentIngredient(callSid: string): string | null {
  const state = batchStates.get(callSid)
  if (!state) return null
  return state.ingredients[state.currentIndex] ?? null
}
