<?php

namespace Database\Factories;

use App\Enums\WorkType;
use App\Models\ActionPlan;
use App\Models\DailyReport;
use App\Models\Employee;
use App\Services\WorkHours;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyReport>
 */
class DailyReportFactory extends Factory
{
    public function definition(): array
    {
        $slots = WorkHours::slots();
        $start = fake()->numberBetween(0, count($slots) - 2);

        $target = fake()->numberBetween(1, 5);

        return [
            'employee_id' => Employee::factory(),
            // Rencana Aksi dari daftar bawaan (diisi oleh migrasi).
            'action_plan_id' => fn () => ActionPlan::query()->inRandomOrder()->value('id'),
            'action_plan_name' => fn (array $a) => ActionPlan::query()->whereKey($a['action_plan_id'])->value('name') ?? 'Kegiatan lainnya',
            'work_type' => fake()->randomElement(WorkType::cases())->value,
            'report_date' => today()->toDateString(),
            'start_time' => $slots[$start],
            'end_time' => $slots[fake()->numberBetween($start + 1, min($start + 4, count($slots) - 1))],
            'activity_description' => fake()->sentence(10),
            'data_source' => 'SKP / Rencana Aksi',
            'target' => $target,
            'realization' => fake()->numberBetween(0, $target),
            'unit_of_measure' => fake()->randomElement(DailyReport::UNITS_OF_MEASURE),
            'is_completed' => fake()->boolean(70),
            'remarks' => fake()->optional()->sentence(4),
        ];
    }

    public function configure(): static
    {
        return $this->afterMaking(function (DailyReport $report) {
            if ($report->snapshot_unit_id === null) {
                $report->fillSnapshotFrom($report->employee);
            }
        });
    }

    public function on(string $date): static
    {
        return $this->state(fn () => ['report_date' => $date]);
    }
}
