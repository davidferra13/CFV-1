// Google Calendar Sync - Server Action Wrappers
// Callable from client components (buttons, banners, etc.)
// All actual API work is in calendar-sync.ts.

'use server'

import {
  syncEventToGoogleCalendar,
  deleteEventFromGoogleCalendar,
  getCalendarConnection as _getCalendarConnection,
  initiateGoogleCalendarConnect as _initiateGoogleCalendarConnect,
  disconnectGoogleCalendar as _disconnectGoogleCalendar,
  type CalendarConnection,
} from './calendar-sync'

export type { CalendarConnection }

export async function syncEventToGoogle(eventId: string) {
  return syncEventToGoogleCalendar(eventId)
}

export async function deleteEventFromGoogle(eventId: string) {
  return deleteEventFromGoogleCalendar(eventId)
}

export async function getCalendarConnection() {
  return _getCalendarConnection()
}

export async function initiateGoogleCalendarConnect() {
  return _initiateGoogleCalendarConnect()
}

export async function disconnectGoogleCalendar() {
  return _disconnectGoogleCalendar()
}
