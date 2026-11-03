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
        $mine = $this->reportFor($user, '2026-08-01', ['activity_description' => '=HYPERLINK("http://contoh")', 'remarks' => 'Catatan A']);
        $this->reportFor($user, '2026-09-02', ['activity_description' => 'Menyusun laporan realisasi anggaran']);
        $this->reportFor($other, '2026-08-01', ['activity_description' => 'Rahasia milik orang lain']);

        $response = $this->actingAs($user)->get('/api/v1/reports/export?year=2026&quarter=3&format=xlsx')->assertOk();
        $this->assertInstanceOf(BinaryFileResponse::class, $response->baseResponse);

        $sheet = $this->readSheet($response);
        $rows = $sheet->toArray(null, false, false);

        $this->assertSame('LAPORAN KINERJA HARIAN PEGAWAI', $rows[0][0]);
        $this->assertSame('Periode: Triwulan III (Juli – September) Tahun 2026', $rows[2][0]);
        $this->assertSame(['No.', 'Tanggal', 'Nama Pegawai', 'NIP', 'Pangkat/Golongan', 'Jabatan', 'Unit Kerja', 'Kegiatan Tugas Jabatan', 'Keterangan'], $rows[3]);

        $data = array_slice($rows, 4, 2);
        $this->assertSame('01/08/2026', $data[0][1]);
        $this->assertSame('Siti Nanda', $data[0][2]);
        $this->assertSame(\App\Models\Employee::formatNip($user->employee->nip), $data[0][3]);
        $this->assertSame($mine->activity_description, $data[0][7]);
        $this->assertSame('Catatan A', $data[0][8]);
        $this->assertSame('Menyusun laporan realisasi anggaran', $data[1][7]);

        // Teks diawali "=" disimpan sebagai teks, bukan rumus.
        $this->assertSame(\PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING, $sheet->getCell('H5')->getDataType());

        $flat = json_encode($rows);
        $this->assertStringNotContainsString('Rahasia milik orang lain', $flat);
        $this->assertSame(2, end($rows)[8]);
    }

    public function test_pimpinan_dapat_mengekspor_seluruh_pegawai(): void
    {
        $this->reportFor($this->pegawai(), '2026-11-02');
        $this->reportFor($this->pegawai(), '2026-11-02');

        $response = $this->actingAs($this->pimpinan())->get('/api/v1/reports/export?year=2026&quarter=4&format=xlsx')->assertOk();
        $rows = $this->readSheet($response)->toArray(null, false, false);

        $this->assertSame(2, end($rows)[8]);
    }

    /** Baca berkas dengan pengikat bawaan, bukan pengikat ekspor yang masih terpasang statis. */
    private function readSheet($response): Worksheet
    {
        Cell::setValueBinder(new DefaultValueBinder());

        return IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
    }

    public function test_ekspor_tanpa_login_ditolak(): void
    {
        $this->getJson('/api/v1/reports/export?year=2026&quarter=3&format=pdf')->assertStatus(401);
    }
}
