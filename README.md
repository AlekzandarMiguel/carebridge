# CareBridge

CareBridge is a hospital capacity coordination and transfer tracking system. It is designed for situations where a patient may be rejected or delayed because a hospital is full, and staff need a clear way to find another hospital with available capacity.

The system helps sending hospitals request help, receiving hospitals triage incoming requests, coordinators monitor the network, and admins manage users, hospitals, settings, and audit logs.

## Project Purpose

Many hospital systems focus on internal records. CareBridge focuses on the coordination moment when one hospital cannot accept a patient because capacity is full. Instead of treating this as a simple patient transfer tool, it acts as a shared capacity workspace for hospitals that need to route patients safely and quickly.

## Main Features

- Landing page that explains the system idea and workflow.
- Login, signup, forgot password, and reset password pages.
- Role-based dashboards and navigation.
- Dark mode across public and authenticated pages.
- Hospital capacity management for available general, emergency, ICU, and ambulance capacity.
- Transfer request creation for rejected or capacity-limited patients.
- Suggested receiving hospitals based on matching available bed type.
- Incoming request triage for receiving staff.
- Accept, decline, reserve, start transfer, mark arrived, complete, cancel, and escalate actions.
- Patient delivery monitoring with transport team, ambulance unit, contact, ETA, location, and delivery notes.
- Coordinator command view for active network requests.
- Admin management for users, hospitals, system settings, and demo data refresh.
- Audit logs with filters for action, role, search term, and date range.
- Analytics for status distribution, urgency, case type, completion rate, and transfer activity.
- Notification alerts for recent transfer activity.

## User Roles

| Role | Main Purpose |
| --- | --- |
| Sending Staff | Create transfer requests, monitor outbound transfers, reroute declined requests, and start reserved transfers. |
| Receiving Staff | Update own hospital capacity, review incoming requests, accept or decline, reserve beds, mark arrivals, and complete transfers. |
| Coordinator | Monitor network-wide activity, use the command view, escalate requests, add coordinator notes, and view analytics. |
| Admin | Manage users, hospitals, settings, audit logs, demo data, analytics, and the command view. |

## Core Workflow

1. A sending staff user creates a transfer request because their hospital is full or cannot accept the patient.
2. CareBridge suggests receiving hospitals with matching available capacity.
3. The receiving hospital reviews the incoming request.
4. Receiving staff accepts with optional conditions or declines with a reason.
5. Accepted requests can reserve matching bed capacity.
6. Sending staff starts the transfer and records transport information.
7. Receiving staff marks patient arrival and completes the transfer.
8. Coordinators and admins can monitor, escalate, and audit the workflow.

## Tech Stack

- Laravel 12
- Laravel Sanctum
- React 19
- React Router
- Vite
- Recharts
- Axios
- PHP 8.2+
- SQLite by default for local development

## Local Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Open the app at:

```text
http://127.0.0.1:8000
```

For active frontend development, run Vite separately:

```bash
npm run dev
```

The project also includes a Composer development script:

```bash
composer run dev
```

## Demo Accounts

All seeded demo accounts use:

```text
password123
```

| Role | Email |
| --- | --- |
| Sending Staff | sarah@citygeneral.com |
| Receiving Staff | mark@stmary.com |
| Coordinator | maria@carebridge.com |
| Admin | admin@carebridge.com |

## Testing

Run the backend test suite:

```bash
php artisan test
```

Run the frontend production build:

```bash
npm run build
```

## Documentation

Full project documentation is available here:

- [Project Documentation](docs/PROJECT_DOCUMENTATION.md)

## Repository Notes

The repository intentionally excludes local secrets and generated dependencies:

- `.env`
- `vendor/`
- `node_modules/`
- `public/build/`
- test and cache output

Use `.env.example` as the starting point for local configuration.
