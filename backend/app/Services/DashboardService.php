<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\DailyReport;
use App\Models\Employee;
use App\Models\Unit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Statistik dasbor. Agregasi dilakukan per (pegawai, tanggal) lalu dirangkum di PHP
 * agar kueri tetap portabel (MySQL/MariaDB dan SQLite untuk pengujian).
 */
class DashboardService
{
    private CarbonImmutable $today;

    private int $year;

    private int $quarter;

    public function __construct()
    {
        $this->today = CarbonImmutable::today();
        $this->year = $this->today->year;
        $this->quarter = QuarterService::quarterOf($this->today);
    }

    public function forUser(User $user): array
    {
        return match ($user->role) {
            Role::Pegawai => $this->pegawai($user),
            Role::Admin => $this->admin(),
            Role::Pimpinan => $this->pimpinan(),
        };
    }

    private function pegawai(User $user): array
    {
        $rows = $this->dailyRows(DailyReport::query()->where('employee_id', $user->employee_id ?? 0));
        $byDate = $rows->groupBy('report_date')->map->sum('total');

        $monthStart = $this->today->startOfMonth();
        $monthDates = $byDate->filter(fn ($_, $date) => $date >= $monthStart->toDateString());
        [$qStart, $qEnd] = QuarterService::range($this->year, $this->quarter);

        $recent = DailyReport::query()->where('employee_id', $user->employee_id ?? 0)
            ->latest('report_date')->latest('id')->limit(5)
            ->get(['id', 'report_date', 'activity_description', 'remarks', 'created_at']);

        return [
            'role' => 'pegawai',
            'period' => $this->periodInfo(),
            'today' => ['date' => $this->today->toDateString(), 'total' => (int) ($byDate[$this->today->toDateString()] ?? 0)],
            'month' => [
                'total' => (int) $monthDates->sum(),
                'days_reported' => $monthDates->count(),
                'workdays' => count(QuarterService::workdays($monthStart, $this->today->endOfMonth())),
            ],
            'quarter' => $this->coverageFor($byDate, $qStart, $qEnd),
            'monthly' => $this->monthly($byDate),
            'quarters' => collect(range(1, 4))->map(function (int $q) use ($byDate) {
                [$start, $end] = QuarterService::range($this->year, $q);

                return ['quarter' => $q, 'label' => 'Triwulan '.QuarterService::roman($q)]
                    + $this->coverageFor($byDate, $start, $end)
                    + ['is_current' => $q === $this->quarter, 'is_locked' => QuarterService::isLocked($this->year, $q)];
            })->all(),
            'recent' => $recent->map(fn (DailyReport $r) => [
                'id' => $r->id,
                'report_date' => $r->report_date->toDateString(),
                'activity_description' => $r->activity_description,
                'remarks' => $r->remarks,
                'created_at' => $r->created_at->toIso8601String(),
            ]),
        ];
    }

    private function admin(): array
    {
        [$qStart, $qEnd] = QuarterService::range($this->year, $this->quarter);
        $activeIds = $this->activePegawaiIds();

        $reportedToday = DailyReport::query()
            ->where('report_date', $this->today->toDateString())
            ->distinct()->pluck('employee_id');
        $missing = Employee::query()->with('unit:id,name')
            ->whereIn('id', $activeIds->diff($reportedToday))
            ->orderBy('full_name');

        return [
            'role' => 'admin',
            'period' => $this->periodInfo(),
            'employees_total' => Employee::query()->count(),
            'units_total' => Unit::query()->where('is_active', true)->count(),
            'accounts_active' => User::query()->where('is_active', true)->count(),
            'accounts_inactive' => User::query()->where('is_active', false)->count(),
            'reports_year' => DailyReport::query()->whereBetween('report_date', [$this->year.'-01-01', $this->year.'-12-31'])->count(),
            'reports_month' => DailyReport::query()->whereBetween('report_date', [$this->today->startOfMonth()->toDateString(), $this->today->toDateString()])->count(),
            'month_workdays' => count(QuarterService::workdays($this->today->startOfMonth(), $this->today)),
            'by_unit' => $this->byUnit($qStart, $qEnd),
            'today' => [
                'active_employees' => $activeIds->count(),
                'reported' => $reportedToday->intersect($activeIds)->count(),
                'missing_total' => (clone $missing)->count(),
                'missing' => $missing->limit(8)->get(['id', 'full_name', 'unit_id'])->map(fn (Employee $e) => [
                    'id' => $e->id, 'full_name' => $e->full_name, 'unit' => $e->unit?->name,
                ]),
            ],
            'latest' => DailyReport::query()->with(['employee:id,full_name', 'snapshotUnit:id,name'])
                ->latest('created_at')->latest('id')->limit(6)->get()
                ->map(fn (DailyReport $r) => [
                    'id' => $r->id,
                    'report_date' => $r->report_date->toDateString(),
                    'created_at' => $r->created_at->toIso8601String(),
                    'employee' => $r->employee->full_name,
                    'unit' => $r->snapshotUnit?->name,
                    'activity_description' => $r->activity_description,
                ]),
        ];
    }

