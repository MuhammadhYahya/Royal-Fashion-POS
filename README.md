# Royal Fashion POS

Next.js + Prisma (SQLite) POS system with sales, returns, products, inventory, expenses, and printable reports.

## What To Share

- Source code: push this repository to GitHub.
- Desktop app: share the packaged Windows app from `release/win-unpacked/`.

Do not commit `release/` into the normal branch. The packaged app is generated output and is better shared separately as a zip or GitHub Release asset.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Run the desktop app after building:

```bash
npm run build
npm run desktop:start
```

## Shop Owner Setup

Clone the repository:

```bash
git clone https://github.com/MuhammadhYahya/Royal-Fashion-POS.git
cd Royal-Fashion-POS
```

Install dependencies:

```bash
npm install
```

Apply the database and run:

```bash
npx prisma migrate deploy
npm run build
npm run desktop:start
```

## Packaged Windows App

The current packaged desktop app is created under:

```bash
release/win-unpacked/
```

The main executable is:

```bash
release/win-unpacked/Royal Fashion.exe
```

Keep the whole `win-unpacked` folder together when sharing it.

## Change The App Icon

Replace this file and rebuild:

```bash
desktop-assets/icon.ico
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
