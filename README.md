# CareBridge

CareBridge is a Laravel and React application for coordinating capacity-based hospital transfers. Hospitals can publish capacity, create transfer requests, accept or decline incoming requests, reserve matching bed capacity, track active transfers, and review basic analytics.

## Tech Stack

- Laravel 12
- Laravel Sanctum token authentication
- React 19 with Vite
- Tailwind CSS package installed, with app-specific CSS in `resources/css/app.css`
- Recharts for analytics charts
- SQLite by default for local development

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
```

For local development, run:

```bash
composer run dev
```

That starts the Laravel server, queue listener, logs, and Vite dev server together.

## Demo Accounts

All seeded demo accounts use this password:

```text
password123
```

Useful accounts:

- Sending staff: `sarah@citygeneral.com`
- Receiving staff: `mark@stmary.com`
- Coordinator: `maria@carebridge.com`
- Admin: `admin@carebridge.com`

## Core Workflow

1. A hospital staff user creates a transfer request for another hospital.
2. The receiving hospital accepts or declines the request.
3. Accepted requests can be reserved by the receiving hospital.
4. Reserving a request consumes one matching bed from the receiving hospital capacity record.
5. The sending hospital starts the transfer.
6. The receiving hospital completes the transfer.
7. Each action is recorded in `transfer_logs`.

## Permissions

- Staff can see transfers involving their own hospital.
- Coordinators and admins can see all transfers.
- Only the receiving hospital, coordinators, or admins can accept, decline, reserve, and complete a transfer.
- Only the sending hospital, coordinators, or admins can start a reserved transfer.
- Users can only update their own hospital capacity unless they are a coordinator or admin.

## Tests

Run the backend test suite:

```bash
php artisan test
```

The feature tests cover transfer authorization, reservation capacity checks, capacity update permissions, and the transfer lifecycle.

## Known Next Steps

- Add user and hospital administration screens.
- Add a transfer detail page with the full status history.
- Replace polling with realtime notifications or broadcasts.
- Add browser-level frontend tests for the React workflow.
