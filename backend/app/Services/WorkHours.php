<?php

namespace App\Services;

/**
 * Pilihan jam kegiatan (bawaan 07:30–16:30, kelipatan 30 menit), diatur di config/silakh.php.
 */
class WorkHours
{
    /** @return list<string> contoh: ['07:30', '08:00', …, '16:30'] */
    public static function slots(): array
    {
        $config = config('silakh.work_hours');
        $step = max(1, (int) $config['step']);
        $start = self::toMinutes($config['start']);
        $end = self::toMinutes($config['end']);

        $slots = [];
        for ($m = $start; $m <= $end; $m += $step) {
            $slots[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        }

        return $slots;
    }

    /** @return array{start: string, end: string, step: int, slots: list<string>} */
    public static function describe(): array
    {
        $config = config('silakh.work_hours');

        return ['start' => $config['start'], 'end' => $config['end'], 'step' => (int) $config['step'], 'slots' => self::slots()];
    }

    public static function toMinutes(string $time): int
    {
        [$h, $m] = array_map('intval', explode(':', $time));

        return $h * 60 + $m;
    }

    /** "07:30:00" atau "07:30" → "07:30"; null tetap null. */
    public static function short(?string $time): ?string
    {
        return $time === null || $time === '' ? null : substr($time, 0, 5);
    }
}
