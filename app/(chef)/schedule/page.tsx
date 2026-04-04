// Schedule Page - Redirects to unified /calendar
// The /schedule route previously had a separate FullCalendar implementation.
// All calendar functionality is now consolidated at /calendar.

import { redirect } from 'next/navigation'

export default function SchedulePage() {
  redirect('/calendar')
}
