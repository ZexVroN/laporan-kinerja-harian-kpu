<?php

return [

    /*
    | Laporan triwulan dikunci otomatis setelah tanggal ini pada bulan pertama
    | triwulan berikutnya (contoh: 5 → Triwulan III terkunci mulai 6 Oktober).
    | Administrator dapat membuka atau mengunci periode secara manual.
    */
    'lock_grace_day' => (int) env('SILAKH_LOCK_GRACE_DAY', 5),

    // Batas baris untuk ekspor sekali unduh; menjaga memori di shared hosting.
    'export_max_rows' => (int) env('SILAKH_EXPORT_MAX_ROWS', 5000),

    // Akun administrator awal untuk `php artisan db:seed` (kosongkan setelah dipakai).
    'initial_admin' => [
        'username' => env('ADMIN_USERNAME'),
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

];
