<?php

namespace Database\Factories;

use App\Models\DailyReport;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyReport>
 */
class DailyReportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'employee_id' => Employee::factory(),
            'report_date' => today()->toDateString(),
            'activity_description' => fake()->sentence(10),
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
