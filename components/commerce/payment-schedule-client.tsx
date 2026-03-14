// Payment Schedule Client — mark paid / waive installments
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CheckCircle, XCircle } from 'lucide-react'
import { markInstallmentPaid, waiveInstallment } from '@/lib/commerce/schedule-actions'

type Installment = {
  id: string
  installment_number: number
  due_date: string
  amount_cents: number
  status: string
  sale_id: string | null
  event_id: string | null
}

type Props = {
  installments: Installment[]
}

export function PaymentScheduleClient({ installments }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleMarkPaid(installmentId: string) {
    startTransition(async () => {
      try {
        await markInstallmentPaid(installmentId)
        toast.success('Installment marked as paid')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to mark as paid')
      }
    })
  }

  function handleWaive(installmentId: string) {
    startTransition(async () => {
      try {
        await waiveInstallment(installmentId)
        toast.success('Installment waived')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to waive installment')
      }
    })
  }

  return (
    <div className="space-y-2">
      {installments.map((inst: any) => {
        const dueDate = new Date(inst.due_date + 'T12:00:00')
        const isOverdue = inst.status === 'pending' && dueDate < new Date()

        return (
          <div
            key={inst.id}
            className="flex items-center justify-between py-3 border-b border-stone-800 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div>
                <span className="text-stone-200 font-medium">
                  #{inst.installment_number} — ${((inst.amount_cents ?? 0) / 100).toFixed(2)}
                </span>
                <p className="text-stone-400 text-sm">
                  Due: {dueDate.toLocaleDateString()}
                  {isOverdue && <span className="text-red-400 ml-2">(overdue)</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  inst.status === 'paid'
                    ? 'success'
                    : inst.status === 'waived'
                      ? 'default'
                      : isOverdue
                        ? 'error'
                        : 'warning'
                }
              >
                {inst.status}
              </Badge>

              {inst.status === 'pending' && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleMarkPaid(inst.id)}
                    disabled={isPending}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Paid
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleWaive(inst.id)}
                    disabled={isPending}
                    className="text-stone-400"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Waive
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
