# CareBridge

CareBridge is a rejected patient placement and delivery coordination system. It is designed like a focused department for situations where a patient is rejected or delayed because a hospital is full, and staff need a clear way to find another hospital that can accept them.

The system helps intake staff submit rejected patient cases, acceptance staff review and reserve capacity, coordinators supervise the placement department, dispatchers monitor delivery movement, and admins manage users, hospitals, settings, and audit logs.

## At a Glance

| Area | Details |
| --- | --- |
| Main problem | People can be rejected or delayed because a hospital is full, then staff must manually search for another hospital that can accept them. |
| Main solution | A placement department workspace that records the rejected case, finds possible accepting hospitals, confirms capacity, and monitors delivery until handoff. |
| Primary users | Intake Staff, Acceptance Staff, Dispatcher, Coordinator, and Admin. |
| Demo network | Bukidnon-based hospital seed data with sample placement cases across the full workflow. |
| Privacy approach | Patient-safe reference codes are used instead of real patient names. |

## Project Purpose

Many hospital systems focus on internal records. CareBridge focuses on the department-like coordination moment when one hospital cannot accept a patient because capacity is full. Instead of treating this as a simple patient transfer tool, it acts as a specialized placement and delivery workspace for rejected patients.

CareBridge is not a full electronic health record, ambulance dispatch platform, or hospital ERP. Its purpose is narrower: help a placement department coordinate where a rejected patient can be accepted and how the patient delivery is progressing.

## Use Case Scenario

A patient arrives at a hospital needing urgent care, but the hospital is already full. There are no available beds, and the staff cannot safely admit another patient.

Without CareBridge, the patient or staff may need to look for another hospital manually. This can mean calling different hospitals one by one, waiting for confirmation, repeating the patient's situation, and hoping the available bed information is still accurate. This creates stress, delay, and uncertainty.

With CareBridge, staff can send the case to the placement department workspace. CareBridge shows which hospital can accept the patient based on available capacity, such as emergency beds, ICU beds, or general beds. The accepting hospital can accept, decline, or reserve the needed capacity directly in the system.

Because of this, the hassle of manually searching for another hospital is reduced. The patient does not have to keep looking for an available hospital, and staff can quickly coordinate with a hospital that has space.

## End-to-End Flow

1. Intake Staff creates a rejected patient case using a patient-safe reference code.
2. CareBridge suggests hospitals that may accept the case based on capacity, case type, route distance, and availability.
3. Acceptance Staff reviews the request for their hospital.
4. Acceptance Staff accepts, declines, or reserves matching capacity.
5. Dispatcher claims or is assigned to the case after acceptance or reservation.
6. Dispatcher records ambulance, contact, pickup, ETA, route, and delivery updates.
7. Coordinator monitors stuck cases, SLA delays, unassigned deliveries, and route risks.
8. Acceptance Staff confirms arrival and completes the handoff.
9. Admin reviews users, hospitals, system settings, audit logs, and demo data.

## Main Features

- Landing page that explains the system idea and workflow.
- Login, signup, forgot password, and reset password pages.
- Signup requests require admin approval before the account can sign in.
- Role-based dashboards, navigation, onboarding, and admin role matrix.
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
- Compact embedded Google-style route panel using hospital names and addresses, with Google Maps, Geoapify, OSRM, and local distance/ETA fallback support.
- Dedicated dispatcher board for unassigned cases, assigned cases, ETA risk, ambulance/driver/contact, pickup/arrival checklist, route details, and delivery updates.
- Automatic priority scoring based on urgency, waiting time, status, assignment, case type, SLA state, and ETA risk.
- Patient privacy guard that blocks obvious personal details in intake notes and asks staff to use reference codes.
- Downloadable case summary report from the case detail page.
- Account-backed notification preferences for SLA, assigned case, arrival, completion, decline, and delivery delay alerts.
- Command view for Rejected, Searching, Accepted, Dispatching, En Route, Arrived, and Completed lanes.
- Department wallboard for active cases, assignment gaps, ETA risk, and SLA risk.
- Archive and restore workflow for closed cases.
- Admin management for users, account approval, enable/disable actions, password resets, hospitals, system settings, role history, and demo data refresh.
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
| Intake Staff | Receives rejected patient cases, creates placement cases, records rejection reason, urgency, required service, documents, and suggested destination. |
| Acceptance Staff | Reviews cases sent to their hospital, accepts or declines, reserves matching capacity, updates own capacity, marks arrival, and completes handoff. |
| Dispatcher | Owns delivery movement after acceptance: ambulance assignment, driver/contact, pickup time, ETA, route updates, location updates, delays, arrival progress, and delivery timeline. |
| Coordinator | Watches active cases, resolves delays, escalates SLA breaches, reassigns dispatchers, and oversees stuck cases without acting as hospital staff. |
| Admin | Manages users, hospitals, roles, settings, audit logs, demo data, role matrix, analytics, and system configuration. |

