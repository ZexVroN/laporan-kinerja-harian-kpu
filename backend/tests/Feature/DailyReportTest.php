<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\DailyReport;
use App\Models\PeriodLock;
use Tests\TestCase;

class DailyReportTest extends TestCase
{
    private const VALID = [
        'action_plan_id' => 1, // "Penyusunan surat dinas" dari daftar bawaan migrasi
        'work_type' => 'non_trajectory',
        'report_date' => '2026-11-03',
        'start_time' => '07:30',
        'end_time' => '09:00',
        'activity_description' => 'Menyusun konsep surat undangan rapat koordinasi',
        'data_source' => 'SKP / Rencana Aksi',
        'target' => 1,
        'realization' => 1,
        'unit_of_measure' => 'Surat',
        'evidence_url' => 'https://drive.google.com/file/d/contoh',
        'is_completed' => true,
        'remarks' => 'Diserahkan ke Kasubbag',
    ];

    public function test_isian_progress_rencana_aksi_target_realisasi(): void
    {
        $user = $this->pegawai();

        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)
            ->assertCreated()
            ->assertJsonPath('data.action_plan.name', 'Penyusunan surat dinas')
            ->assertJsonPath('data.action_plan.is_other', false)
            ->assertJsonPath('data.work_type_label', 'Non-Trajectory')
            ->assertJsonPath('data.target', 1)
            ->assertJsonPath('data.realization', 1)
            ->assertJsonPath('data.unit_of_measure', 'Surat')
            ->assertJsonPath('data.evidence_url', 'https://drive.google.com/file/d/contoh')
            ->assertJsonPath('data.is_completed', true);

        // "Lainnya": tanpa action_plan_id, nama diambil dari isian bebas.
        $other = [...self::VALID, 'action_plan_id' => null, 'action_plan_other' => 'Rapat koordinasi dengan Bawaslu', 'is_completed' => false];
        $this->actingAs($user)->postJson('/api/v1/reports', $other)
            ->assertCreated()
            ->assertJsonPath('data.action_plan.name', 'Rapat koordinasi dengan Bawaslu')
            ->assertJsonPath('data.action_plan.is_other', true)
            ->assertJsonPath('data.is_completed', false);

