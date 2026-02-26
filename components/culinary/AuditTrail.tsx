import React from 'react'

export type AuditTrailEntry = {
  id: string
  timestamp: string
  action: string
  user?: string
  details?: string
}

export type AuditTrailProps = {
  entries: AuditTrailEntry[]
}

const AuditTrail: React.FC<AuditTrailProps> = ({ entries }) => {
  return (
    <div>
      <h3>Audit Trail & State Transitions</h3>
      <ul>
        {entries.length === 0 ? (
          <li>No audit entries.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.action}</strong> by {entry.user || 'Unknown'} at {entry.timestamp}
              {entry.details && <div>{entry.details}</div>}
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default AuditTrail
