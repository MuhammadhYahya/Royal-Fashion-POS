# Bag Shop POS

Next.js + Prisma (SQLite) POS system with sales, returns, products, inventory, expenses, and printable reports.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

## Database Notes

Current schema is in `prisma/schema.prisma` and migrations are in `prisma/migrations`.

Apply migrations:

```bash
npx prisma migrate deploy
```

Generate Prisma client:

```bash
npx prisma generate
```

Seed sample data:

```bash
npx prisma db seed
```

If your local DB was created before the latest baseline migration, reset local dev DB once:

```bash
npx prisma migrate reset
```

## Stability Checklist Before Deploy

- `npm run lint` passes.
- `npm run build:web` passes on the target machine.
- `npx prisma migrate deploy` succeeds on a fresh DB.
- New sale flow works end-to-end:
  - Add products, apply discount, complete mixed payments.
  - Receipt page opens and prints.
- Return flow works end-to-end:
  - Create return from a sale.
  - Refund totals and payments validate correctly.
  - Refund receipt prints.
- Report flow works:
  - Daily, monthly, annual summary values render.
  - Daily expenses affect end-of-day balance.
  - Print/PDF generation works.
- Inventory updates and product/category CRUD operations work.
- Offline behavior check:
  - App starts without internet.
  - Sales and printing still work locally.
