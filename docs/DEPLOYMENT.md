# CareBridge Deployment Guide

This guide explains the production checklist for deploying CareBridge.

## Requirements

- PHP 8.2 or newer
- Composer
- Node.js and npm
- MySQL, MariaDB, PostgreSQL, or another Laravel-supported database
- Web server that points to the Laravel `public` directory

## Production Setup

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan storage:link
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
SANCTUM_STATEFUL_DOMAINS=your-domain.example
SESSION_SECURE_COOKIE=true
```

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

## First Admin

Seed demo data only in demo or local environments:

```bash
php artisan db:seed
```

For production, create a real admin account through a secure one-time seed or database admin process, then remove any demo credentials.

## Recommended Server Tasks

- Run `php artisan migrate --force` during deployments.
- Run a process monitor if queue workers are added later.
- Configure HTTPS.
- Back up the database regularly.
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
- Dark mode
- CSV export for placement and audit reports
