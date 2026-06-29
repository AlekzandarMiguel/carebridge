# CareBridge

CareBridge is a hospital capacity coordination and transfer tracking system. It is designed for situations where a patient may be rejected or delayed because a hospital is full, and staff need a clear way to find another hospital with available capacity.

The system helps sending hospitals request help, receiving hospitals triage incoming requests, coordinators monitor the network, and admins manage users, hospitals, settings, and audit logs.

## Project Purpose

Many hospital systems focus on internal records. CareBridge focuses on the coordination moment when one hospital cannot accept a patient because capacity is full. Instead of treating this as a simple patient transfer tool, it acts as a shared capacity workspace for hospitals that need to route patients safely and quickly.

## Use Case Scenario

A patient arrives at a hospital needing urgent care, but the hospital is already full. There are no available beds, and the staff cannot safely admit another patient.

Without CareBridge, the patient or staff may need to look for another hospital manually. This can mean calling different hospitals one by one, waiting for confirmation, repeating the patient's situation, and hoping the available bed information is still accurate. This creates stress, delay, and uncertainty.

With CareBridge, staff can create a request in the system. CareBridge shows which hospital can accept the patient based on available capacity, such as emergency beds, ICU beds, or general beds. The receiving hospital can accept, decline, or reserve the needed capacity directly in the system.

Because of this, the hassle of manually searching for another hospital is reduced. The patient does not have to keep looking for an available hospital, and staff can quickly coordinate with a hospital that has space.

## Main Features

- Landing page that explains the system idea and workflow.
- Login, signup, forgot password, and reset password pages.
- Signup requests require admin approval before the account can sign in.
- Role-based dashboards and navigation.
- Dark mode across public and authenticated pages.
- Hospital capacity management for available general, emergency, ICU, and ambulance capacity.
- Transfer request creation for rejected or capacity-limited patients.
- Privacy confirmation and handoff document checklist during request creation.
- Suggested receiving hospitals based on matching available bed type.
- Incoming request triage for receiving staff.
- Accept, decline, reserve, start transfer, mark arrived, complete, cancel, and escalate actions.
- Patient delivery monitoring with transport team, ambulance unit, contact, ETA, location, and delivery notes.
- Coordinator command view for active network requests.
- Admin management for users, account approval, hospitals, system settings, and demo data refresh.
- Audit logs with filters, CSV export, action, role, search term, and date range.
- Transfer tracking filters, global search, and CSV export for monitor roles.
- Analytics for status distribution, urgency, case type, rejection reasons, completion rate, and transfer activity.
- Notification alerts for recent transfer activity.
- Expired reservations automatically release reserved capacity back to the receiving hospital.

## User Roles

| Role | Main Purpose |
| --- | --- |
| Sending Staff | Create transfer requests, monitor outbound transfers, reroute declined requests, and start reserved transfers. |
| Receiving Staff | Update own hospital capacity, review incoming requests, accept or decline, reserve beds, mark arrivals, and complete transfers. |
| Coordinator | Monitor network-wide activity, use the command view, escalate requests, add coordinator notes, and view analytics. |
| Admin | Manage users, hospitals, settings, audit logs, demo data, analytics, and the command view. |

## Core Workflow

1. A sending staff user creates a transfer request because their hospital is full or cannot accept the patient.
2. CareBridge suggests hospitals with matching available capacity.
3. The receiving hospital reviews the incoming request.
4. Receiving staff accepts with optional conditions or declines with a reason.
5. Accepted requests can reserve matching bed capacity.
6. If the reservation expires before departure, the capacity is released automatically.
7. Sending staff starts the transfer and records transport information.
8. Receiving staff marks patient arrival and completes the transfer.
9. Coordinators and admins can monitor, escalate, export, and audit the workflow.

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

## Demo Access

The seeders create demo users for each role. All seeded demo accounts use:

```text
password123
```

Demo access includes:

- Sending staff account
- Receiving staff account
- Coordinator account
- Admin account

The exact seeded emails are defined in `database/seeders/UserSeeder.php`.

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
- [Deployment Guide](docs/DEPLOYMENT.md)

## Repository Notes

The repository intentionally excludes local secrets and generated dependencies:

- `.env`
- `vendor/`
- `node_modules/`
- `public/build/`
- test and cache output

Use `.env.example` as the starting point for local configuration.
