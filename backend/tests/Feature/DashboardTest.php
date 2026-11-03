<?php

namespace Tests\Feature;

use Tests\TestCase;

class DashboardTest extends TestCase
{
    public function test_dasbor_pegawai(): void
    {
        $user = $this->pegawai();
        $this->reportFor($user, '2026-11-03');
        $this->reportFor($user, '2026-11-02');
        $this->reportFor($user, '2026-11-02');
        $this->reportFor($user, '2026-10-01');
        $this->reportFor($user, '2026-02-10');
        $this->reportFor($this->pegawai(), '2026-11-03'); // milik orang lain

        $this->actingAs($user)->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'pegawai')
            ->assertJsonPath('data.today.total', 1)
            ->assertJsonPath('data.month.total', 3)
            ->assertJsonPath('data.month.days_reported', 2)
            ->assertJsonPath('data.month.workdays', 2)          // Senin 2 & Selasa 3 November
            ->assertJsonPath('data.quarter.total', 4)
            ->assertJsonPath('data.quarter.workdays', 24)       // 22 hari kerja Oktober + 2
            ->assertJsonPath('data.monthly.1.total', 1)         // Februari
            ->assertJsonPath('data.monthly.11.total', null)     // Desember belum berjalan
            ->assertJsonPath('data.quarters.3.is_current', true)
            ->assertJsonPath('data.quarters.2.is_locked', true)
            ->assertJsonCount(5, 'data.recent');
    }

    public function test_dasbor_admin(): void
    {
        $a = $this->pegawai();
        $b = $this->pegawai();
        $this->reportFor($a, '2026-11-03');

        $this->actingAs($this->admin())->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'admin')
            ->assertJsonPath('data.employees_total', 2)
            ->assertJsonPath('data.reports_month', 1)
            ->assertJsonPath('data.today.active_employees', 2)
            ->assertJsonPath('data.today.reported', 1)
            ->assertJsonPath('data.today.missing.0.id', $b->employee_id)
            ->assertJsonCount(1, 'data.latest');
    }

    public function test_dasbor_pimpinan(): void
    {
        $a = $this->pegawai();
        $this->reportFor($a, '2026-11-02');
        $this->reportFor($a, '2026-11-03');
        $this->pegawai();

        $this->actingAs($this->pimpinan())->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'pimpinan')
            ->assertJsonPath('data.active_employees', 2)
            ->assertJsonPath('data.quarter.total', 2)
            ->assertJsonPath('data.quarter.coverage_percent', 4)  // 2 hari dari 2 × 24 hari kerja
            ->assertJsonPath('data.coverage.0.days_reported', 0)
            ->assertJsonCount(12, 'data.monthly')
            ->assertJsonCount(4, 'data.quarters');
    }
}