    private function pimpinan(): array
    {
        $activeIds = $this->activePegawaiIds();
        $rows = $this->dailyRows(DailyReport::query()->whereIn('employee_id', $activeIds));
        $byDate = $rows->groupBy('report_date')->map->sum('total');
        [$qStart, $qEnd] = QuarterService::range($this->year, $this->quarter);

        $quarters = collect(range(1, 4))->map(function (int $q) use ($rows, $activeIds) {
            [$start, $end] = QuarterService::range($this->year, $q);

            return ['quarter' => $q, 'label' => 'Triwulan '.QuarterService::roman($q), 'is_current' => $q === $this->quarter]
                + $this->orgCoverage($rows, $activeIds->count(), $start, $end);
        });

        $workdays = QuarterService::workdays($qStart, $qEnd);
        $inQuarter = $rows->filter(fn ($r) => $r->report_date >= $qStart->toDateString() && $r->report_date <= $qEnd->toDateString());
        $perEmployee = $inQuarter->groupBy('employee_id');

        $coverage = Employee::query()->with('unit:id,name')->whereIn('id', $activeIds)->get(['id', 'full_name', 'unit_id'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'full_name' => $e->full_name,
                'unit' => $e->unit?->name,
                'days_reported' => $perEmployee->get($e->id)?->count() ?? 0,
                'workdays' => count($workdays),
                'total' => (int) ($perEmployee->get($e->id)?->sum('total') ?? 0),
            ])
            ->sortBy([['days_reported', 'asc'], ['full_name', 'asc']])
            ->values();

        $current = $quarters[$this->quarter - 1];

        return [
            'role' => 'pimpinan',
            'period' => $this->periodInfo(),
            'active_employees' => $activeIds->count(),
            'quarter' => $current,
            'avg_per_employee_per_day' => $activeIds->count() && count($workdays)
                ? round($current['total'] / ($activeIds->count() * count($workdays)), 1)
                : 0,
            'monthly' => $this->monthly($byDate),
            'quarters' => $quarters->all(),
            'by_unit' => $this->byUnit($qStart, $qEnd),
            'coverage' => $coverage->take(10)->all(),
        ];
    }

    /** Jumlah laporan per (pegawai, tanggal) dalam tahun berjalan. */
    private function dailyRows(Builder $query): Collection
    {
        return $query->toBase()
            ->whereNull('deleted_at')
            ->whereBetween('report_date', [$this->year.'-01-01', $this->year.'-12-31'])
            ->selectRaw('employee_id, report_date, COUNT(*) as total')
            ->groupBy('employee_id', 'report_date')
            ->get()
            ->map(function ($row) {
                $row->report_date = substr((string) $row->report_date, 0, 10);
                $row->total = (int) $row->total;

                return $row;
            });
    }

    private function monthly(Collection $byDate): array
    {
        $totals = array_fill(1, 12, 0);
        foreach ($byDate as $date => $count) {
            $totals[(int) substr($date, 5, 2)] += $count;
        }

        return collect($totals)->map(fn (int $total, int $month) => [
            'month' => $month,
            'label' => substr(QuarterService::MONTHS[$month], 0, 3),
            'total' => $month > $this->today->month ? null : $total,
        ])->values()->all();
    }

    /** Cakupan satu pegawai: jumlah kegiatan dan hari kerja yang terlapor. */
    private function coverageFor(Collection $byDate, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $workdays = QuarterService::workdays($start, $end);
        $inRange = $byDate->filter(fn ($_, $date) => $date >= $start->toDateString() && $date <= $end->toDateString());

        return [
            'total' => (int) $inRange->sum(),
            'days_reported' => count(array_intersect($workdays, $inRange->keys()->all())),
            'workdays' => count($workdays),
        ];
    }

    private function orgCoverage(Collection $rows, int $employees, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $workdays = QuarterService::workdays($start, $end);
        $workdaySet = array_flip($workdays);
        $inRange = $rows->filter(fn ($r) => $r->report_date >= $start->toDateString() && $r->report_date <= $end->toDateString());
        $covered = $inRange->filter(fn ($r) => isset($workdaySet[$r->report_date]))->count();
        $possible = $employees * count($workdays);

        return [
            'total' => (int) $inRange->sum('total'),
            'workdays' => count($workdays),
            'coverage_percent' => $possible ? (int) round($covered / $possible * 100) : null,
        ];
    }

    private function byUnit(CarbonImmutable $start, CarbonImmutable $end): array
    {
        $counts = DailyReport::query()->toBase()
            ->whereNull('deleted_at')
            ->whereBetween('report_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('snapshot_unit_id, COUNT(*) as total')
            ->groupBy('snapshot_unit_id')
            ->pluck('total', 'snapshot_unit_id');

        return Unit::query()->withCount('employees')->orderBy('name')->get()
            ->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'name' => $unit->name,
                'employees' => $unit->employees_count,
                'total' => (int) ($counts[$unit->id] ?? 0),
            ])
            ->filter(fn (array $u) => $u['total'] > 0 || $u['employees'] > 0)
            ->sortByDesc('total')->values()->all();
    }

    /** Pegawai yang wajib melapor: akun aktif berperan Pegawai. */
    private function activePegawaiIds(): Collection
    {
        return User::query()->where('is_active', true)->where('role', Role::Pegawai)
            ->whereNotNull('employee_id')->pluck('employee_id');
    }

    private function periodInfo(): array
    {
        [$start, $end] = QuarterService::range($this->year, $this->quarter);

        return [
            'today' => $this->today->toDateString(),
            'year' => $this->year,
            'quarter' => $this->quarter,
            'quarter_label' => 'Triwulan '.QuarterService::roman($this->quarter),
            'quarter_start' => $start->toDateString(),
            'quarter_end' => $end->toDateString(),
        ];
    }
}
