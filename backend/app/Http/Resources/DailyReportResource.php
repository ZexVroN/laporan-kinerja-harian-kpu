<?php

namespace App\Http\Resources;

use App\Models\Employee;
use App\Services\QuarterService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DailyReport */
class DailyReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $quarter = QuarterService::quarterOf($this->report_date);

        return [
            'id' => $this->id,
            'report_date' => $this->report_date->toDateString(),
            'month' => $this->report_date->month,
            'month_name' => QuarterService::MONTHS[$this->report_date->month],
            'year' => $this->report_date->year,
            'quarter' => $quarter,
            'quarter_label' => 'Triwulan '.QuarterService::roman($quarter),
            'activity_description' => $this->activity_description,
            'remarks' => $this->remarks,
            'snapshot' => [
                'rank' => $this->snapshot_rank,
                'position' => $this->snapshot_position,
                'unit' => $this->whenLoaded('snapshotUnit', fn () => ['id' => $this->snapshotUnit->id, 'name' => $this->snapshotUnit->name]),
            ],
            'employee' => $this->whenLoaded('employee', fn () => [
                'id' => $this->employee->id,
                'full_name' => $this->employee->full_name,
                'nip' => $this->employee->nip,
                'nip_formatted' => Employee::formatNip($this->employee->nip),
            ]),
            'is_locked' => QuarterService::isLocked($this->report_date->year, $quarter),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
