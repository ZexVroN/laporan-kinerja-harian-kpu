<?php

use Illuminate\Support\Facades\Route;

/*
| Frontend React (hasil `npm run build` di folder frontend) disajikan dari public/spa.
| Semua alamat selain API diarahkan ke index.html; React Router menangani halaman.
*/
Route::get('/{path?}', function () {
    $index = public_path('spa/index.html');

    abort_unless(is_file($index), 503, 'Frontend belum dibangun. Jalankan `npm run build` di folder frontend.');

    return response()->file($index, [
        'Content-Type' => 'text/html; charset=UTF-8',
        // index.html selalu diambil ulang agar versi aset terbaru langsung dipakai.
        'Cache-Control' => 'no-cache, no-store, must-revalidate',
    ]);
})->where('path', '^(?!api/|sanctum/|up$|spa/).*$');