## Role Boundaries

- Intake Staff cannot accept, decline, reserve, or update hospital capacity.
- Acceptance Staff can update only their own hospital capacity and cannot create rejected patient cases.
- Dispatchers cannot accept, decline, reserve, or update capacity; they own delivery movement only.
- Coordinators do not perform hospital acceptance actions and delivery monitoring overrides require an audit reason.
- Admins can manage configuration and governance, but routine hospital workflow should stay with the correct role.

## Workflow Statuses

| Status | Meaning |
| --- | --- |
| Rejected / Declined | A hospital could not accept the patient, or an acceptance request was declined. |
| Searching / Pending | A placement case is waiting for an accepting hospital decision. |
| Accepted | The receiving hospital agreed to accept the case. |
| Dispatching / Reserved | Capacity is reserved and delivery preparation is active. |
| En Route | Patient delivery is moving toward the accepting hospital. |
| Arrived | Patient arrived and is waiting for final handoff. |
| Completed | Placement and delivery handoff are finished. |

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

Create or select a MySQL database first. The default local database name is:

```text
overflowcare
```

Then configure `.env`:

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=overflowcare
DB_USERNAME=root
DB_PASSWORD=
GOOGLE_MAPS_API_KEY=
GOOGLE_MAPS_DIRECTIONS_URL=https://maps.googleapis.com/maps/api/directions/json
GEOAPIFY_API_KEY=
GEOAPIFY_API_URL=https://api.geoapify.com
ROUTING_OSRM_URL=https://router.project-osrm.org
ROUTING_TIMEOUT=4
```

For production-grade distance and ETA, add a `GOOGLE_MAPS_API_KEY` with Directions API access or a `GEOAPIFY_API_KEY`. CareBridge tries Google Maps first, then Geoapify, then the configured OSRM service, then a local coordinate estimate.

Run the project setup:

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

| Role | Demo Email |
| --- | --- |
| Intake Staff | `intake.bpmc@carebridge.com` |
| Acceptance Staff | `acceptance.bpmc@carebridge.com` |
| Intake Staff | `intake.bethel@carebridge.com` |
| Acceptance Staff | `acceptance.bethel@carebridge.com` |
| Intake Staff | `intake.malaybalay@carebridge.com` |
| Acceptance Staff | `acceptance.malaybalay@carebridge.com` |
| Intake Staff | `intake.adventistvalencia@carebridge.com` |
| Acceptance Staff | `acceptance.adventistvalencia@carebridge.com` |
| Intake Staff | `intake.valenciapolymedic@carebridge.com` |
| Acceptance Staff | `acceptance.valenciapolymedic@carebridge.com` |
| Coordinator | `coordinator@carebridge.com` |
| Dispatcher | `dispatcher@carebridge.com` |
| Admin | `admin@carebridge.com` |

The exact seeded emails are defined in `database/seeders/UserSeeder.php`.

## Sample Cases

The sample case seeder creates a complete demo flow so every role has something meaningful to test:

| Case Code | Demo State | What It Shows |
| --- | --- | --- |
| `CB-CASE-2026-001` | Declined | A rejected patient case that needs rerouting after decline. |
| `CB-CASE-2026-002` | Pending and escalated | A case waiting too long without acceptance. |
| `CB-CASE-2026-003` | Accepted | A hospital accepted the case but delivery has not started. |
| `CB-CASE-2026-004` | Reserved / dispatching | Capacity is reserved and delivery preparation is active. |
| `CB-CASE-2026-005` | En route | Dispatcher is monitoring an active patient delivery. |
| `CB-CASE-2026-006` | Arrived | Patient arrived and is waiting for handoff completion. |
| `CB-CASE-2026-007` | Completed | Full placement and delivery flow is finished. |

Refresh only the sample cases with:

```bash
php artisan db:seed --class=SampleCaseSeeder
```

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

Some internal class names and database table names still use `transfer` because the project started from a broader hospital transfer concept. The user-facing language has been updated toward rejected patient placement and delivery coordination, and safe `/api/placement-cases` aliases now point to the existing workflow. A future physical database rename from `transfer_requests` to `placement_cases` can be done later with a dedicated migration plan.

The repository intentionally excludes local secrets and generated dependencies:

- `.env`
- `vendor/`
- `node_modules/`
- `public/build/`
- test and cache output

Use `.env.example` as the starting point for local configuration.
