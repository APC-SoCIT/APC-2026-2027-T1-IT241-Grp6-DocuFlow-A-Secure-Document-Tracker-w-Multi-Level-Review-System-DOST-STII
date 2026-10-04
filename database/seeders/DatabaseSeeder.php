<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Accounts that existed under an older email. They are renamed in place
     * so their documents, reviews and notifications stay linked.
     */
    private const PREVIOUS_EMAILS = [
        'l1@docuflow.test' => 'l1.reyes@docuflow.test',
        'l1b@docuflow.test' => 'l1.cruz@docuflow.test',
        'l2b@docuflow.test' => 'l2.navarro@docuflow.test',
    ];

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Test accounts, all with password "password". Keyed by email so
        // re-running the seeder (e.g. on every Railway deploy) is safe.
        // Two L1s and two L2s, so an L1's or L2's own document can still go to
        // another reviewer (Self-Review Restriction). One section for all of
        // them; the Division Chief has none, their summary is system-wide.
        $accounts = [
            ['name' => 'Raniel Dela Cruz', 'email' => 'source@docuflow.test', 'role' => User::ROLE_DOCUMENT_SOURCE, 'section' => 'Section A'],
            ['name' => 'Sofia Padua', 'email' => 'l1@docuflow.test', 'role' => User::ROLE_L1, 'section' => 'Section A'],
            ['name' => 'Carlo Baracena', 'email' => 'l1b@docuflow.test', 'role' => User::ROLE_L1, 'section' => 'Section A'],
            ['name' => 'Nairb Varona', 'email' => 'l2@docuflow.test', 'role' => User::ROLE_L2, 'section' => 'Section A'],
            ['name' => 'Beejay Carpio', 'email' => 'l2b@docuflow.test', 'role' => User::ROLE_L2, 'section' => 'Section A'],
            ['name' => 'RomeoJr Albeza', 'email' => 'l3@docuflow.test', 'role' => User::ROLE_L3, 'section' => null],
        ];

        foreach ($accounts as $account) {
            $previousEmail = self::PREVIOUS_EMAILS[$account['email']] ?? null;
            if ($previousEmail && ! User::where('email', $account['email'])->exists()) {
                User::where('email', $previousEmail)->update(['email' => $account['email']]);
            }

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
