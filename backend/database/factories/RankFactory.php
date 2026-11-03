<?php

namespace Database\Factories;

use App\Models\Rank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rank>
 */
class RankFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('?/##'),
            'name' => 'Penata Muda Tk. I',
            'sort_order' => 0,
        ];
    }
}
