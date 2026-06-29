<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::whereIn('email', [
            'maria@overflowcare.com',
            'admin@overflowcare.com',
            'maria@carebridge.com',
            'sarah@citygeneral.com',
            'james@citygeneral.com',
            'emily@stmary.com',
            'mark@stmary.com',
            'david@riverside.com',
            'lisa@riverside.com',
            'alex@metroemerg.com',
            'rachel@metroemerg.com',
            'michael@sunrise.com',
            'anna@sunrise.com',
        ])->get()->each(function (User $user) {
            $hasHistory = $user->createdTransferRequests()->exists()
                || $user->acceptedTransferRequests()->exists()
                || $user->transferLogs()->exists();

            if ($hasHistory) {
                $user->update(['account_status' => 'suspended']);

                return;
            }

            $user->delete();
        });

        $users = [
            // Bukidnon Provincial Medical Center
            ['name' => 'Intake Staff - Bukidnon Provincial Medical Center', 'email' => 'intake.bpmc@carebridge.com', 'role' => 'sending_staff', 'hospital_id' => 1],
            ['name' => 'Acceptance Staff - Bukidnon Provincial Medical Center', 'email' => 'acceptance.bpmc@carebridge.com', 'role' => 'receiving_staff', 'hospital_id' => 1],

            // Bethel Baptist Hospital Inc.
            ['name' => 'Intake Staff - Bethel Baptist Hospital', 'email' => 'intake.bethel@carebridge.com', 'role' => 'sending_staff', 'hospital_id' => 2],
            ['name' => 'Acceptance Staff - Bethel Baptist Hospital', 'email' => 'acceptance.bethel@carebridge.com', 'role' => 'receiving_staff', 'hospital_id' => 2],

            // Malaybalay Polymedic General Hospital
            ['name' => 'Intake Staff - Malaybalay Polymedic', 'email' => 'intake.malaybalay@carebridge.com', 'role' => 'sending_staff', 'hospital_id' => 3],
            ['name' => 'Acceptance Staff - Malaybalay Polymedic', 'email' => 'acceptance.malaybalay@carebridge.com', 'role' => 'receiving_staff', 'hospital_id' => 3],

            // Adventist Medical Center - Valencia City
            ['name' => 'Intake Staff - Adventist Medical Center Valencia', 'email' => 'intake.adventistvalencia@carebridge.com', 'role' => 'sending_staff', 'hospital_id' => 4],
            ['name' => 'Acceptance Staff - Adventist Medical Center Valencia', 'email' => 'acceptance.adventistvalencia@carebridge.com', 'role' => 'receiving_staff', 'hospital_id' => 4],

            // Valencia Polymedic General Hospital
            ['name' => 'Intake Staff - Valencia Polymedic', 'email' => 'intake.valenciapolymedic@carebridge.com', 'role' => 'sending_staff', 'hospital_id' => 5],
            ['name' => 'Acceptance Staff - Valencia Polymedic', 'email' => 'acceptance.valenciapolymedic@carebridge.com', 'role' => 'receiving_staff', 'hospital_id' => 5],

            // Department monitors
            ['name' => 'Bukidnon Placement Coordinator', 'email' => 'coordinator@carebridge.com', 'role' => 'coordinator', 'hospital_id' => 1],
            ['name' => 'Bukidnon Delivery Dispatcher', 'email' => 'dispatcher@carebridge.com', 'role' => 'dispatcher', 'hospital_id' => 1],
            ['name' => 'CareBridge Admin', 'email' => 'admin@carebridge.com', 'role' => 'admin', 'hospital_id' => 1],
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
