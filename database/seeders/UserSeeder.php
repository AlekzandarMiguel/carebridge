<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // Hospital 1 - City General Hospital
            ['name' => 'Dr. Sarah Chen', 'email' => 'sarah@citygeneral.com', 'role' => 'sending_staff', 'hospital_id' => 1],
            ['name' => 'Nurse James Wilson', 'email' => 'james@citygeneral.com', 'role' => 'receiving_staff', 'hospital_id' => 1],

            // Hospital 2 - St. Mary Medical Center
            ['name' => 'Dr. Emily Rodriguez', 'email' => 'emily@stmary.com', 'role' => 'sending_staff', 'hospital_id' => 2],
            ['name' => 'Nurse Mark Thompson', 'email' => 'mark@stmary.com', 'role' => 'receiving_staff', 'hospital_id' => 2],

            // Hospital 3 - Riverside Community Hospital
            ['name' => 'Dr. David Park', 'email' => 'david@riverside.com', 'role' => 'sending_staff', 'hospital_id' => 3],
            ['name' => 'Nurse Lisa Nguyen', 'email' => 'lisa@riverside.com', 'role' => 'receiving_staff', 'hospital_id' => 3],

            // Hospital 4 - Metro Emergency Center
            ['name' => 'Dr. Alex Turner', 'email' => 'alex@metroemerg.com', 'role' => 'sending_staff', 'hospital_id' => 4],
            ['name' => 'Nurse Rachel Kim', 'email' => 'rachel@metroemerg.com', 'role' => 'receiving_staff', 'hospital_id' => 4],

            // Hospital 5 - Sunrise Regional Hospital
            ['name' => 'Dr. Michael Brooks', 'email' => 'michael@sunrise.com', 'role' => 'sending_staff', 'hospital_id' => 5],
            ['name' => 'Nurse Anna Scott', 'email' => 'anna@sunrise.com', 'role' => 'receiving_staff', 'hospital_id' => 5],

            // Coordinators
            ['name' => 'Coordinator Maria Santos', 'email' => 'maria@carebridge.com', 'role' => 'coordinator', 'hospital_id' => 1],
            ['name' => 'Dispatcher Nina Cruz', 'email' => 'dispatcher@carebridge.com', 'role' => 'dispatcher', 'hospital_id' => 1],
            ['name' => 'Admin John Doe', 'email' => 'admin@carebridge.com', 'role' => 'admin', 'hospital_id' => 1],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    ...$userData,
                    'password' => 'password123',
                    'account_status' => 'approved',
                    'approved_at' => now(),
                ],
            );
        }
    }
}
