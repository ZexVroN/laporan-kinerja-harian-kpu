<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\DailyReport;
use App\Models\User;
use App\Services\QuarterService;
use Illuminate\Auth\Access\Response;

class DailyReportPolicy
{
    public function view(User $user, DailyReport $report): bool
    {
        return $user->role->seesAllReports() || $this->owns($user, $report);
    }

    public function create(User $user): Response
    {
        if ($user->role !== Role::Pegawai || ! $user->employee_id) {
            return Response::deny('Hanya pegawai yang memiliki data kepegawaian yang dapat mengisi laporan.');
        }

        return Response::allow();
    }

    public function update(User $user, DailyReport $report): Response
    {
        return $this->modify($user, $report, 'mengubah');
    }

    public function delete(User $user, DailyReport $report): Response
    {
        return $this->modify($user, $report, 'menghapus');
    }

    private function modify(User $user, DailyReport $report, string $verb): Response
    {
        // Administrator boleh mengoreksi kapan pun; setiap perubahan tercatat di log aktivitas.
        if ($user->isAdmin()) {
            return Response::allow();
        }

        if ($user->role !== Role::Pegawai || ! $this->owns($user, $report)) {
            return Response::deny("Anda tidak dapat {$verb} laporan ini.");
        }

        if (QuarterService::isDateLocked($report->report_date)) {
            return Response::deny(self::lockedMessage($report->report_date->year, $report->quarter()));
        }

        return Response::allow();
    }

    private function owns(User $user, DailyReport $report): bool
    {
        return $user->employee_id !== null && $user->employee_id === $report->employee_id;
    }

    public static function lockedMessage(int $year, int $quarter): string
    {
        return 'Periode Triwulan '.QuarterService::roman($quarter)." {$year} sudah dikunci. Hubungi Administrator untuk perubahan.";
    }
}
