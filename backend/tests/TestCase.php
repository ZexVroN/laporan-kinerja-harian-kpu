<?php

namespace Tests;

use App\Models\DailyReport;
use App\Models\Employee;
use App\Models\Unit;
use App\Models\User;
use App\Services\QuarterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /** Selasa, 3 November 2026 — Triwulan IV berjalan, Triwulan III sudah terkunci otomatis (5 Oktober). */
    protected const TODAY = '2026-11-03 10:00:00';

    protected function setUp(): void
    {
        parent::setUp();

        QuarterService::flushLockCache();
        $this->travelTo(self::TODAY);
        // Permintaan SPA dari domain yang sama (Sanctum stateful).
        $this->withHeader('Referer', config('app.url'));
    }

    protected function pegawai(array $employee = []): User
    {
        $user = User::factory()->pegawai()->create();
        if ($employee) {
            $user->employee->update($employee);
        }

        return $user->refresh();
    }

    protected function admin(): User
    {
        return User::factory()->admin()->create();
    }

    protected function pimpinan(): User
    {
        return User::factory()->pimpinan()->create();
    }

    protected function reportFor(User|Employee $owner, string $date = '2026-11-02', array $attributes = []): DailyReport
    {
        $employee = $owner instanceof User ? $owner->employee : $owner;

        return DailyReport::factory()->for($employee)->create(['report_date' => $date, ...$attributes]);
    }

    protected function unit(string $name = 'Subbagian Uji'): Unit
    {
        return Unit::factory()->create(['name' => $name]);
    }
}
