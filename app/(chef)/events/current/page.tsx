import { redirect } from 'next/navigation'

export default function CurrentEventsRedirect() {
  redirect('/events')
}
