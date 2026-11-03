<?php

namespace App\Services;

use App\Models\DailyReport;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Satu tempat untuk cakupan data per peran dan penyaringan laporan.
 * Pegawai selalu dibatasi pada laporannya sendiri, apa pun parameter yang dikirim.
 */
class ReportQuery
{
    /** @param array<string, mixed> $filters hasil validasi ReportFilterRequest */
    public static function build(User $user, array $filters): Builder
    {
        $query = DailyReport::query();

        if (! $user->role->seesAllReports()) {
            $query->where('daily_reports.employee_id', $user->employee_id ?? 0);
        } elseif (! empty($filters['employee_id'])) {
            $query->where('daily_reports.employee_id', $filters['employee_id']);
        }

        if (! empty($filters['unit_id']) && $user->role->seesAllReports()) {
            $query->where('daily_reports.snapshot_unit_id', $filters['unit_id']);
        }

        [$from, $to] = self::dateRange($filters);
        if ($from) {
            $query->where('daily_reports.report_date', '>=', $from->toDateString());
        }
        if ($to) {
            $query->where('daily_reports.report_date', '<=', $to->toDateString());
        }

        if (! empty($filters['q'])) {
            $term = '%'.addcslashes($filters['q'], '%_\\').'%';
            $query->where(function (Builder $q) use ($term) {
                $q->where('daily_reports.activity_description', 'like', $term)
                    ->orWhere('daily_reports.remarks', 'like', $term)
                    ->orWhereHas('employee', fn (Builder $e) => $e->where('full_name', 'like', $term)->orWhere('nip', 'like', $term));
            });
        }

        return $query;
    }

    public static function applySort(Builder $query, array $filters): Builder
    {
        $direction = $filters['direction'] ?? 'desc';

        return match ($filters['sort'] ?? 'report_date') {
            'employee_name' => $query
                ->join('employees', 'employees.id', '=', 'daily_reports.employee_id')
                ->orderBy('employees.full_name', $direction)
                ->orderBy('daily_reports.report_date', 'desc')
                ->select('daily_reports.*'),
            'created_at' => $query->orderBy('daily_reports.created_at', $direction),
            default => $query->orderBy('daily_reports.report_date', $direction)
                ->orderBy('daily_reports.start_time', $direction)
                ->orderBy('daily_reports.id', $direction),
        };
    }

    /**
     * Bulan/triwulan/tahun diterjemahkan menjadi rentang tanggal agar indeks report_date terpakai.
     * Jika ada beberapa batas, diambil irisannya.
     *
     * @return array{0: ?CarbonImmutable, 1: ?CarbonImmutable}
     */
    public static function dateRange(array $filters): array
    {
        $from = ! empty($filters['date_from']) ? CarbonImmutable::parse($filters['date_from']) : null;
        $to = ! empty($filters['date_to']) ? CarbonImmutable::parse($filters['date_to']) : null;

        if (! empty($filters['year'])) {
            $year = (int) $filters['year'];
            if (! empty($filters['month'])) {
                $start = CarbonImmutable::create($year, (int) $filters['month'], 1);
                $periodFrom = $start;
                $periodTo = $start->endOfMonth()->startOfDay();
            } elseif (! empty($filters['quarter'])) {
                [$periodFrom, $periodTo] = QuarterService::range($year, (int) $filters['quarter']);
            } else {
                $periodFrom = CarbonImmutable::create($year, 1, 1);
                $periodTo = CarbonImmutable::create($year, 12, 31);
            }

            $from = $from ? $from->max($periodFrom) : $periodFrom;
            $to = $to ? $to->min($periodTo) : $periodTo;
        }

        return [$from, $to];
    }
}
