'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ShieldAlert, MessageSquareWarning } from 'lucide-react'

const PLAYBOOKS = [
  {
    title: 'Food Safety Incident',
    icon: AlertTriangle,
    steps: [
      'Stop service immediately and secure all affected food.',
      'Check on anyone who may be affected — prioritize their wellbeing.',
      'Document everything: what was served, when, batch/lot numbers, temperatures.',
      'Notify affected clients within 2 hours with honest, calm communication.',
      'Contact your insurance provider within 24 hours.',
      'Preserve all evidence (food samples, receipts, temp logs) for at least 30 days.',
      'Schedule a debrief within 48 hours to identify root cause and preventive measures.',
    ],
  },
  {
    title: 'Client Complaint',
    icon: MessageSquareWarning,
    steps: [
      'Acknowledge the complaint promptly — within 4 hours during business hours.',
      'Listen fully before responding. Do not get defensive.',
      'Apologize for their experience (not necessarily for fault).',
      'Offer a concrete resolution: discount, redo, refund as appropriate.',
      'Document the complaint, resolution offered, and outcome.',
      'Follow up within 48 hours to confirm satisfaction.',
      'Review internally: was this a process failure or a one-off?',
    ],
  },
  {
    title: 'Negative Public Review / PR Issue',
    icon: ShieldAlert,
    steps: [
      'Do not respond immediately. Take at least 30 minutes to compose yourself.',
      'Draft a professional, empathetic response. Have someone review it before posting.',
      'Acknowledge the concern publicly, then move the conversation private.',
      'Never argue, blame, or reveal client details publicly.',
      'If the review is factually false, document evidence and consider platform dispute options.',
      'Ask satisfied clients (who have offered) to share their honest experience.',
      'Review your service process for any patterns that could prevent future issues.',
    ],
  },
]

export function CrisisPlaybook() {
  return (
    <div className="space-y-6">
      {PLAYBOOKS.map((playbook) => {
        const Icon = playbook.icon
        return (
          <Card key={playbook.title}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-base">{playbook.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {playbook.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-700">
                    <span className="font-medium text-stone-400 shrink-0 w-5 text-right">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
