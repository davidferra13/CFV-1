# ChefFlow V1

Private chef business operating system.

## Scope Lock

This project is governed by **CHEFFLOW_V1_SCOPE_LOCK.md**. All features, architecture decisions, and implementation details must strictly adhere to that document.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Auth + RLS + Storage)
- **Payments**: Stripe
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase account
- Stripe account

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.local.example` to `.env.local` and fill in your credentials:

   ```bash
   cp .env.local.example .env.local
   ```

4. Run database migrations (see `supabase/migrations/`)

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3100](http://localhost:3100)

### Local One-Command Bootstrap

For a full local environment (Supabase + migrations + generated types + demo users/data):

```bash
npm run local:bootstrap
```

After bootstrap:

- Chef login: `chef.demo@local.chefflow` / `ChefFlowLocal!123`
- Client login: `client.demo@local.chefflow` / `ChefFlowLocal!123`
- Public chef page: `http://localhost:3100/chef/chef-demo`
- Supabase Studio: `http://127.0.0.1:54323`

More details: `docs/LOCAL_TESTING_BOOTSTRAP.md`

## Project Structure

```
app/
├── (public)/          # Public portal (landing, pricing)
├── (chef)/            # Chef portal (tenant admin)
├── (client)/          # Client portal (customer view)
├── auth/              # Authentication pages
└── api/webhooks/      # Stripe webhook endpoint

lib/
├── supabase/          # Supabase client utilities
├── stripe/            # Stripe integration
├── ledger/            # Ledger-first financial system
├── auth/              # Auth and role resolution
└── events/            # Event lifecycle management

supabase/migrations/   # Database schema and RLS policies
```

## Non-Negotiable System Laws

1. **Multi-tenant isolation** enforced at DB layer (RLS)
2. **Roles are authoritative** (no client-side inference)
3. **Financial truth is ledger-first** (immutable ledger)
4. **Event lifecycle** is finite and server-enforced
5. **No feature expansion** beyond V1 scope
6. **Defense in depth** (middleware → layout → RLS)

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

- Web beta release gate and go/no-go checklist: `docs/web-beta-go-no-go-checklist.md`
- Web beta release architecture and timeline: `docs/web-beta-release-architecture.md`
- Beta host operations: `docs/beta-server-setup.md`
- Uptime and readiness monitoring: `docs/uptime-monitoring-setup.md`

## License

Proprietary - All rights reserved
