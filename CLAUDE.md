# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RentFlow is a rental property management application for Toronto-based landlords. It manages multiple properties with different unit configurations, tracks rent payments (base rent + utilities: gas, water, hydro), and supports different user roles (admin, manager, tenant).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions)
- **State Management**: TanStack React Query
- **Routing**: React Router v7
- **Notifications**: Twilio (SMS), Resend (Email)
- **Hosting**: Netlify

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production (includes TypeScript check)
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Architecture

### Database Schema (Supabase)

Tables hierarchy:
- `profiles` - User profiles with roles (admin/manager/tenant)
- `properties` - Rental properties (house, townhouse, condo, apartment)
- `units` - Individual rental units within properties
- `leases` - Tenant-unit relationships with rent details
- `payments` - Payment records by component (base_rent, gas, water, hydro)
- `reminders` - User reminders with email/SMS notification preferences

Row Level Security enforces:
- Admins: full access
- Managers: read properties/units, manage leases/payments
- Tenants: view own lease and payments only

### Key Patterns

**Authentication Flow**: `src/contexts/AuthContext.tsx` handles Supabase auth (email/password + Google OAuth) and profile fetching.

**Data Hooks**: All Supabase queries are in `src/hooks/` using React Query. Each entity has `use[Entity]`, `useCreate[Entity]`, `useUpdate[Entity]`, `useDelete[Entity]` hooks.

**Role-Based Access**:
- Route protection via `src/components/ProtectedRoute.tsx` with `allowedRoles` prop
- UI elements conditionally rendered based on `profile.role`

**Payment Tracking**: Payments are recorded per lease, per month/year, per component (base_rent, gas, water, hydro). Dashboard aggregates expected vs collected amounts.

### File Structure

```
src/
├── components/     # Reusable UI components (Layout, Modal, etc.)
├── contexts/       # React contexts (AuthContext)
├── hooks/          # Data fetching hooks (useProperties, usePayments, etc.)
├── lib/            # Supabase client configuration
├── pages/          # Route components
└── types/          # TypeScript types (database.ts)

supabase/
├── schema.sql                      # Database schema
└── functions/
    ├── send-reminder/index.ts      # Send individual reminder (email/SMS)
    └── check-reminders/index.ts    # Cron job to process due reminders
```

## Environment Variables

Required in `.env` (frontend):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Required in Supabase Edge Function Secrets (for notifications):
```
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=your-resend-key
```

## Supabase Setup

1. Create a new Supabase project
2. Run `supabase/schema.sql` in SQL Editor
3. Enable Google OAuth in Authentication > Providers
4. Copy project URL and anon key to `.env`
5. Deploy edge functions: `supabase functions deploy send-reminder` and `supabase functions deploy check-reminders`
6. Set up secrets in Settings > Edge Functions > Secrets
7. (Optional) Set up a cron job to call `check-reminders` daily

## Deployment

Deployed on Netlify with environment variables configured in site settings. The `netlify.toml` handles SPA routing redirects.
