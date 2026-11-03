<?php

namespace Database\Factories;

use App\Models\Employee;
use App\Models\Rank;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    public function definition(): array
    {
        $birth = fake()->dateTimeBetween('-55 years', '-23 years');
        $tmt = fake()->dateTimeBetween('-25 years', '-1 year');

        return [
            'full_name' => fake()->name(),
            'nip' => $birth->format('Ymd').$tmt->format('Ym').fake()->randomElement(['1', '2']).fake()->unique()->numerify('###'),
            'rank_id' => Rank::factory(),
            'position' => fake()->randomElement(['Pengelola Keuangan', 'Analis Data dan Informasi', 'Pengadministrasi Umum', 'Penata Kelola Pemilu Ahli Pertama']),
            'unit_id' => Unit::factory(),
        ];
    }
}
