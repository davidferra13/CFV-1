export interface HolidayClientMatch {
  clientId: string
  clientName: string
  /** Date of the event they had near this holiday last year */
  lastEventDate: string
  /** How many events this client has had total */
  totalEvents: number
}

export interface HolidayOutreachSuggestion {
  upcoming: {
    holiday: {
      key: string
      name: string
    }
    /** ISO date for cross-boundary serialization */
    date: string
    daysUntil: number
    inOutreachWindow: boolean
    isUrgent: boolean
  }
  /** Clients who had an event near this holiday in a prior year */
  pastClients: HolidayClientMatch[]
  /** Whether this holiday warrants premium pricing */
  premiumPricing: boolean
  /** Ready-to-edit outreach message hook */
  outreachHook: string
  /** Menu idea for this holiday */
  menuNotes: string
}
