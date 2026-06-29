<?php

namespace Database\Seeders;

use App\Models\Hospital;
use App\Models\HospitalCapacity;
use Illuminate\Database\Seeder;

class HospitalSeeder extends Seeder
{
    public function run(): void
    {
        Hospital::whereIn('name', [
            'City General Hospital',
            'St. Mary Medical Center',
            'Riverside Community Hospital',
            'Metro Emergency Center',
            'Sunrise Regional Hospital',
        ])->whereNotIn('id', [1, 2, 3, 4, 5, 6])
            ->update([
                'status' => 'inactive',
                'address' => 'Retired fictional demo record',
            ]);

        $hospitals = [
            [
                'id' => 1,
                'name' => 'Bukidnon Provincial Medical Center',
                'address' => 'Malaybalay City, Bukidnon',
                'latitude' => 8.1575,
                'longitude' => 125.1278,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 12,
                    'emergency_beds_available' => 5,
                    'icu_beds_available' => 3,
                    'ambulance_available' => 2,
                ],
            ],
            [
                'id' => 2,
                'name' => 'Bethel Baptist Hospital Inc.',
                'address' => 'Malaybalay City, Bukidnon',
                'latitude' => 8.1506,
                'longitude' => 125.1244,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 8,
                    'emergency_beds_available' => 3,
                    'icu_beds_available' => 2,
                    'ambulance_available' => 1,
                ],
            ],
            [
                'id' => 3,
                'name' => 'Malaybalay Polymedic General Hospital',
                'address' => 'Malaybalay City, Bukidnon',
                'latitude' => 8.1469,
                'longitude' => 125.1287,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 20,
                    'emergency_beds_available' => 8,
                    'icu_beds_available' => 5,
                    'ambulance_available' => 3,
                ],
            ],
            [
                'id' => 4,
                'name' => 'Adventist Medical Center - Valencia City',
                'address' => 'Valencia City, Bukidnon',
                'latitude' => 7.9076,
                'longitude' => 125.0948,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 4,
                    'emergency_beds_available' => 10,
                    'icu_beds_available' => 6,
                    'ambulance_available' => 5,
                ],
            ],
            [
                'id' => 5,
                'name' => 'Valencia Polymedic General Hospital',
                'address' => 'Valencia City, Bukidnon',
                'latitude' => 7.9041,
                'longitude' => 125.0925,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 15,
                    'emergency_beds_available' => 4,
                    'icu_beds_available' => 1,
                    'ambulance_available' => 2,
                ],
            ],
            [
                'id' => 6,
                'name' => 'Valencia Medical Hospital',
                'address' => 'Valencia City, Bukidnon',
                'latitude' => 7.9060,
                'longitude' => 125.0972,
                'contact_number' => 'Contact hospital directly',
                'capacity' => [
                    'general_beds_available' => 10,
                    'emergency_beds_available' => 4,
                    'icu_beds_available' => 2,
                    'ambulance_available' => 1,
                ],
            ],
        ];

        foreach ($hospitals as $data) {
            $hospital = Hospital::updateOrCreate(
                ['id' => $data['id']],
                [
                    'address' => $data['address'],
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'name' => $data['name'],
                    'contact_number' => $data['contact_number'],
                    'transfer_contact_name' => 'Placement desk',
                    'transfer_contact_phone' => null,
                    'emergency_contact_name' => 'Emergency receiving desk',
                    'emergency_contact_phone' => null,
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
