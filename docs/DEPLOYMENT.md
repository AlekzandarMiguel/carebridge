# CareBridge Deployment Guide

This guide explains the production checklist for deploying CareBridge, a rejected patient placement and delivery coordination system.

## Requirements

- PHP 8.2 or newer
- Composer
- Node.js and npm
- MySQL, MariaDB, PostgreSQL, or another Laravel-supported database
- Web server that points to the Laravel `public` directory
- Writable `storage` directory for attachments, logs, cache, and sessions
- Process monitor for queues if mail, notifications, or broadcasting are enabled

## Production Setup

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan storage:link
php artisan queue:restart
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Update `.env` with production values before running the app:

```text
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example
DB_CONNECTION=mysql
DB_DATABASE=carebridge
DB_USERNAME=carebridge_user
DB_PASSWORD=use-a-strong-password
SANCTUM_STATEFUL_DOMAINS=your-domain.example
SESSION_SECURE_COOKIE=true
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
GEOAPIFY_API_KEY=
GEOAPIFY_API_URL=https://api.geoapify.com
ROUTING_OSRM_URL=https://router.project-osrm.org
ROUTING_TIMEOUT=4
```

For local MySQL development, the default example database is:

```text
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=overflowcare
DB_USERNAME=root
DB_PASSWORD=
GEOAPIFY_API_KEY=
GEOAPIFY_API_URL=https://api.geoapify.com
ROUTING_OSRM_URL=https://router.project-osrm.org
ROUTING_TIMEOUT=4
```

`GEOAPIFY_API_KEY` enables Geoapify routing for the delivery map. If it is empty or unavailable, CareBridge tries the configured OSRM-compatible service from `ROUTING_OSRM_URL`. If both geo services are unavailable, CareBridge falls back to coordinate-based route estimates.

## Storage and Attachments

CareBridge supports uploading handoff and supporting documents to rejected patient cases. Attachments are stored privately and downloaded through authenticated API routes.

Run this once after deployment:

```bash
php artisan storage:link
```

Make sure the server can write to:

```text
storage/app/private
storage/framework
storage/logs
```

Back up uploaded documents together with the database. If the project is deployed to multiple servers, use shared storage such as S3-compatible storage instead of local disk.

## Mail Setup

Configure a real mail provider so forgot-password emails can be sent:

```text
MAIL_MAILER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=no-reply@your-domain.example
MAIL_FROM_NAME=CareBridge
```

Run a queue worker if production mail should be sent asynchronously:

```bash
php artisan queue:work --tries=3 --timeout=90
```

Use Supervisor, systemd, Laravel Forge, or your hosting panel to keep the worker running.

## Realtime Alerts

The current app polls alerts, which is simple and reliable for school/demo deployment. For production realtime alerts, configure Laravel broadcasting with one of these options:

- Laravel Reverb
- Pusher-compatible service
- Ably

Recommended production path:

1. Add broadcasting credentials to `.env`.
2. Broadcast placement case activity when case actions are recorded.
3. Subscribe the React header and command board to private role or hospital channels.
4. Keep polling as a fallback for poor connections.

The current app polls alerts every 5 seconds for near-realtime feedback until a WebSocket service is configured.

## Backups

Back up at least:

- Database
- `storage/app/private`
- `.env` through a secure secrets manager or encrypted backup

Suggested schedule:

- Database: daily
- Attachments: daily
- Full server snapshot: weekly

Test restore steps before relying on backups.

## Security Checklist

- Use HTTPS only.
- Set `APP_DEBUG=false`.
- Use strong admin passwords.
- Remove demo credentials from production.
- Keep `.env` out of Git.
- Restrict uploaded document MIME types and size.
- Point the web server only to the `public` directory.
- Configure database users with the least privileges needed.
- Review audit logs regularly.

## First Admin

Seed demo data only in demo or local environments:

```bash
php artisan db:seed
```

For production, create a real admin account through a secure one-time seed or database admin process, then remove any demo credentials.

You can create or update a real admin without demo seeders:

```bash
php artisan carebridge:create-admin admin@example.com --name="System Admin"
```

Production should not include seeded `@carebridge.com` demo accounts or sample cases unless the deployment is only for presentation or training.

## Recommended Server Tasks

- Run `php artisan migrate --force` during deployments.
- Run a process monitor if queue workers are added later.
- Configure HTTPS.
- Back up the database regularly.
- Back up uploaded case attachments.
- Run `php artisan storage:link` after release setup.
- Restart queue workers after deployment.
- Keep `.env`, `vendor/`, `node_modules/`, and storage secrets out of Git.

## Verification

After deployment:

```bash
php artisan test
npm run build
```

Then verify these workflows manually:

- Login and logout
- Signup request and admin approval
- Create rejected patient case
- Accept, reserve, start delivery, arrive, and complete
- Assign dispatcher and add delivery timeline update
- Confirm route map shows the path from origin to accepting destination
- Upload and open a case attachment
- Download a private attachment as an authenticated user
- Archive and restore a closed case
- Open the department wallboard
- Mark notifications read
- Dark mode
- CSV export for placement and audit reports
