import { EventsHubNav } from './events-hub-nav'

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <EventsHubNav />
      {children}
    </div>
  )
}
