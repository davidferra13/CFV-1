export type PermissionLevel = 'full' | 'view' | 'none'

export type Role = 'owner' | 'lead_chef' | 'sous_chef' | 'prep_chef' | 'admin'

export const PERMISSION_LABELS: Record<string, string> = {
  manage_events: 'Manage events',
  edit_menus: 'Edit menus',
  view_finances: 'View finances',
  manage_clients: 'Manage clients',
  send_contracts: 'Send contracts',
  team_management: 'Team management',
  settings: 'Settings',
}

export const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS)

export const ROLE_PERMISSIONS: Record<Role, Record<string, PermissionLevel>> = {
  owner: {
    manage_events: 'full',
    edit_menus: 'full',
    view_finances: 'full',
    manage_clients: 'full',
    send_contracts: 'full',
    team_management: 'full',
    settings: 'full',
  },
  lead_chef: {
    manage_events: 'full',
    edit_menus: 'full',
    view_finances: 'full',
    manage_clients: 'full',
    send_contracts: 'full',
    team_management: 'none',
    settings: 'none',
  },
  sous_chef: {
    manage_events: 'view',
    edit_menus: 'full',
    view_finances: 'none',
    manage_clients: 'view',
    send_contracts: 'none',
    team_management: 'none',
    settings: 'none',
  },
  prep_chef: {
    manage_events: 'none',
    edit_menus: 'view',
    view_finances: 'none',
    manage_clients: 'none',
    send_contracts: 'none',
    team_management: 'none',
    settings: 'none',
  },
  admin: {
    manage_events: 'full',
    edit_menus: 'none',
    view_finances: 'full',
    manage_clients: 'full',
    send_contracts: 'full',
    team_management: 'full',
    settings: 'full',
  },
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  lead_chef: 'Lead Chef',
  sous_chef: 'Sous Chef',
  prep_chef: 'Prep Chef',
  admin: 'Admin',
}

export const ROLES: Role[] = ['owner', 'lead_chef', 'sous_chef', 'prep_chef', 'admin']
