<?php

namespace App\Services;

use App\Models\PeriodLock;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;

/**
 * Aturan periode: Triwulan I Jan–Mar, II Apr–Jun, III Jul–Sep, IV Okt–Des.
 */
class QuarterService
{
    public const MONTHS = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    private const ROMAN = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV'];

    public static function quarterOf(CarbonInterface $date): int
    {
        return intdiv($date->month - 1, 3) + 1;
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} awal dan akhir triwulan (inklusif). */
    public static function range(int $year, int $quarter): array
    {
        $start = CarbonImmutable::create($year, ($quarter - 1) * 3 + 1, 1)->startOfDay();

        return [$start, $start->addMonths(2)->endOfMonth()->startOfDay()];
    }

    public static function roman(int $quarter): string
    {
        return self::ROMAN[$quarter];
    }

    public static function label(int $year, int $quarter): string
    {
        [$start, $end] = self::range($year, $quarter);

        return sprintf('Triwulan %s (%s – %s) Tahun %d',
            self::roman($quarter), self::MONTHS[$start->month], self::MONTHS[$end->month], $year);
    }

    public static function formatDate(CarbonInterface $date): string
    {
        return $date->day.' '.self::MONTHS[$date->month].' '.$date->year;
    }

    /** Batas akhir pengeditan oleh pegawai: akhir hari ke-N bulan pertama triwulan berikutnya. */
    public static function editDeadline(int $year, int $quarter): CarbonImmutable
    {
        [, $end] = self::range($year, $quarter);

        return $end->addDay()->addDays(config('silakh.lock_grace_day') - 1)->endOfDay();
    }

    public static function isLocked(int $year, int $quarter, ?CarbonInterface $now = null): bool
    {
        $override = self::overrides()["{$year}-{$quarter}"] ?? null;

        if ($override !== null) {
            return $override;
        }

        return ($now ?? now())->greaterThan(self::editDeadline($year, $quarter));
    }

    /** @var array<string, bool>|null keputusan kunci manual, dimuat sekali per permintaan */
    private static ?array $overrides = null;

    /** @return array<string, bool> */
    private static function overrides(): array
    {
        return self::$overrides ??= PeriodLock::query()->get(['year', 'quarter', 'is_locked'])
            ->mapWithKeys(fn (PeriodLock $lock) => ["{$lock->year}-{$lock->quarter}" => $lock->is_locked])
            ->all();
    }

    public static function flushLockCache(): void
    {
        self::$overrides = null;
    }

    public static function isDateLocked(CarbonInterface $date): bool
    {
        return self::isLocked($date->year, self::quarterOf($date));
    }

    /**
     * Hari kerja (Senin–Jumat) dalam rentang, dipotong sampai hari ini.
     * Hari libur nasional belum diperhitungkan.
     *
     * @return list<string> tanggal Y-m-d
     */
    public static function workdays(CarbonInterface $start, CarbonInterface $end): array
    {
        $end = CarbonImmutable::parse($end)->min(today());

        if ($end->lessThan($start)) {
            return [];
        }

        $days = [];
        foreach (CarbonPeriod::create($start, $end) as $day) {
            if (! $day->isWeekend()) {
                $days[] = $day->toDateString();
            }
        }

        return $days;
    }
}
