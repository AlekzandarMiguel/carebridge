# CareBridge

CareBridge is a rejected patient placement and delivery coordination system. It is designed like a focused department for situations where a patient is rejected or delayed because a hospital is full, and staff need a clear way to find another hospital that can accept them.

The system helps intake staff submit rejected patient cases, acceptance staff review and reserve capacity, coordinators supervise the placement department, dispatchers monitor delivery movement, and admins manage users, hospitals, settings, and audit logs.

## Project Purpose

Many hospital systems focus on internal records. CareBridge focuses on the department-like coordination moment when one hospital cannot accept a patient because capacity is full. Instead of treating this as a simple patient transfer tool, it acts as a specialized placement and delivery workspace for rejected patients.

## Use Case Scenario

A patient arrives at a hospital needing urgent care, but the hospital is already full. There are no available beds, and the staff cannot safely admit another patient.

Without CareBridge, the patient or staff may need to look for another hospital manually. This can mean calling different hospitals one by one, waiting for confirmation, repeating the patient's situation, and hoping the available bed information is still accurate. This creates stress, delay, and uncertainty.

With CareBridge, staff can send the case to the placement department workspace. CareBridge shows which hospital can accept the patient based on available capacity, such as emergency beds, ICU beds, or general beds. The accepting hospital can accept, decline, or reserve the needed capacity directly in the system.

Because of this, the hassle of manually searching for another hospital is reduced. The patient does not have to keep looking for an available hospital, and staff can quickly coordinate with a hospital that has space.

## Main Features

- Landing page that explains the system idea and workflow.
- Login, signup, forgot password, and reset password pages.
- Signup requests require admin approval before the account can sign in.
- Role-based dashboards and navigation.
- Dark mode across public and authenticated pages.
- Hospital capacity desk for available general, emergency, ICU, and ambulance capacity.
- Rejected patient case creation for capacity-limited patients.
- Privacy confirmation and handoff document checklist during request creation.
- Placement matching that ranks accepting hospitals by matching beds, total capacity, ambulance availability, distance, and estimated travel time.
- Incoming placement triage for acceptance staff.
- Accept, decline, reserve, start delivery, mark arrived, complete, cancel, and escalate actions.
- Patient delivery monitoring with transport team, ambulance unit, contact, ETA, route distance, travel estimate, location, and delivery notes.
- Dispatcher assignment for active placement and delivery cases.
- Delivery event timeline for departed, location update, delayed, accepting area arrival, and handoff updates.
- SLA and ETA warning states for cases that are waiting too long or running late.
- Secure case attachments for referral notes, lab results, imaging, consent, transport forms, and supporting documents.
- Built-in route map that plots the delivery path from origin to final accepting destination using hospital coordinates.
- Dedicated dispatcher board for unassigned cases, assigned cases, ETA risk, ambulance information, and delivery updates.
- Automatic priority scoring based on urgency, waiting time, status, assignment, case type, SLA state, and ETA risk.
- Patient privacy guard that blocks obvious personal details in intake notes and asks staff to use reference codes.
- Downloadable case summary report from the case detail page.
- Local notification preferences for SLA, assigned case, arrival, completion, and decline alerts.
- Command view for Rejected, Searching, Accepted, Dispatching, En Route, Arrived, and Completed lanes.
- Department wallboard for active cases, assignment gaps, ETA risk, and SLA risk.
- Archive and restore workflow for closed cases.
- Admin management for users, account approval, hospitals, system settings, and demo data refresh.
- Audit logs with filters, CSV export, action, role, search term, and date range.
- Delivery tracking filters, global search, and CSV export for monitor roles.
- Analytics for status distribution, urgency, case type, rejection reasons, completion rate, and placement activity.
- Notification alerts with priority labels, unread counts, read controls, and faster near-realtime polling.
- Expired reservations automatically release reserved capacity back to the accepting hospital.
- Route-based frontend code splitting for faster page loading.
- Production admin command: `php artisan carebridge:create-admin`.
- Browser test scaffold for Playwright.

## User Roles

| Role | Main Purpose |
| --- | --- |
| Intake Staff | Submit rejected patient cases, monitor placement, reroute declined cases, and start delivery after reservation. |
| Acceptance Staff | Update own hospital capacity, review acceptance queue, accept or decline, reserve beds, mark arrivals, and complete handoffs. |
| Coordinator | Supervise network-wide placement, escalation, SLA pressure, coordinator notes, and analytics. |
| Dispatcher | Assign active cases, maintain route estimates, and add delivery timeline updates. |
| Admin | Manage department users, hospitals, settings, audit logs, demo data, analytics, and the command view. |

## Core Workflow

1. An intake staff user submits a rejected patient case because their hospital is full or cannot accept the patient.
2. CareBridge suggests hospitals with matching available capacity.
3. The accepting hospital reviews the case.
4. Acceptance staff accepts with optional conditions or declines with a reason.
5. Accepted requests can reserve matching bed capacity.
6. If the reservation expires before departure, the capacity is released automatically.
7. A coordinator or dispatcher assigns the case for delivery monitoring.
8. Intake staff starts patient delivery and records transport information.
9. Dispatchers use the dispatcher board to claim unassigned cases, update route estimates, and add delivery timeline events until handoff.
10. Acceptance staff marks patient arrival and completes the handoff.
11. Coordinators, dispatchers, and admins can monitor, escalate, export, and audit the workflow.

## Tech Stack

- Laravel 12
- Laravel Sanctum
- React 19
- React Router
- Vite
- Recharts
- Axios
- PHP 8.2+
- MySQL or MariaDB for local development

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

The seeders create a Bukidnon-based demo network using legitimate hospital names for local presentation. All seeded demo accounts use:

```text
password123
```

Demo access includes:

- Intake Staff: `intake.bpmc@carebridge.com`
- Acceptance Staff: `acceptance.bethel@carebridge.com`
- Coordinator: `coordinator@carebridge.com`
- Dispatcher: `dispatcher@carebridge.com`
- Admin: `admin@carebridge.com`

The exact seeded emails are defined in `database/seeders/UserSeeder.php`.

## Bukidnon Demo Hospitals

The local demo hospital list uses Bukidnon hospitals instead of fictional Metro City seed data:

- Bukidnon Provincial Medical Center
- Bethel Baptist Hospital Inc.
- Malaybalay Polymedic General Hospital
- Adventist Medical Center - Valencia City
- Valencia Polymedic General Hospital
- Valencia Medical Hospital

Coordinates and contact placeholders are for local demonstration and should be verified with the facility before production use.

## Testing

Run the backend test suite:

```bash
php artisan test
```

Run the frontend production build:

```bash
npm run build
```

Browser test scaffolding is included. Install Playwright before running it:

```bash
npm install --save-dev @playwright/test
npm run test:browser
```

For any public uploaded assets in local development, run:

```bash
php artisan storage:link
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
