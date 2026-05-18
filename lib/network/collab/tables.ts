export function trustedCircleTable(db: any): any {
  return db.from('chef_trusted_circle')
}

export function handoffsTable(db: any): any {
  return db.from('chef_handoffs')
}

export function handoffRecipientsTable(db: any): any {
  return db.from('chef_handoff_recipients')
}

export function handoffEventsTable(db: any): any {
  return db.from('chef_handoff_events')
}

export function availabilitySignalsTable(db: any): any {
  return db.from('chef_availability_signals')
}

export function chefConnectionsTable(db: any): any {
  return db.from('chef_connections')
}

export function socialNotificationsTable(db: any): any {
  return db.from('chef_social_notifications')
}
