<?php

namespace Database\Seeders;

use App\Models\Rank;
use Illuminate\Database\Seeder;

class RankSeeder extends Seeder
{
    /** Pangkat dan golongan ruang PNS. */
    private const RANKS = [
        ['I/a', 'Juru Muda'], ['I/b', 'Juru Muda Tk. I'], ['I/c', 'Juru'], ['I/d', 'Juru Tk. I'],
        ['II/a', 'Pengatur Muda'], ['II/b', 'Pengatur Muda Tk. I'], ['II/c', 'Pengatur'], ['II/d', 'Pengatur Tk. I'],
        ['III/a', 'Penata Muda'], ['III/b', 'Penata Muda Tk. I'], ['III/c', 'Penata'], ['III/d', 'Penata Tk. I'],
        ['IV/a', 'Pembina'], ['IV/b', 'Pembina Tk. I'], ['IV/c', 'Pembina Utama Muda'], ['IV/d', 'Pembina Utama Madya'], ['IV/e', 'Pembina Utama'],
    ];

    public function run(): void
    {
        foreach (self::RANKS as $i => [$code, $name]) {
            Rank::query()->updateOrCreate(['code' => $code], ['name' => $name, 'sort_order' => $i + 1]);
        }
    }
}
