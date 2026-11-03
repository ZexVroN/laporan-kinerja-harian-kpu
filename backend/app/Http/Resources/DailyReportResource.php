<?php

namespace App\Http\Resources;

use App\Models\Employee;
use App\Services\QuarterService;
use App\Services\WorkHours;
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
            'start_time' => WorkHours::short($this->start_time),
            'end_time' => WorkHours::short($this->end_time),
            'month' => $this->report_date->month,
            'month_name' => QuarterService::MONTHS[$this->report_date->month],
            'year' => $this->report_date->year,
            'quarter' => $quarter,
            'quarter_label' => 'Triwulan '.QuarterService::roman($quarter),
            'action_plan' => $this->action_plan_name === null ? null : [
                'id' => $this->action_plan_id,
                'name' => $this->action_plan_name,
                'is_other' => $this->action_plan_id === null,
            ],
            'work_type' => $this->work_type?->value,
            'work_type_label' => $this->work_type?->label(),
            'activity_description' => $this->activity_description,
            'data_source' => $this->data_source,
            'target' => $this->target,
            'realization' => $this->realization,
            'unit_of_measure' => $this->unit_of_measure,
            'evidence_url' => $this->evidence_url,
            'is_completed' => $this->is_completed,
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
