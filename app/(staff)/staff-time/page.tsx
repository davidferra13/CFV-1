import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { TimeTracker } from '@/components/staffing/TimeTracker'
import {
  getDefaultStaffingWindow,
  getStaffPortalTimeTrackerData,
} from '@/lib/staff/staffing-actions'

export const metadata: Metadata = { title: 'Time Tracking' }

export default async function StaffTimePage() {
  const user = await requireStaff()
  const window = await getDefaultStaffingWindow()

  const trackerData = await getStaffPortalTimeTrackerData(window.startDate, window.endDate).catch(
    () => ({
      startDate: window.startDate,
      endDate: window.endDate,
      staff: [],
      events: [],
      entries: [],
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Time</h1>
        <p className="text-stone-500 mt-1">Clock in and out for assigned events and prep shifts.</p>
      </div>

      <TimeTracker initialData={trackerData} lockedStaffMemberId={user.staffMemberId} />
    </div>
  )
}
