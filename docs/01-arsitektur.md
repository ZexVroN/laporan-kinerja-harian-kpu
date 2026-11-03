# Fase 1 — Analisis & Arsitektur (disetujui 3 November 2026)

## Ruang lingkup

Formulir mengikuti prompt proyek, bukan foto referensi. Foto hanya dipakai untuk tema warna.

- Identitas otomatis dari profil: Nama, NIP, Pangkat/Golongan, Jabatan, Unit Kerja.
- Isian pegawai: Tanggal Laporan, Kegiatan Tugas Jabatan (wajib), Keterangan (opsional).
- Bulan, tahun, dan triwulan diturunkan dari tanggal. Satu tanggal boleh berisi banyak kegiatan.
- Tidak ada alur persetujuan. Pimpinan hanya membaca.

## Keputusan

| # | Keputusan |
|---|---|
| 1 | Laporan dapat diubah/dihapus pegawai sampai tanggal 5 bulan pertama setelah triwulan berakhir, lalu terkunci. Administrator dapat membuka atau mengunci manual (tercatat di log). |
| 2 | PDF memakai kop instansi yang diatur Administrator, ditambah blok tanda tangan pegawai dan atasan langsung (`supervisor_id`). |
| 3 | Nama aplikasi dan instansi diatur di Pengaturan, tidak ditulis di kode. Nama pratinjau: SILAKH. |
| 4 | Pimpinan melihat seluruh organisasi. |
| 5 | Target Hostinger Premium/Business dengan SSH; ada cara alternatif bila tanpa SSH. |

## Arsitektur

- Satu domain: React SPA (hasil build statis) disajikan oleh Laravel; API di `/api/v1`.
- Autentikasi Sanctum mode SPA: cookie sesi `HttpOnly` + CSRF, bukan token di localStorage.
- Laravel 12 (PHP 8.2+), MySQL/MariaDB, DomPDF, Laravel Excel.
- Tanpa queue worker; ekspor dibuat sinkron dengan batas baris. Penjadwal lewat Cron hPanel.
- Lapisan backend: Controller → FormRequest → Service → Model; hak akses lewat Policy dan middleware peran.

## Skema database

```
units ─┐            ranks ─┐
       └─< employees >─────┘   (nip unik, soft delete, supervisor_id → employees)
              │ 1:1 users       (username/email unik, role, is_active)
              └─< daily_reports (report_date, kegiatan, keterangan,
                                 salinan pangkat/jabatan/unit, created_by, updated_by, soft delete)
activity_logs (user_id, action, subject, description, properties JSON, ip, user_agent)
period_locks  (year, quarter, is_locked) — hanya keputusan manual Administrator
settings      (key, value) — kop dan nama instansi
```

Penyesuaian saat implementasi (Fase 3): penyaringan bulan/triwulan memakai rentang `report_date` yang terindeks, bukan kolom terhitung, agar portabel antara MySQL dan SQLite pengujian.

## Matriks hak akses

| Aksi | Pegawai | Pimpinan | Administrator |
|---|:-:|:-:|:-:|
| Buat laporan | milik sendiri | – | – |
| Lihat laporan | milik sendiri | semua | semua |
| Ubah/hapus laporan | milik sendiri, periode belum terkunci | – | semua (diaudit) |
| Rekap triwulan & ekspor | milik sendiri | semua | semua |
| Pegawai, akun, data induk, kunci periode, log, pengaturan | – | – | ✓ |

## Batasan Hostinger shared hosting

| Batasan | Solusi |
|---|---|
| Tidak ada Node.js di server | Build frontend di lokal/GitHub Actions |
| Document root `public_html` | Aplikasi di `~/silakh-app`, isi `public/` ke `public_html`, sesuaikan `index.php` |
| Tidak ada queue worker | Ekspor sinkron, `QUEUE_CONNECTION=sync` |
| `symlink()` sering diblokir | Tidak bergantung pada `storage:link` |
| Memori/waktu eksekusi terbatas | Batas `SILAKH_EXPORT_MAX_ROWS`; rekap besar lewat Excel |
| Ekstensi PHP | Aktifkan `zip`, `gd`, `mbstring`, `intl` di hPanel |
