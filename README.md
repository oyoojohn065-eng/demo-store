# Demo Store

A local online store built with Next.js and PostgreSQL. It has a product
catalog, a shopping cart, checkout, and a password-protected admin area.
Payments support a local test mode and M-Pesa STK Push (Safaricom Daraja).

## Requirements

- Node.js 18 or newer
- A PostgreSQL database

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   Set at least `DATABASE_URL` and `ADMIN_PASSWORD`. Add the `MPESA_*` values
   when you want to accept M-Pesa payments.

3. Create the database tables and load the sample products:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

## Run

```bash
npm run dev
```

Open http://localhost:3000. The admin area is at `/admin`.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run db:seed` — load sample products
- `npm run db:studio` — open Prisma Studio to browse the database

## Payments

- **Test mode** marks orders as paid without charging anything.
- **M-Pesa** sends an STK Push prompt to the buyer's phone. It needs Daraja
  credentials in `.env` and a public callback URL (use a tunnel such as ngrok
  during local development).

## Notes

Secrets live in `.env`, which is not committed. Never put real passwords or API
keys in the repository.
