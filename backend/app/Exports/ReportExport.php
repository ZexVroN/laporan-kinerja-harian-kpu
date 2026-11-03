<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
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

    private const HEADINGS = ['No.', 'Tanggal', 'Waktu', 'Nama Pegawai', 'NIP', 'Pangkat/Golongan', 'Jabatan', 'Unit Kerja', 'Kegiatan Tugas Jabatan', 'Keterangan'];

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
            self::HEADINGS,
        ];

        $no = 1;
        foreach ($this->compiled['groups'] as $group) {
            $e = $group['employee'];
            foreach ($group['reports'] as $report) {
                $rows[] = [
                    $no++,
                    $report['report_date_formatted'],
                    $report['time_range'] ?? '-',
                    $e['full_name'],
                    $e['nip_formatted'],
                    $e['rank'] ?? '-',
                    $e['position'],
                    $e['unit'],
                    $report['activity_description'],
                    $report['remarks'] ?? '',
                ];
            }
        }

        $rows[] = ['', '', '', '', '', '', '', '', 'Jumlah kegiatan', $this->compiled['total']];

        return $rows;
    }

    public function columnWidths(): array
    {
        return ['A' => 6, 'B' => 12, 'C' => 13, 'D' => 26, 'E' => 24, 'F' => 24, 'G' => 26, 'H' => 30, 'I' => 60, 'J' => 30];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $last = $sheet->getHighestRow();
                $header = self::HEADER_ROW;

                foreach ([1, 2, 3] as $row) {
                    $sheet->mergeCells("A{$row}:J{$row}");
                }
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
                $sheet->getStyle('A2')->getFont()->setBold(true);
                $sheet->getStyle('A1:A3')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $sheet->getStyle("A{$header}:J{$header}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '8B1520']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle("A{$header}:J{$last}")->applyFromArray([
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'BFBFBF']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_TOP, 'wrapText' => true],
                ]);
                $sheet->getStyle("A{$header}:C{$last}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("I{$last}:J{$last}")->getFont()->setBold(true);

                $sheet->freezePane('A'.($header + 1));
                $sheet->setAutoFilter("A{$header}:J".($last - 1));
                $sheet->getPageSetup()
                    ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                    ->setPaperSize(PageSetup::PAPERSIZE_A4)
                    ->setFitToWidth(1)->setFitToHeight(0)
                    ->setRowsToRepeatAtTopByStartAndEnd($header, $header);
            },
        ];
    }
}
