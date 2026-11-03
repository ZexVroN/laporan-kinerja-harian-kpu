<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Rank;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdministrationTest extends TestCase
{
    public function test_pengaturan_instansi_dipakai_di_halaman_masuk_dan_rekap(): void
    {
        $admin = $this->admin();
        $payload = [
            'app_name' => 'SILAKH Uji',
            'instansi_nama' => 'KPU Kabupaten Uji',
            'instansi_kop_1' => 'KOMISI PEMILIHAN UMUM',
            'instansi_kop_2' => 'KABUPATEN UJI',
            'instansi_alamat' => 'Jl. Contoh No. 1',
            'kota_ttd' => 'Kota Uji',
        ];

        $this->actingAs($admin)->putJson('/api/v1/settings', $payload)->assertOk()->assertJsonPath('data.kota_ttd', 'Kota Uji');
        $this->getJson('/api/v1/app-info')->assertJsonPath('data.app_name', 'SILAKH Uji');

        $user = $this->pegawai();
        $this->reportFor($user, '2026-08-01');
        $this->actingAs($user)->getJson('/api/v1/reports/summary?year=2026&quarter=3')
            ->assertJsonPath('data.settings.instansi_alamat', 'Jl. Contoh No. 1');

        $this->actingAs($admin)->putJson('/api/v1/settings', [...$payload, 'app_name' => ''])
            ->assertStatus(422)->assertJsonPath('errors.app_name.0', 'Nama aplikasi wajib diisi.');
        $this->actingAs($user)->putJson('/api/v1/settings', $payload)->assertForbidden();
        $this->assertDatabaseHas('activity_logs', ['action' => 'settings.updated']);
    }

    public function test_penyaringan_log_aktivitas(): void
    {
        $admin = $this->admin();
        $user = $this->pegawai();
        $this->actingAs($user)->postJson('/api/v1/reports', ['report_date' => '2026-11-03', 'activity_description' => 'Kegiatan untuk diuji di log'])->assertCreated();

        $this->actingAs($admin)->getJson('/api/v1/activity-logs?action=report.')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.action', 'report.created')
            ->assertJsonPath('data.0.user.username', $user->username);

        $this->actingAs($admin)->getJson('/api/v1/activity-logs?q=tidak-ada-yang-cocok')->assertJsonCount(0, 'data');
        $this->actingAs($admin)->getJson('/api/v1/activity-logs?date_from=2026-11-04')->assertJsonCount(0, 'data');
        $this->assertGreaterThan(0, ActivityLog::count());
    }

    public function test_pangkat_yang_dipakai_tidak_dapat_dihapus(): void
    {
        $admin = $this->admin();
        $used = $this->pegawai()->employee->rank;
        $unused = Rank::factory()->create();

        $this->actingAs($admin)->deleteJson("/api/v1/ranks/{$used->id}")->assertStatus(422);
        $this->actingAs($admin)->deleteJson("/api/v1/ranks/{$unused->id}")->assertOk();
    }

    public function test_daftar_laporan_tanpa_kueri_n_plus_1(): void
    {
        $admin = $this->admin();
        foreach (range(1, 6) as $_) {
            $user = $this->pegawai();
            foreach (range(1, 5) as $d) {
                $this->reportFor($user, "2026-10-0{$d}");
            }
        }

        DB::enableQueryLog();
        $this->actingAs($admin)->getJson('/api/v1/reports?per_page=30')->assertOk()->assertJsonCount(30, 'data');
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        // 30 laporan dari 6 pegawai: jumlah kueri harus tetap, tidak bertambah per baris.
        $this->assertLessThan(12, $queries, "Terlalu banyak kueri: {$queries}");
    }
}
