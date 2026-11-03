<?php

namespace Database\Factories;

use App\Models\ActionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActionPlan>
 */
class ActionPlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Rencana '.fake()->unique()->words(3, true),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
