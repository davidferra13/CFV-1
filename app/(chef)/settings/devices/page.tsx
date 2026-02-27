import { requireChef } from '@/lib/auth/get-user'
import { listDevices, listStaffWithPinStatus } from '@/lib/devices/actions'
import { DeviceList } from '@/components/devices/device-list'
import { StaffPinManager } from '@/components/devices/staff-pin-manager'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function DevicesSettingsPage() {
  await requireChef()
  const [devices, staff] = await Promise.all([listDevices(), listStaffWithPinStatus()])

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Devices</h1>
          <p className="mt-0.5 text-sm text-stone-400">
            Manage kiosk devices and staff PINs for your tablets
          </p>
        </div>
      </div>

      {/* Device Fleet */}
      <section>
        <DeviceList initialDevices={devices} />
      </section>

      {/* Staff PIN Management */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-stone-100">Staff PINs</h2>
        <p className="mb-4 text-sm text-stone-400">
          Each staff member needs a unique 4-6 digit PIN to use kiosk devices. The same PIN works on
          any device for your account.
        </p>
        <StaffPinManager initialStaff={staff} />
      </section>

      {/* Kiosk Permissions Reference */}
      <section className="rounded-xl border border-stone-800 bg-stone-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-100">Kiosk Permissions</h2>
        <p className="mb-4 text-sm text-stone-400">
          Staff using kiosk devices have a strictly limited set of actions. This is enforced at the
          server level — the kiosk UI simply cannot access anything outside this list.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* What staff CAN do */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Staff CAN
            </h3>
            <ul className="space-y-2 text-sm text-stone-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                Enter their PIN to identify themselves
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                Submit new customer inquiries (name, contact, date, party size)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                Start a new inquiry after submission (form resets)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                See the business name in the header
              </li>
            </ul>
          </div>

          {/* What staff CANNOT do */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Staff CANNOT
            </h3>
            <ul className="space-y-2 text-sm text-stone-300">
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                Access the chef portal, dashboard, or any settings
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                View existing clients, inquiries, or events
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                See financial data, revenue, or pricing
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                Modify or delete any records
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                Access menus, recipes, or calendar
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                Unpair or reconfigure the device (requires long-press)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                Navigate away from the kiosk screen
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
