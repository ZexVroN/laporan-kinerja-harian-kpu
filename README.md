# SILAKH — Sistem Informasi Laporan Kinerja Harian

Cadangan dokumentasi LHK triwulanan: pegawai mencatat kegiatan harian, Pimpinan dan Administrator memantau, dan rekap triwulan diunduh sebagai PDF atau Excel.

| Folder | Isi |
|---|---|
| `backend/` | Laravel 12 (PHP 8.2+), REST API `/api/v1`, Sanctum (cookie sesi SPA), DomPDF, Laravel Excel |
| `frontend/` | React + Vite + TypeScript (Fase 4) |
| `docs/` | Catatan proses: [Fase 1 — arsitektur](docs/01-arsitektur.md), [Fase 2 — desain UI](docs/02-desain-ui.md) |

## Status

| Fase | Status |
|---|---|
| 1. Analisis & arsitektur | Selesai |
| 2. Desain UI/UX | Selesai |
| 3. Database & backend | Selesai — 43 tes lulus (SQLite & MariaDB 10.4) |
| 4. Frontend React | Berikutnya |
| 5. Integrasi & pengujian | – |
| 6. Deployment Hostinger | – |

## Menjalankan backend secara lokal

Prasyarat: PHP 8.2+ dengan ekstensi `pdo_mysql`/`pdo_sqlite`, `mbstring`, `intl`, `gd`, `zip`, `dom`; Composer.

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed          # pangkat, unit kerja, admin awal dari ADMIN_* bila diisi
php artisan silakh:create-admin     # atau buat administrator secara interaktif
php artisan serve
```

Data contoh untuk pengembangan (ditolak di produksi; semua akun berkata sandi `password`: `admin`, `pimpinan`, `pegawai`):

```bash
php artisan db:seed --class=DemoSeeder
```

## Tes

```bash
php artisan test                                   # SQLite in-memory
DB_CONNECTION=mysql DB_DATABASE=silakh_test php artisan test   # MariaDB/MySQL
```

## Ringkasan API

Semua endpoint di bawah `/api/v1`; selain `app-info` dan `auth/login` wajib masuk. SPA mengambil `/sanctum/csrf-cookie` lalu mengirim `X-XSRF-TOKEN`.

| Endpoint | Peran |
|---|---|
| `POST auth/login`, `POST auth/logout`, `GET auth/me`, `PUT auth/password` | Semua |
| `GET dashboard` | Semua (isi sesuai peran) |
| `GET/POST reports`, `GET/PUT/DELETE reports/{id}` | Pegawai: miliknya sendiri, periode belum dikunci · Admin: semua (diaudit) · Pimpinan: baca |
| `GET reports/summary`, `GET reports/export?format=pdf\|xlsx` | Semua, sesuai cakupan peran |
| `GET units`, `GET ranks` | Semua |
| `GET employees/options` | Admin, Pimpinan |
| `employees`, `users/{id}/status`, `users/{id}/reset-password`, ubah `units`/`ranks`, `period-locks`, `activity-logs`, `settings` | Admin |

Penyaring laporan: `q`, `employee_id`, `unit_id`, `date_from`, `date_to`, `year`, `month`, `quarter`, `sort` (`report_date`, `created_at`, `employee_name`), `direction`, `per_page`.

## Aturan penting

- Bulan, tahun, dan triwulan diturunkan dari `report_date` (Triwulan I Jan–Mar … IV Okt–Des).
- Setiap laporan menyimpan salinan pangkat, jabatan, dan unit saat dibuat, sehingga dokumen periode lama tetap akurat.
- Periode terkunci otomatis setelah tanggal `SILAKH_LOCK_GRACE_DAY` (bawaan 5) bulan pertama triwulan berikutnya; Administrator dapat membuka atau mengunci manual.
- Pegawai yang memiliki laporan tidak dapat dihapus, hanya dinonaktifkan.
- Hari libur nasional belum diperhitungkan dalam hitungan hari kerja.