        $cases = [
            [['action_plan_id' => null], 'action_plan_other', 'Pilih Rencana Aksi, atau isi Rencana Aksi lainnya.'],
            [['action_plan_id' => 999], 'action_plan_id', 'Rencana Aksi yang dipilih tidak tersedia.'],
            [['work_type' => 'lain'], 'work_type', null],
            [['target' => -1], 'target', null],
            [['realization' => 1.5], 'realization', null],
            [['unit_of_measure' => 'Liter'], 'unit_of_measure', 'Satuan yang dipilih tidak valid.'],
            [['evidence_url' => 'http://tidak-aman.com'], 'evidence_url', 'Bukti dukung harus berupa tautan https:// yang valid.'],
            [['evidence_url' => 'bukan tautan'], 'evidence_url', 'Bukti dukung harus berupa tautan https:// yang valid.'],
        ];
        foreach ($cases as [$override, $field, $message]) {
            $response = $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, ...$override])->assertStatus(422)->assertJsonValidationErrors($field);
            if ($message) {
                $response->assertJsonPath("errors.{$field}.0", $message);
            }
        }

        // Realisasi boleh melebihi target.
        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'target' => 1, 'realization' => 3])->assertCreated();
    }

    public function test_rencana_aksi_nonaktif_dan_nama_tersalin(): void
    {
        $user = $this->pegawai();
        $plan = \App\Models\ActionPlan::query()->find(1);
        $report = $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)->json('data.id');

        // Admin mengganti nama: laporan lama tetap menyimpan nama saat dibuat.
        $plan->update(['name' => 'Penyusunan naskah dinas', 'is_active' => false]);
        $this->actingAs($user)->getJson("/api/v1/reports/{$report}")->assertJsonPath('data.action_plan.name', 'Penyusunan surat dinas');

        // Rencana Aksi nonaktif tidak bisa dipilih untuk laporan baru...
        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)->assertStatus(422)->assertJsonValidationErrors('action_plan_id');
        // ...tetapi laporan lama yang memakainya tetap bisa diubah.
        $this->actingAs($user)->putJson("/api/v1/reports/{$report}", [...self::VALID, 'remarks' => 'Diperbarui'])->assertOk();

        $this->actingAs($user)->getJson('/api/v1/reports?action_plan_id=1')->assertJsonCount(1, 'data');
        $this->actingAs($user)->getJson('/api/v1/reports?status=berlanjut')->assertJsonCount(0, 'data');
        $this->actingAs($user)->getJson('/api/v1/reports?q=naskah')->assertJsonCount(0, 'data');
    }

    public function test_jam_kegiatan_kelipatan_30_menit_dalam_jam_kerja(): void
    {
        $user = $this->pegawai();

        $this->actingAs($user)->postJson('/api/v1/reports', self::VALID)
            ->assertCreated()
            ->assertJsonPath('data.start_time', '07:30')
            ->assertJsonPath('data.end_time', '09:00');

        $cases = [
            [['start_time' => null], 'start_time', 'Jam mulai wajib diisi.'],
            [['start_time' => '07:45'], 'start_time', 'Jam mulai harus antara 07:30 dan 16:30 dengan kelipatan 30 menit.'],
            [['start_time' => '07:00'], 'start_time', 'Jam mulai harus antara 07:30 dan 16:30 dengan kelipatan 30 menit.'],
            [['end_time' => '17:00'], 'end_time', 'Jam selesai harus antara 07:30 dan 16:30 dengan kelipatan 30 menit.'],
            [['start_time' => '10:00', 'end_time' => '10:00'], 'end_time', 'Jam selesai harus setelah jam mulai.'],
            [['start_time' => '10:00', 'end_time' => '09:30'], 'end_time', 'Jam selesai harus setelah jam mulai.'],
            [['start_time' => 'pagi'], 'start_time', null],
        ];
        foreach ($cases as [$override, $field, $message]) {
            $response = $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, ...$override])->assertStatus(422)->assertJsonValidationErrors($field);
            if ($message) {
                $response->assertJsonPath("errors.{$field}.0", $message);
            }
        }

        // Batas akhir 16:30 sah sebagai jam selesai.
        $this->actingAs($user)->postJson('/api/v1/reports', [...self::VALID, 'start_time' => '16:00', 'end_time' => '16:30'])->assertCreated();
        $this->assertSame(2, DailyReport::count());
    }

    public function test_ubah_jam_sebagian_dibandingkan_dengan_jam_tersimpan(): void
    {
        $user = $this->pegawai();
        $report = $this->reportFor($user, '2026-11-02', ['start_time' => '08:00', 'end_time' => '09:00']);

        // Hanya jam selesai dikirim: dibandingkan dengan jam mulai yang tersimpan (08:00).
        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['end_time' => '07:30'])
            ->assertStatus(422)->assertJsonPath('errors.end_time.0', 'Jam selesai harus setelah jam mulai.');
        $this->actingAs($user)->putJson("/api/v1/reports/{$report->id}", ['end_time' => '11:30'])
            ->assertOk()->assertJsonPath('data.end_time', '11:30');
    }

    public function test_daftar_diurutkan_menurut_jam_dalam_satu_tanggal(): void
    {
        $user = $this->pegawai();
        $this->reportFor($user, '2026-11-02', ['start_time' => '13:00', 'end_time' => '14:00', 'activity_description' => 'Siang hari']);
        $this->reportFor($user, '2026-11-02', ['start_time' => '07:30', 'end_time' => '08:00', 'activity_description' => 'Pagi hari']);

        $this->actingAs($user)->getJson('/api/v1/reports?direction=asc')
            ->assertJsonPath('data.0.activity_description', 'Pagi hari')
            ->assertJsonPath('data.1.activity_description', 'Siang hari');
        $this->getJson('/api/v1/app-info')->assertJsonPath('data.work_hours.slots.0', '07:30')->assertJsonPath('data.work_hours.slots.18', '16:30');
    }

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
            ->assertJsonPath('errors.activity_description.0', 'Kegiatan harian minimal 10 karakter.');

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
