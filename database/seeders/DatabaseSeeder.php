<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Test accounts, all with password "password". Two sections, each
        // with an L1 and an L2 (Section A and Section B). Keyed by email so
        // re-running the seeder (e.g. on every Railway deploy) is safe.
        $accounts = [
            ['name' => 'Maria Santos', 'email' => 'source@docuflow.test', 'role' => User::ROLE_DOCUMENT_SOURCE, 'section' => 'Section A'],
            ['name' => 'Jose Reyes', 'email' => 'l1.reyes@docuflow.test', 'role' => User::ROLE_L1, 'section' => 'Section A'],
            ['name' => 'Ana Cruz', 'email' => 'l1.cruz@docuflow.test', 'role' => User::ROLE_L1, 'section' => 'Section B'],
            ['name' => 'Carlo Mendoza', 'email' => 'l2@docuflow.test', 'role' => User::ROLE_L2, 'section' => 'Section A'],
            // A second L2, so a document an L2 submits can still be forwarded
            // (the Self-Review Restriction keeps it away from its submitter).
            ['name' => 'Teresa Navarro', 'email' => 'l2.navarro@docuflow.test', 'role' => User::ROLE_L2, 'section' => 'Section B'],
            // The Division Chief has no section: their summary is system-wide.
            ['name' => 'Liza Ramos', 'email' => 'l3@docuflow.test', 'role' => User::ROLE_L3, 'section' => null],
        ];

        foreach ($accounts as $account) {
            $user = User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'role' => $account['role'],
                    'section' => $account['section'],
                    'password' => 'password',
                ],
            );

            // Not mass-assignable, and the dashboard route requires it.
            $user->forceFill(['email_verified_at' => now()])->save();
        }
    }
}
