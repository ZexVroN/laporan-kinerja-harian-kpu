<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => Role::Pegawai,
            'is_active' => true,
            'must_change_password' => false,
            'remember_token' => Str::random(10),
        ];
    }

    /** Pegawai lengkap dengan data kepegawaian. */
    public function pegawai(): static
    {
        return $this->state(fn () => ['role' => Role::Pegawai])
            ->for(Employee::factory(), 'employee')
            ->afterMaking(fn (User $user) => $user->name = $user->employee->full_name);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => Role::Admin]);
    }

    public function pimpinan(): static
    {
        return $this->state(fn () => ['role' => Role::Pimpinan])
            ->for(Employee::factory(), 'employee');
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
