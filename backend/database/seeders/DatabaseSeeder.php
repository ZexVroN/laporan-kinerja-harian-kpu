<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Data induk yang aman untuk produksi. Data contoh hanya lewat DemoSeeder.
     */
    public function run(): void
    {
        $this->call([
            RankSeeder::class,
            UnitSeeder::class,
            InitialAdminSeeder::class,
        ]);
    }
}
