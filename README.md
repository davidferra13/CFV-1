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

6. Open [http://localhost:3000](http://localhost:3000)

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

See implementation plan for deployment checklist.

## License

Proprietary - All rights reserved
