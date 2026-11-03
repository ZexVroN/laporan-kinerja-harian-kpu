<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /** Struktur awal sekretariat; nama dapat diubah Administrator lewat menu Unit & Pangkat. */
    private const UNITS = [
        ['Sekretariat', 'SEK'],
        ['Subbagian Keuangan, Umum dan Logistik', 'KUL'],
        ['Subbagian Teknis Penyelenggaraan Pemilu, Partisipasi dan Hubungan Masyarakat', 'TPH'],
        ['Subbagian Perencanaan, Data dan Informasi', 'PDI'],
        ['Subbagian Hukum dan Sumber Daya Manusia', 'HSD'],
    ];

    public function run(): void
    {
        foreach (self::UNITS as [$name, $code]) {
            Unit::query()->firstOrCreate(['code' => $code], ['name' => $name]);
        }
    }
}
