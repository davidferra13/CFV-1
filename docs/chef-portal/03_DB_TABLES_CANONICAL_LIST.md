# Database Tables - Canonical List (V1)

## Tenant & Identity Tables

### `chefs`
- **Purpose**: Tenant entity
- **Key**: `id` (UUID, also tenant_id)
- **Scoping**: N/A (is the tenant)
- **RLS**: Enabled
- **Immutable**: No
- **Soft Delete**: Yes

### `user_roles`
- **Purpose**: Map users to tenants and roles
- **Key**: `id` (UUID)
- **Scoping**: Cross-tenant (by design)
- **RLS**: Enabled
- **Unique**: (user_id, tenant_id)

## Client Tables

### `client_profiles`
- **Purpose**: Client contact information
- **Key**: `id` (UUID)
- **Scoping**: `tenant_id`
- **RLS**: Enabled
- **Soft Delete**: Yes

### `client_invites`
- **Purpose**: Invite tokens for client linking
- **Key**: `id` (UUID)
- **Scoping**: `tenant_id`
- **RLS**: Enabled

## Event Tables

### `events`
- **Purpose**: Event bookings
- **Key**: `id` (UUID)
- **Scoping**: `tenant_id`
- **RLS**: Enabled
- **Soft Delete**: Yes

### `event_transitions`
- **Purpose**: Immutable lifecycle log
- **Key**: `id` (UUID)
- **Scoping**: Inherited via `event_id`
- **RLS**: Enabled
- **Immutable**: Yes (triggers prevent UPDATE/DELETE)

## Financial Tables

### `ledger_entries`
- **Purpose**: Immutable financial truth
- **Key**: `id` (UUID)
- **Scoping**: Inherited via `event_id`
- **RLS**: Enabled
- **Immutable**: Yes (triggers prevent UPDATE/DELETE)

## Menu Tables

### `menu_templates`
- **Purpose**: Reusable menu drafts
- **Key**: `id` (UUID)
- **Scoping**: `tenant_id`
- **RLS**: Enabled
- **Soft Delete**: Yes

### `event_menus`
- **Purpose**: Event-linked menus
- **Key**: `id` (UUID)
- **Scoping**: Inherited via `event_id`
- **RLS**: Enabled

### `menu_sections`
- **Purpose**: Menu sections (appetizers, mains, etc.)
- **Key**: `id` (UUID)
- **Scoping**: Inherited via menu FK
- **RLS**: Enabled

### `menu_items`
- **Purpose**: Individual menu items
- **Key**: `id` (UUID)
- **Scoping**: Inherited via section FK
- **RLS**: Enabled

Total Tables: 11 core tables
