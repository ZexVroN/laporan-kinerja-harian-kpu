<?php

namespace Tests\Feature;

use App\Services\QuarterService;
use Carbon\CarbonImmutable;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Tests\TestCase;

class QuarterlyReportTest extends TestCase
{
    public function test_pembagian_triwulan(): void
    {
        $cases = ['2026-01-01' => 1, '2026-03-31' => 1, '2026-04-01' => 2, '2026-06-30' => 2, '2026-07-01' => 3, '2026-09-30' => 3, '2026-10-01' => 4, '2026-12-31' => 4];
        foreach ($cases as $date => $quarter) {
            $this->assertSame($quarter, QuarterService::quarterOf(CarbonImmutable::parse($date)), $date);
        }

        [$start, $end] = QuarterService::range(2026, 3);
        $this->assertSame(['2026-07-01', '2026-09-30'], [$start->toDateString(), $end->toDateString()]);
        $this->assertSame('Triwulan IV (Oktober – Desember) Tahun 2026', QuarterService::label(2026, 4));
        $this->assertSame('2026-10-05 23:59:59', QuarterService::editDeadline(2026, 3)->format('Y-m-d H:i:s'));
    }

    public function test_rekap_triwulan_mengelompokkan_per_pegawai(): void
    {
        $admin = $this->admin();
        $a = $this->pegawai(['full_name' => 'Agustinus']);
        $b = $this->pegawai(['full_name' => 'Benediktus']);

        $this->reportFor($a, '2026-06-30'); // Triwulan II — tidak ikut
        $this->reportFor($a, '2026-07-01');
        $this->reportFor($a, '2026-07-01');
        $this->reportFor($a, '2026-09-30');
        $this->reportFor($b, '2026-08-17');
        $this->reportFor($b, '2026-10-01'); // Triwulan IV — tidak ikut

        $this->actingAs($admin)->getJson('/api/v1/reports/summary?year=2026&quarter=3')
            ->assertOk()
            ->assertJsonPath('data.period_label', 'Triwulan III (Juli – September) Tahun 2026')
            ->assertJsonPath('data.total', 4)
            ->assertJsonCount(2, 'data.groups')
            ->assertJsonPath('data.groups.0.employee.full_name', 'Agustinus')
            ->assertJsonPath('data.groups.0.total', 3)
            ->assertJsonPath('data.groups.0.days_reported', 2)
            ->assertJsonPath('data.groups.0.reports.0.report_date', '2026-07-01')
            ->assertJsonPath('data.groups.1.total', 1);

        $this->actingAs($admin)->getJson('/api/v1/reports/summary?year=2026&quarter=3&employee_id='.$b->employee_id)
            ->assertJsonPath('data.total', 1);

        $this->actingAs($admin)->getJson('/api/v1/reports/summary')->assertStatus(422);
    }

    public function test_rekap_bulanan(): void
    {
        $user = $this->pegawai(['full_name' => 'Siti Nanda']);
        $this->reportFor($user, '2026-09-30'); // September — tidak ikut
        $this->reportFor($user, '2026-10-01');
        $this->reportFor($user, '2026-10-01');
        $this->reportFor($user, '2026-10-31');
        $this->reportFor($user, '2026-11-02'); // November — tidak ikut

        $this->actingAs($user)->getJson('/api/v1/reports/summary?year=2026&month=10')
            ->assertOk()
            ->assertJsonPath('data.period_type', 'month')
            ->assertJsonPath('data.period_label', 'Bulan Oktober Tahun 2026')
            ->assertJsonPath('data.period_from', '2026-10-01')
            ->assertJsonPath('data.period_to', '2026-10-31')
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.groups.0.days_reported', 2);

        $pdf = $this->actingAs($user)->get('/api/v1/reports/export?year=2026&month=10&format=pdf')->assertOk();
        $this->assertStringContainsString('laporan-kinerja-bulan-oktober-tahun-2026-siti-nanda.pdf', $pdf->headers->get('Content-Disposition'));

        $rows = $this->readSheet($this->actingAs($user)->get('/api/v1/reports/export?year=2026&month=10&format=xlsx'))->toArray(null, false, false);
        $this->assertSame('Periode: Bulan Oktober Tahun 2026', $rows[2][0]);
        $this->assertSame(3, end($rows)[17]);

        // Tanpa tahun, bulan saja ditolak.
        $this->actingAs($user)->getJson('/api/v1/reports/summary?month=10')->assertStatus(422)->assertJsonValidationErrors('year');
    }

    public function test_pegawai_hanya_merekap_laporan_sendiri(): void
    {
        $user = $this->pegawai();
        $other = $this->pegawai();
        $this->reportFor($user, '2026-08-01');
        $this->reportFor($other, '2026-08-01');

        $this->actingAs($user)->getJson('/api/v1/reports/summary?year=2026&quarter=3&employee_id='.$other->employee_id)
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.groups.0.employee.id', $user->employee_id);
    }

