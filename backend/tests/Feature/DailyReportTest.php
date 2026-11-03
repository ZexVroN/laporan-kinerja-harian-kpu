<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\DailyReport;
use App\Models\PeriodLock;
use Tests\TestCase;

class DailyReportTest extends TestCase
{
    private const VALID = [
        'report_date' => '2026-11-03',
        'activity_description' => 'Menyusun konsep surat undangan rapat koordinasi',
        'remarks' => 'Diserahkan ke Kasubbag',
    ];

    public function test_pegawai_menyimpan_laporan_dengan_identitas_otomatis(): void
    {
        $user = $this->pegawai(['position' => 'Pengelola Keuangan']);

        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)
            ->assertCreated()
            ->assertJsonPath('message', 'Laporan berhasil disimpan.')
            ->assertJsonPath('data.month', 11)
            ->assertJsonPath('data.year', 2026)
            ->assertJsonPath('data.quarter', 4)
            ->assertJsonPath('data.snapshot.position', 'Pengelola Keuangan')
            ->assertJsonPath('data.employee.nip', $user->employee->nip);

        $report = DailyReport::sole();
        $this->assertSame($user->employee_id, $report->employee_id);
        $this->assertSame($user->employee->unit_id, $report->snapshot_unit_id);
        $this->assertSame($user->id, $report->created_by);
        $this->assertDatabaseHas('activity_logs', ['action' => 'report.created', 'subject_id' => $report->id, 'user_id' => $user->id]);
    }

    public function test_employee_id_dari_klien_diabaikan(): void
    {
        $user = $this->pegawai();
        $other = $this->pegawai();

        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'employee_id' => $other->employee_id])->assertCreated();

        $this->assertSame($user->employee_id, DailyReport::sole()->employee_id);
    }

    public function test_beberapa_kegiatan_pada_tanggal_yang_sama(): void
    {
        $user = $this->pegawai();

        foreach (['Kegiatan pertama hari ini', 'Kegiatan kedua hari ini', 'Kegiatan ketiga hari ini'] as $text) {
            $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'activity_description' => $text])->assertCreated();
        }

        $this->assertSame(3, DailyReport::query()->where('report_date', '2026-11-03')->count());
    }

    public function test_validasi_laporan(): void
    {
        $user = $this->pegawai();

        $this->actingAs($user)->postJson('/api/v1/reports', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['report_date', 'activity_description'])
            ->assertJsonPath('errors.report_date.0', 'Tanggal laporan wajib diisi.');

        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'report_date' => '2026-11-04'])
            ->assertJsonPath('errors.report_date.0', 'Tanggal laporan tidak boleh melebihi hari ini.');

        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'activity_description' => 'pendek'])
            ->assertJsonPath('errors.activity_description.0', 'Kegiatan tugas jabatan minimal 10 karakter.');

        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'activity_description' => str_repeat('a', 1001)])
            ->assertJsonValidationErrors('activity_description');

        $this->assertSame(0, DailyReport::count());
    }

    public function test_pegawai_hanya_melihat_laporan_sendiri(): void
    {
        $user = $this->pegawai();
        $other = $this->pegawai();
        $mine = $this->reportFor($user);
        $theirs = $this->reportFor($other);

        $this->actingAs($user)->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);

        // Parameter employee_id milik orang lain tidak membuka cakupan.
        $this->actingAs($user)->getJson('/api/v1/reports?employee_id='.$other->employee_id)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id);

        $this->actingAs($user)->getJson("/api/v1/reports/{$theirs->id}")->assertForbidden();
        $this->actingAs($user)->putJson("/api/v1/reports/{$theirs->id}", ['activity_description' => 'Mengubah milik orang lain'])->assertForbidden();
        $this->actingAs($user)->deleteJson("/api/v1/reports/{$theirs->id}")->assertForbidden();
        $this->assertNotSoftDeleted($theirs);
    }

    public function test_pegawai_mengubah_laporan_sendiri_dan_tercatat(): void
    {
        $user = $this->pegawai();
        $report = $this->reportFor($user, '2026-11-02', ['activity_description' => 'Uraian kegiatan lama sekali']);

        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['activity_description' => 'Uraian kegiatan yang sudah diperbaiki'])
            ->assertOk()
            ->assertJsonPath('data.activity_description', 'Uraian kegiatan yang sudah diperbaiki');

        $log = ActivityLog::query()->where('action', 'report.updated')->sole();
        $this->assertSame('Uraian kegiatan lama sekali', $log->properties['old']['activity_description']);
        $this->assertSame('Uraian kegiatan yang sudah diperbaiki', $log->properties['new']['activity_description']);
        $this->assertSame($user->id, $report->fresh()->updated_by);
    }

    public function test_pegawai_menghapus_laporan_sendiri_secara_lunak(): void
    {
        $user = $this->pegawai();
        $report = $this->reportFor($user);

        $this->actingAs($user)->deleteJson("/api/v1/reports/{$report->id}")->assertOk();

        $this->assertSoftDeleted($report);
        $this->assertDatabaseHas('activity_logs', ['action' => 'report.deleted', 'subject_id' => $report->id]);
        $this->actingAs($user)->getJson('/api/v1/reports')->assertJsonCount(0, 'data');
    }

    public function test_periode_terkunci_menolak_perubahan_pegawai(): void
    {
        $user = $this->pegawai();
        $old = $this->reportFor($user, '2026-09-30'); // Triwulan III, terkunci sejak 6 Oktober

        $this->actingAs($user)->putJson("/api/v1/reports/{$old->id}", ['activity_description' => 'Mencoba mengubah periode lama'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Periode Triwulan III 2026 sudah dikunci. Hubungi Administrator untuk perubahan.');
        $this->actingAs($user)->deleteJson("/api/v1/reports/{$old->id}")->assertForbidden();
        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'report_date' => '2026-09-29'])
            ->assertStatus(422)->assertJsonValidationErrors('report_date');

        // Memindahkan laporan terbuka ke periode terkunci juga ditolak.
        $open = $this->reportFor($user, '2026-11-02');
        $this->actingAs($user)->putJson("/api/v1/reports/{$open->id}", ['report_date' => '2026-09-29'])
            ->assertStatus(422)->assertJsonValidationErrors('report_date');
    }

    public function test_batas_kunci_otomatis_tanggal_lima(): void
    {
        $user = $this->pegawai();
        $report = $this->reportFor($user, '2026-09-30');

        $this->travelTo('2026-10-05 23:00:00');
        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['activity_description' => 'Masih dalam masa tenggang'])->assertOk();

        $this->travelTo('2026-10-06 00:00:01');
        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['activity_description' => 'Sudah lewat masa tenggang'])->assertForbidden();
    }

    public function test_admin_membuka_kunci_periode(): void
    {
        $admin = $this->admin();
        $user = $this->pegawai();
        $report = $this->reportFor($user, '2026-09-30');

        $this->actingAs($admin)->putJson('/api/v1/period-locks', ['year' => 2026, 'quarter' => 3, 'is_locked' => false])
            ->assertOk()->assertJsonPath('data.is_locked', false);
        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['activity_description' => 'Diperbaiki setelah dibuka'])->assertOk();

        $this->actingAs($admin)->putJson('/api/v1/period-locks', ['year' => 2026, 'quarter' => 4, 'is_locked' => true])->assertOk();
        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)->assertStatus(422);

        $this->actingAs($admin)->putJson('/api/v1/period-locks', ['year' => 2026, 'quarter' => 4, 'is_locked' => null])->assertOk();
        $this->assertSame(0, PeriodLock::query()->where('quarter', 4)->count());
        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)->assertCreated();

        $this->actingAs($admin)->getJson('/api/v1/period-locks?year=2026')
            ->assertOk()
            ->assertJsonPath('data.2.is_locked', false)
            ->assertJsonPath('data.2.mode', 'manual')
            ->assertJsonPath('data.3.mode', 'otomatis');
    }

    public function test_admin_mengoreksi_laporan_terkunci_dengan_jejak_audit(): void
    {
        $admin = $this->admin();
        $report = $this->reportFor($this->pegawai(), '2026-08-10', ['remarks' => 'Lama']);

        $this->actingAs($admin)->putJson("/api/v1/reports/{$report->id}", ['remarks' => 'Dikoreksi admin'])->assertOk();

        $log = ActivityLog::query()->where('action', 'report.updated')->sole();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame(['remarks' => 'Lama'], $log->properties['old']);
    }

    public function test_pimpinan_hanya_membaca(): void
    {
        $pimpinan = $this->pimpinan();
        $report = $this->reportFor($this->pegawai());
        $this->reportFor($this->pegawai());

        $this->actingAs($pimpinan)->getJson('/api/v1/reports')->assertOk()->assertJsonCount(2, 'data');
        $this->actingAs($pimpinan)->getJson("/api/v1/reports/{$report->id}")->assertOk();
        $this->actingAs($pimpinan)->postJson('/api/v1/reports', self::VALID)->assertForbidden();
        $this->actingAs($pimpinan)->putJson("/api/v1/reports/{$report->id}", ['remarks' => 'ubah'])->assertForbidden();
        $this->actingAs($pimpinan)->deleteJson("/api/v1/reports/{$report->id}")->assertForbidden();
    }

    public function test_admin_tidak_mengisi_laporan(): void
    {
        $this->actingAs($this->admin())->postJson('/api/v1/reports', self::VALID)->assertForbidden();
    }

    public function test_penyaringan_pencarian_dan_urutan(): void
    {
        $admin = $this->admin();
        $unitA = $this->unit('Unit A');
        $a = $this->pegawai(['full_name' => 'Agustinus Mahuze', 'unit_id' => $unitA->id]);
        $b = $this->pegawai(['full_name' => 'Benediktus Kaize']);

        $this->reportFor($a, '2026-01-15', ['activity_description' => 'Rekonsiliasi KPPN Merauke']);
        $this->reportFor($a, '2026-05-02');
        $this->reportFor($b, '2026-11-02');
        $this->reportFor($b, '2026-10-01');

        $get = fn (string $q) => $this->actingAs($admin)->getJson('/api/v1/reports?'.$q)->assertOk();

        $get('year=2026&quarter=4')->assertJsonCount(2, 'data');
        $get('year=2026&month=1')->assertJsonCount(1, 'data');
        $get('date_from=2026-05-01&date_to=2026-10-31')->assertJsonCount(2, 'data');
        $get('unit_id='.$unitA->id)->assertJsonCount(2, 'data');
        $get('employee_id='.$b->employee_id)->assertJsonCount(2, 'data');
        $get('q=KPPN')->assertJsonCount(1, 'data');
        $get('q='.urlencode($b->employee->nip))->assertJsonCount(2, 'data');
        $get('sort=report_date&direction=asc')->assertJsonPath('data.0.report_date', '2026-01-15');
        $get('sort=employee_name&direction=desc')->assertJsonPath('data.0.employee.full_name', 'Benediktus Kaize');
        $get('per_page=5')->assertJsonPath('meta.per_page', 5)->assertJsonPath('meta.total', 4);

        $this->actingAs($admin)->getJson('/api/v1/reports?quarter=4')->assertStatus(422)->assertJsonValidationErrors('year');
    }

    public function test_riwayat_tetap_benar_setelah_data_pegawai_berubah(): void
    {
        $user = $this->pegawai(['position' => 'Pengelola Keuangan']);
        $report = $this->reportFor($user, '2026-07-01');
        $oldUnit = $user->employee->unit_id;

        $user->employee->update(['position' => 'Analis Keuangan', 'unit_id' => $this->unit('Unit Baru')->id]);

        $report->refresh();
        $this->assertSame('Pengelola Keuangan', $report->snapshot_position);
        $this->assertSame($oldUnit, $report->snapshot_unit_id);
        $this->assertSame($user->employee_id, $report->employee_id);
    }
}
