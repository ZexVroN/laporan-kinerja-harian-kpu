<?php

namespace App\Services;

use App\Models\DailyReport;
use App\Models\Employee;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Menyusun data rekap (triwulan atau periode bebas) per pegawai langsung dari basis data.
 * Dipakai oleh tampilan rekap, PDF, dan Excel agar isinya selalu sama.
 */
class ReportCompiler
{
    /**
     * @param array<string, mixed> $filters hasil validasi ReportFilterRequest
     * @return array{title: string, period_label: string, generated_at: string, settings: array, groups: list<array>, total: int}
     */
    public static function compile(User $user, array $filters): array
    {
        [$from, $to] = ReportQuery::dateRange($filters);

        if (! $from || ! $to) {
            throw ValidationException::withMessages(['year' => 'Pilih tahun dan triwulan (atau rentang tanggal) untuk rekap.']);
        }

        $query = ReportQuery::build($user, $filters);
        $max = config('silakh.export_max_rows');

        if ((clone $query)->count() > $max) {
            throw ValidationException::withMessages([
                'q' => "Data melebihi {$max} baris. Persempit penyaring (pegawai atau unit kerja).",
            ]);
        }

        $reports = $query->with(['employee.supervisor', 'snapshotUnit'])
            ->orderBy('report_date')->orderBy('id')
            ->get();

        $groups = $reports->groupBy('employee_id')
            ->map(fn (Collection $items) => self::group($items))
            ->sortBy('employee.full_name')
            ->values()
            ->all();

        // Jenis periode menentukan judul dokumen: bulan penuh, triwulan penuh, atau rentang tanggal bebas.
        $noRange = empty($filters['date_from']) && empty($filters['date_to']);
        $periodType = match (true) {
            $noRange && ! empty($filters['month']) => 'month',
            $noRange && ! empty($filters['quarter']) => 'quarter',
            default => 'range',
        };
        $periodLabel = match ($periodType) {
            'month' => 'Bulan '.QuarterService::MONTHS[(int) $filters['month']].' Tahun '.(int) $filters['year'],
            'quarter' => QuarterService::label((int) $filters['year'], (int) $filters['quarter']),
            'range' => QuarterService::formatDate($from).' s.d. '.QuarterService::formatDate($to),
        };

        return [
            'title' => 'LAPORAN KINERJA HARIAN PEGAWAI',
            'period_label' => $periodLabel,
            'period_type' => $periodType,
            'period_from' => $from->toDateString(),
            'period_to' => $to->toDateString(),
            'is_quarter' => $periodType === 'quarter',
            'generated_at' => now()->toIso8601String(),
            'settings' => Setting::allValues(),
            'groups' => $groups,
            'total' => $reports->count(),
            'limits' => ['pdf_max_rows' => config('silakh.pdf_max_rows')],
        ];
    }

    private static function group(Collection $items): array
    {
        /** @var DailyReport $latest identitas mengikuti laporan terakhir dalam periode */
        $latest = $items->last();
        $employee = $latest->employee;

        return [
            'employee' => [
                'id' => $employee->id,
                'full_name' => $employee->full_name,
                'nip' => $employee->nip,
                'nip_formatted' => Employee::formatNip($employee->nip),
                'rank' => $latest->snapshot_rank,
                'position' => $latest->snapshot_position,
                'unit' => $latest->snapshotUnit?->name,
            ],
            'supervisor' => $employee->supervisor ? [
                'full_name' => $employee->supervisor->full_name,
                'nip_formatted' => Employee::formatNip($employee->supervisor->nip),
                'position' => $employee->supervisor->position,
            ] : null,
            'reports' => $items->map(fn (DailyReport $r) => [
                'id' => $r->id,
                'report_date' => $r->report_date->toDateString(),
                'report_date_formatted' => $r->report_date->format('d/m/Y'),
                'activity_description' => $r->activity_description,
                'remarks' => $r->remarks,
            ])->values()->all(),
            'days_reported' => $items->map(fn (DailyReport $r) => $r->report_date->toDateString())->unique()->count(),
            'total' => $items->count(),
        ];
    }
}
