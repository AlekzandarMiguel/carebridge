<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\HospitalCapacity;
use Illuminate\Database\Seeder;

class HospitalSeeder extends Seeder
{
    public function run(): void
    {
        $hospitals = [
            [
                'name' => 'City General Hospital',
                'address' => '123 Main St, Metro City',
                'contact_number' => '555-0101',
                'capacity' => [
                    'general_beds_available' => 12,
                    'emergency_beds_available' => 5,
                    'icu_beds_available' => 3,
                    'ambulance_available' => 2,
                ],
            ],
            [
                'name' => 'St. Mary Medical Center',
                'address' => '456 Oak Ave, Metro City',
                'contact_number' => '555-0102',
                'capacity' => [
                    'general_beds_available' => 8,
                    'emergency_beds_available' => 3,
                    'icu_beds_available' => 2,
                    'ambulance_available' => 1,
                ],
            ],
            [
                'name' => 'Riverside Community Hospital',
                'address' => '789 River Rd, Metro City',
                'contact_number' => '555-0103',
                'capacity' => [
                    'general_beds_available' => 20,
                    'emergency_beds_available' => 8,
                    'icu_beds_available' => 5,
                    'ambulance_available' => 3,
                ],
            ],
            [
                'name' => 'Metro Emergency Center',
                'address' => '321 Emergency Blvd, Metro City',
                'contact_number' => '555-0104',
                'capacity' => [
                    'general_beds_available' => 4,
                    'emergency_beds_available' => 10,
                    'icu_beds_available' => 6,
                    'ambulance_available' => 5,
                ],
            ],
            [
                'name' => 'Sunrise Regional Hospital',
                'address' => '654 Sunrise Dr, Metro City',
                'contact_number' => '555-0105',
                'capacity' => [
                    'general_beds_available' => 15,
                    'emergency_beds_available' => 4,
                    'icu_beds_available' => 1,
                    'ambulance_available' => 2,
                ],
            ],
        ];

        foreach ($hospitals as $data) {
            $hospital = Hospital::updateOrCreate(
                ['name' => $data['name']],
                [
                    'address' => $data['address'],
                    'contact_number' => $data['contact_number'],
                    'status' => 'active',
                ],
            );

            HospitalCapacity::updateOrCreate(
                ['hospital_id' => $hospital->id],
                [
                    ...$data['capacity'],
                    'last_updated' => now(),
                ],
            );
        }
    }
}
