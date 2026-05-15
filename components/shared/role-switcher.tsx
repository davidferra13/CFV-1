'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableRoles, switchRole, type AvailableRole } from '@/lib/auth/role-switching'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChefHat, User, Users, Truck, ArrowLeftRight } from 'lucide-react'

const roleIcons: Record<string, React.ElementType> = {
  chef: ChefHat,
  client: User,
  partner: Users,
  staff: Users,
  vendor: Truck,
  guest: User,
}

const roleLabels: Record<string, string> = {
  chef: 'Chef',
  client: 'Client',
  partner: 'Partner',
  staff: 'Staff',
  vendor: 'Vendor',
  guest: 'Guest',
}

export function RoleSwitcher({
  currentRole,
  availableRoleCount,
}: {
  currentRole: string
  availableRoleCount: number
}) {
  const router = useRouter()
  const [roles, setRoles] = useState<AvailableRole[]>([])
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  if (availableRoleCount <= 1) return null

  async function loadRoles() {
    if (loaded) return
    const available = await getAvailableRoles()
    setRoles(available)
    setLoaded(true)
  }

  function handleSwitch(roleId: string) {
    startTransition(async () => {
      const result = await switchRole(roleId)
      if (result.success) {
        router.push(result.homePath)
        router.refresh()
      }
    })
  }

  const Icon = roleIcons[currentRole] ?? User

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) loadRoles()
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isPending}>
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{roleLabels[currentRole] ?? currentRole}</span>
          <ArrowLeftRight className="h-3 w-3 text-stone-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Switch Role</div>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const RoleIcon = roleIcons[role.role] ?? User
          const isCurrent = role.role === currentRole
          return (
            <DropdownMenuItem
              key={role.roleId}
              onClick={() => !isCurrent && handleSwitch(role.roleId)}
              className={isCurrent ? 'bg-stone-100' : ''}
              disabled={isCurrent}
            >
              <RoleIcon className="mr-2 h-4 w-4" />
              <span>{roleLabels[role.role] ?? role.role}</span>
              {isCurrent && <span className="ml-auto text-xs text-stone-400">Active</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
