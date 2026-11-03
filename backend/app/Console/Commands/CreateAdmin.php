<?php

namespace App\Console\Commands;

use App\Enums\Role;
use App\Http\Requests\EmployeeRequest;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    protected $signature = 'silakh:create-admin {--username=} {--email=}';

    protected $description = 'Membuat akun Administrator secara interaktif (kata sandi diketik, tidak disimpan di berkas).';

    public function handle(): int
    {
        $username = $this->option('username') ?: $this->ask('Nama pengguna');
        $email = $this->option('email') ?: $this->ask('Email (opsional)');
        $password = $this->secret('Kata sandi (min. 10 karakter, huruf dan angka)');
        $confirm = $this->secret('Ulangi kata sandi');

        $validator = Validator::make(
            ['username' => $username, 'email' => $email ?: null, 'password' => $password, 'password_confirmation' => $confirm],
            [
                'username' => ['required', 'max:50', 'regex:'.EmployeeRequest::USERNAME_PATTERN, 'unique:users,username'],
                'email' => ['nullable', 'email', 'max:150', 'unique:users,email'],
                'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
            ],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::create([
            'name' => 'Administrator',
            'username' => $username,
            'email' => $email ?: null,
            'password' => $password,
            'role' => Role::Admin,
        ]);

        $this->info("Administrator {$username} berhasil dibuat.");

        return self::SUCCESS;
    }
}
