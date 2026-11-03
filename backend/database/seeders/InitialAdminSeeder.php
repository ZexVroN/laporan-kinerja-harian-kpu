<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Validator;

/**
 * Membuat administrator awal dari ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD di .env.
 * Tidak ada kata sandi yang ditulis di kode. Alternatif interaktif: php artisan silakh:create-admin
 */
class InitialAdminSeeder extends Seeder
{
    public function run(): void
    {
        $config = config('silakh.initial_admin');

        if (empty($config['username']) || empty($config['password'])) {
            $this->command?->warn('ADMIN_USERNAME/ADMIN_PASSWORD kosong: administrator awal dilewati. Jalankan php artisan silakh:create-admin.');

            return;
        }

        if (User::query()->where('username', $config['username'])->exists()) {
            $this->command?->info("Administrator {$config['username']} sudah ada.");

            return;
        }

        Validator::make(['password' => $config['password']], ['password' => Password::min(10)->letters()->numbers()])->validate();

        User::create([
            'name' => 'Administrator',
            'username' => $config['username'],
            'email' => $config['email'] ?: null,
            'password' => $config['password'],
            'role' => Role::Admin,
            'must_change_password' => true,
        ]);

        $this->command?->info("Administrator {$config['username']} dibuat. Hapus ADMIN_PASSWORD dari .env sekarang.");
    }
}
