import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLES,
  type PermissionLevel,
} from '@/lib/team/permissions'

function PermissionIcon({ level }: { level: PermissionLevel }) {
  if (level === 'full') {
    return (
      <svg
        className="mx-auto h-5 w-5 text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  if (level === 'view') {
    return (
      <svg
        className="mx-auto h-5 w-5 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    )
  }

  return (
    <svg
      className="mx-auto h-5 w-5 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function PermissionMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700">
                <th className="pb-3 pr-4 text-left font-medium text-stone-400">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="pb-3 px-3 text-center font-medium text-stone-400">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_KEYS.map((perm) => (
                <tr key={perm} className="border-b border-stone-800 last:border-0">
                  <td className="py-3 pr-4 text-stone-200">{PERMISSION_LABELS[perm]}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="py-3 px-3 text-center">
                      <PermissionIcon level={ROLE_PERMISSIONS[role][perm]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-6 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-400/20 ring-1 ring-emerald-400" />
            Full access
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-400/20 ring-1 ring-amber-400" />
            View only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-red-400/20 ring-1 ring-red-400" />
            No access
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
