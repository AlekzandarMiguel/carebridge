<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('carebridge:create-admin {email?} {--name=} {--password=}', function () {
    $email = $this->argument('email') ?: $this->ask('Admin email');
    $name = $this->option('name') ?: $this->ask('Admin name', 'CareBridge Admin');
    $password = $this->option('password') ?: $this->secret('Admin password');

    if (!$email || !$password) {
        $this->error('Email and password are required.');
        return 1;
    }

    $user = User::updateOrCreate(
        ['email' => $email],
        [
            'name' => $name,
            'password' => $password,
            'role' => 'admin',
            'hospital_id' => null,
            'account_status' => 'approved',
            'approved_at' => now(),
        ],
    );

    $this->info("Admin account ready: {$user->email}");
    return 0;
})->purpose('Create or update a production CareBridge admin account');
