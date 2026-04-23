'use server'

import { revalidatePath } from 'next/cache'
import { ensureCurrentEventServiceSimulation, loadEventServiceSimulationPanelState } from './state'
import type { ServiceSimulationPanelState } from './types'

export async function getEventServiceSimulationPanelState(
  eventId: string
): Promise<ServiceSimulationPanelState> {
  return loadEventServiceSimulationPanelState(eventId)
}

export async function simulateEventService(eventId: string): Promise<ServiceSimulationPanelState> {
  const state = await ensureCurrentEventServiceSimulation(eventId, { forceSave: true })
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/execution`)
  revalidatePath(`/events/${eventId}/documents`)
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
  return state.panelState
}