    public function test_ekspor_pdf(): void
    {
        $user = $this->pegawai(['full_name' => 'Siti Nanda']);
        $this->reportFor($user, '2026-08-01');

        $response = $this->actingAs($user)->get('/api/v1/reports/export?year=2026&quarter=3&format=pdf')->assertOk();

        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('laporan-kinerja-triwulan-iii-juli-september-tahun-2026-siti-nanda.pdf', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertDatabaseHas('activity_logs', ['action' => 'report.exported', 'user_id' => $user->id]);
    }

    public function test_ekspor_excel_sesuai_basis_data_dan_cakupan(): void
    {
        $user = $this->pegawai(['full_name' => 'Siti Nanda']);
        $other = $this->pegawai(['full_name' => 'Orang Lain']);
        $mine = $this->reportFor($user, '2026-08-01', [
            'activity_description' => '=HYPERLINK("http://contoh")', 'remarks' => 'Catatan A', 'start_time' => '07:30', 'end_time' => '09:00',
            'action_plan_id' => null, 'action_plan_name' => 'Rapat koordinasi', 'work_type' => 'trajectory', 'data_source' => 'Disposisi',
            'target' => 4, 'realization' => 3, 'unit_of_measure' => 'Berkas', 'evidence_url' => 'https://drive.google.com/x', 'is_completed' => false,
        ]);
        $this->reportFor($user, '2026-09-02', ['activity_description' => 'Menyusun laporan realisasi anggaran']);
        $this->reportFor($other, '2026-08-01', ['activity_description' => 'Rahasia milik orang lain']);

        $response = $this->actingAs($user)->get('/api/v1/reports/export?year=2026&quarter=3&format=xlsx')->assertOk();
        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);

        $sheet = $this->readSheet($response);
        $rows = $sheet->toArray(null, false, false);

        $this->assertSame('LAPORAN KINERJA HARIAN PEGAWAI', $rows[0][0]);
        $this->assertSame('Periode: Triwulan III (Juli – September) Tahun 2026', $rows[2][0]);
        $this->assertSame([
            'No.', 'Tanggal', 'Waktu', 'Nama Pegawai', 'NIP', 'Pangkat/Golongan', 'Jabatan', 'Unit Kerja', 'Rencana Aksi', 'Jenis Pekerjaan',
            'Kegiatan Harian', 'Sumber Data', 'Target', 'Realisasi', 'Satuan', 'Status', 'Bukti Dukung', 'Keterangan',
        ], $rows[3]);

        $row = array_combine($rows[3], $rows[4]);
        $this->assertSame('01/08/2026', $row['Tanggal']);
        $this->assertSame('07:30–09:00', $row['Waktu']);
        $this->assertSame('Siti Nanda', $row['Nama Pegawai']);
        $this->assertSame(\App\Models\Employee::formatNip($user->employee->nip), $row['NIP']);
        $this->assertSame('Rapat koordinasi', $row['Rencana Aksi']);
        $this->assertSame('Trajectory', $row['Jenis Pekerjaan']);
        $this->assertSame($mine->activity_description, $row['Kegiatan Harian']);
        $this->assertSame('Disposisi', $row['Sumber Data']);
        $this->assertSame(4, $row['Target']);
        $this->assertSame(3, $row['Realisasi']);
        $this->assertSame('Berkas', $row['Satuan']);
        $this->assertSame('Berlanjut', $row['Status']);
        $this->assertSame('https://drive.google.com/x', $row['Bukti Dukung']);
        $this->assertSame('Catatan A', $row['Keterangan']);
        $this->assertSame('Menyusun laporan realisasi anggaran', array_combine($rows[3], $rows[5])['Kegiatan Harian']);

        // Teks diawali "=" disimpan sebagai teks, bukan rumus (kolom K = Kegiatan Harian).
        $this->assertSame(\PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING, $sheet->getCell('K5')->getDataType());

        $flat = json_encode($rows);
        $this->assertStringNotContainsString('Rahasia milik orang lain', $flat);
        $this->assertSame(2, end($rows)[17]);
    }

    public function test_pimpinan_dapat_mengekspor_seluruh_pegawai(): void
    {
        $this->reportFor($this->pegawai(), '2026-11-02');
        $this->reportFor($this->pegawai(), '2026-11-02');

        $response = $this->actingAs($this->pimpinan())->get('/api/v1/reports/export?year=2026&quarter=4&format=xlsx')->assertOk();
        $rows = $this->readSheet($response)->toArray(null, false, false);

        $this->assertSame(2, end($rows)[17]);
    }

    /** Baca berkas dengan pengikat bawaan, bukan pengikat ekspor yang masih terpasang statis. */
    private function readSheet($response): Worksheet
    {
        Cell::setValueBinder(new DefaultValueBinder());

        return IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
    }

    public function test_pdf_dibatasi_jumlah_baris_excel_tetap_bisa(): void
    {
        config(['silakh.pdf_max_rows' => 3]);
        $user = $this->pegawai();
        foreach (['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06'] as $date) {
            $this->reportFor($user, $date);
        }

        $this->actingAs($user)->getJson('/api/v1/reports/summary?year=2026&quarter=3')->assertJsonPath('data.limits.pdf_max_rows', 3);
        $this->actingAs($user)->getJson('/api/v1/reports/export?year=2026&quarter=3&format=pdf')
            ->assertStatus(422)
            ->assertJsonPath('errors.format.0', 'PDF dibatasi 3 kegiatan per unduhan (4 dipilih). Gunakan Excel, atau saring per unit kerja/pegawai.');
        $this->actingAs($user)->get('/api/v1/reports/export?year=2026&quarter=3&format=xlsx')->assertOk();
        $this->actingAs($user)->get('/api/v1/reports/export?year=2026&quarter=3&format=pdf&date_to=2026-08-05')->assertOk();
    }

    public function test_ekspor_tanpa_login_ditolak(): void
    {
        $this->getJson('/api/v1/reports/export?year=2026&quarter=3&format=pdf')->assertStatus(401);
    }
}
