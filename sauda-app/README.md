# RMC Oil Sauda App

Phase 1: Sauda entry (Purchase + Sales) and live Pending Report, replacing the
WhatsApp/Excel/VLOOKUP chain in SAUDA_REGISTER.

## Setup

1. **Neon Postgres** - create a new database (or a new schema in your existing
   Neon project). Run the two SQL files against it, in order:
   - db/schema.sql
   - db/seed.sql (edit names/PINs and the item list first - only two sample
     items are seeded, add the rest of the SIKOF/ANA/Kirti/SSD product list)

2. **Vercel env var** - set DATABASE_URL to your Neon connection string
   (same pattern as OMS).

3. **Deploy** - push to GitHub, import into Vercel like OMS/Field Pulse.

## Roles

- **admin** (Rishabh) - full visibility, sees /pending with export
- **purchase** (Ganesh) - /purchase, books against client companies (SIKOF, ANA, Kirti, SSD)
- **sales** (each rep) - /sales, books against RMC's own parties, sees only their own bookings

Login is name + 4-digit PIN (users table) - same lightweight pattern as OMS reps.

## What's built (Phase 1)

- Purchase Sauda entry, restricted to Ganesh, with strict item-to-company mapping enforced server-side
- Sales Sauda entry, restricted per-rep to their own bookings, with inline "+ New party" (lands as pending_review until confirmed)
- Cancel flow with mandatory reason (mirrors the cancel/negative-qty pattern in the old sheet)
- Admin Pending Report - live, filterable by purchase/sales - plus one-click Excel export (mirrors your existing report columns)

## Not yet built (next phases, per our discussion)

- SIKOF confirmation/dispatch email parsing -> auto-populate purchase_sauda + dispatched_qty
- Focus ERP sales sync -> auto-populate sales_sauda.sold_qty
- Depot unloading check -> auto stock adjustment
- Outbound WhatsApp confirmation via Interakt on sauda booking
