<?php

namespace Database\Factories;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Subbagian '.fake()->unique()->words(3, true),
            'code' => null,
            'is_active' => true,
        ];
    }
}
