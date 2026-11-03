<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DefaultValueBinder;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

/** Satu lembar: judul, periode, lalu tabel kegiatan seluruh pegawai dalam cakupan. */
class ReportExport extends DefaultValueBinder implements FromArray, WithColumnWidths, WithCustomValueBinder, WithEvents, WithTitle
{
    /**
     * Semua teks ditulis apa adanya: NIP tidak berubah menjadi notasi ilmiah, dan isian
     * pengguna yang diawali "=" tidak pernah dieksekusi sebagai rumus.
     */
    public function bindValue(Cell $cell, $value): bool
    {
        if (is_int($value)) {
            $cell->setValueExplicit($value, DataType::TYPE_NUMERIC);
        } else {
            $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
        }

        return true;
    }

    /** Judul kolom => lebar. Urutan di sini menentukan urutan kolom di lembar kerja. */
    private const COLUMNS = [
        'No.' => 6,
        'Tanggal' => 12,
        'Waktu' => 13,
        'Nama Pegawai' => 26,
        'NIP' => 24,
        'Pangkat/Golongan' => 24,
        'Jabatan' => 26,
        'Unit Kerja' => 30,
        'Rencana Aksi' => 34,
        'Jenis Pekerjaan' => 16,
        'Kegiatan Harian' => 60,
        'Sumber Data' => 22,
        'Target' => 9,
        'Realisasi' => 10,
        'Satuan' => 11,
        'Status' => 11,
        'Bukti Dukung' => 40,
        'Keterangan' => 30,
    ];

    private const CENTERED = ['No.', 'Tanggal', 'Waktu', 'Jenis Pekerjaan', 'Target', 'Realisasi', 'Satuan', 'Status'];

    private const HEADER_ROW = 4;

    public function __construct(private readonly array $compiled) {}

    public function title(): string
    {
        return 'Laporan Kinerja';
    }

    public function array(): array
    {
        $settings = $this->compiled['settings'];
        $rows = [
            [$this->compiled['title']],
            [trim($settings['instansi_nama'])],
            ['Periode: '.$this->compiled['period_label']],
            array_keys(self::COLUMNS),
        ];

        $no = 1;
        foreach ($this->compiled['groups'] as $group) {
            $e = $group['employee'];
            foreach ($group['reports'] as $r) {
                $rows[] = [
                    $no++,
                    $r['report_date_formatted'],
                    $r['time_range'] ?? '-',
                    $e['full_name'],
                    $e['nip_formatted'],
                    $e['rank'] ?? '-',
                    $e['position'],
                    $e['unit'],
                    $r['action_plan'] ?? '-',
                    $r['work_type'] ?? '-',
                    $r['activity_description'],
                    $r['data_source'] ?? '',
                    $r['target'] ?? '-',
                    $r['realization'] ?? '-',
                    $r['unit_of_measure'] ?? '-',
                    $r['status'] ?? '-',
                    $r['evidence_url'] ?? '',
                    $r['remarks'] ?? '',
                ];
            }
        }

        $total = array_fill(0, count(self::COLUMNS), '');
        $total[count(self::COLUMNS) - 2] = 'Jumlah kegiatan';
        $total[count(self::COLUMNS) - 1] = $this->compiled['total'];
        $rows[] = $total;

        return $rows;
    }

    public function columnWidths(): array
    {
        $widths = [];
        foreach (array_values(self::COLUMNS) as $i => $width) {
            $widths[Coordinate::stringFromColumnIndex($i + 1)] = $width;
        }

        return $widths;
    }

    private static function letter(string $heading): string
    {
        return Coordinate::stringFromColumnIndex(array_search($heading, array_keys(self::COLUMNS), true) + 1);
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $last = $sheet->getHighestRow();
                $header = self::HEADER_ROW;
                $lastCol = Coordinate::stringFromColumnIndex(count(self::COLUMNS));
                $beforeLastCol = Coordinate::stringFromColumnIndex(count(self::COLUMNS) - 1);

                foreach ([1, 2, 3] as $row) {
                    $sheet->mergeCells("A{$row}:{$lastCol}{$row}");
                }
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A2')->getFont()->setBold(true);
                $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("A{$header}:{$lastCol}{$header}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1520']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle("A{$header}:{$lastCol}{$last}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'BFBFBF']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                ]);
                foreach (self::CENTERED as $heading) {
                    $col = self::letter($heading);
                    $sheet->getStyle("{$col}{$header}:{$col}{$last}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                }
                $sheet->getStyle("{$beforeLastCol}{$last}:{$lastCol}{$last}")->getFont()->setBold(true);

                $sheet->freezePane('A'.($header + 1));
                $sheet->setAutoFilter("A{$header}:{$lastCol}".($last - 1));
                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setPaperSize(PageSetup::PAPERSIZE_A4)
                    ->setFitToWidth(1)->setFitToHeight(0)
                    ->setRowsToRepeatAtTopByStartAndEnd($header, $header);
            },
        ];
    }
}
