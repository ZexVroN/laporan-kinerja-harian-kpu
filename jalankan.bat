@echo off
REM ===================================================================
REM  SILAKH - jalankan aplikasi di komputer ini (pengembangan / uji coba)
REM  Klik dua kali berkas ini. Tutup jendela ini untuk mematikan server.
REM ===================================================================
setlocal
title SILAKH - Laporan Kinerja Harian
set "ROOT=%~dp0"
set "PORT=8000"
if defined SILAKH_PORT set "PORT=%SILAKH_PORT%"
set "URL=http://127.0.0.1:%PORT%"

echo.
echo  SILAKH - Sistem Informasi Laporan Kinerja Harian
echo  ------------------------------------------------
echo.

REM Server sudah berjalan (misalnya berkas ini diklik dua kali): cukup buka browser.
curl.exe -s -o nul -m 2 "%URL%/up" >nul 2>nul
if not errorlevel 1 (
    echo  Server sudah berjalan di %URL% - membuka browser...
    if not "%SILAKH_NO_BROWSER%"=="1" start %URL%
    timeout /t 3 >nul
    exit /b 0
)

where php >nul 2>nul
if errorlevel 1 (
    echo  [GAGAL] PHP tidak ditemukan. Pasang XAMPP atau tambahkan C:\xampp\php ke PATH.
    goto :gagal
)

cd /d "%ROOT%backend" || goto :gagal

REM --- Dependensi PHP (sekali saja) ---------------------------------
if not exist "vendor\autoload.php" (
    echo  [1/4] Memasang dependensi PHP ^(composer install^)...
    where composer >nul 2>nul || (echo  [GAGAL] Composer tidak ditemukan. & goto :gagal)
    call composer install --no-interaction || goto :gagal
) else (
    echo  [1/4] Dependensi PHP sudah ada.
)

REM --- Berkas .env (sekali saja) -------------------------------------
if not exist ".env" (
    echo  [2/4] Membuat berkas .env...
    copy /y ".env.example" ".env" >nul
    php artisan key:generate --force || goto :gagal
) else (
    echo  [2/4] Berkas .env sudah ada.
)

REM --- Database: buat bila belum ada, lalu terapkan migrasi baru ------
if not exist "database\database.sqlite" (
    echo  [3/4] Membuat database baru dengan data induk...
    type nul > "database\database.sqlite"
    php artisan migrate --seed --force || goto :gagal
) else (
    echo  [3/4] Memeriksa pembaruan struktur database...
    php artisan migrate --force || goto :gagal
)

REM --- Tampilan (frontend) -------------------------------------------
if not exist "public\spa\index.html" (
    echo  [4/4] Membangun tampilan ^(npm run build^)...
    where npm >nul 2>nul || (echo  [GAGAL] Node.js/npm tidak ditemukan. & goto :gagal)
    pushd "%ROOT%frontend"
    if not exist "node_modules" call npm install || (popd & goto :gagal)
    call npm run build || (popd & goto :gagal)
    popd
) else (
    echo  [4/4] Tampilan sudah dibangun.
)

echo.
echo  Server berjalan di %URL%
echo  Biarkan jendela ini terbuka selama memakai aplikasi.
echo  Untuk mematikan: tutup jendela ini atau tekan Ctrl+C.
echo.

REM Buka browser setelah server siap (dilewati bila SILAKH_NO_BROWSER=1).
if not "%SILAKH_NO_BROWSER%"=="1" (
    start "" /min cmd /c "timeout /t 3 /nobreak >nul && start %URL%"
)

php artisan serve --host=127.0.0.1 --port=%PORT%
goto :eof

:gagal
echo.
echo  Aplikasi tidak dapat dijalankan. Periksa pesan di atas.
pause
exit /b 1
