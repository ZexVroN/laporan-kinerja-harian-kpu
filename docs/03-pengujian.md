# Fase 5 — Integrasi & Pengujian (3 November 2026)

Lingkungan: Laravel 12 + MariaDB 10.4 (XAMPP), `APP_DEBUG=false`, frontend hasil `npm run build` disajikan Laravel. Data: `DemoSeeder` (17 akun, ±6.300 laporan tahun 2026).

## Tes otomatis

| Rangkaian | Hasil |
|---|---|
| Backend, SQLite in-memory | 48 tes lulus (319 asersi) |
| Backend, MariaDB 10.4 | 48 tes lulus |
| Frontend `tsc -b` | Lulus tanpa galat |
| Frontend `oxlint` | Tanpa galat (hanya peringatan gaya) |

Cakupan tes backend: autentikasi & pembatasan login, hak akses tiga peran, pembuatan akun, validasi NIP, laporan (buat/ubah/hapus/kunci periode), rekap triwulan, ekspor PDF & Excel (isi dicocokkan dengan basis data), dasbor, pengaturan, log aktivitas, data induk, dan penjaga kueri N+1.

## Skenario ujung-ke-ujung (browser + server nyata)

| # | Skenario | Hasil |
|---|---|---|
| 1 | Masuk dengan kata sandi salah → pesan galat; masuk sebagai Administrator | ✅ |
| 2 | Admin menambah pegawai: validasi klien (NIP, unit, nama pengguna), validasi server (NIP & nama pengguna ganda), kata sandi sementara tampil sekali | ✅ |
| 3 | Pegawai baru masuk dengan kata sandi sementara → dipaksa ganti; Beranda tidak bisa dibuka sebelum diganti | ✅ |
| 4 | Pegawai mengisi laporan; admin menonaktifkan akun di tengah sesi → pegawai langsung keluar dengan pesan; masuk ulang ditolak | ✅ (setelah perbaikan #1) |
| 5 | Admin mengunci Triwulan IV → pegawai melihat lencana "Terkunci", tombol ubah hilang, laporan baru ditolak dengan pesan jelas; dikembalikan ke otomatis | ✅ |
| 6 | Ekspor besar: Excel seluruh pegawai 1 triwulan (1.956 baris) 2,8 detik; PDF per unit 2 detik; batas 5.000 baris bekerja | ✅ (setelah perbaikan #2) |
| 7 | Pengaturan instansi berubah → halaman masuk & kop dokumen ikut berubah; nama aplikasi kosong ditolak | ✅ |
| 8 | Keamanan: akses tanpa login (401), POST tanpa CSRF (419), lihat/ubah/hapus laporan orang lain (403), parameter `employee_id` orang lain diabaikan pada daftar & rekap, semua endpoint admin ditolak untuk pegawai (403), pencarian `' OR 1=1 --` aman | ✅ |
| 9 | XSS: `<script>` dan `<img onerror>` di uraian kegiatan tampil sebagai teks di aplikasi dan di template PDF; tidak ada skrip yang berjalan | ✅ |
| 10 | Admin mengoreksi laporan triwulan terkunci → log menampilkan nilai sebelum & sesudah | ✅ |
| 11 | Data induk: tambah unit, nama ganda ditolak, hapus unit tak terpakai; unit terpakai tidak punya tombol hapus | ✅ |
| 12 | Aktifkan kembali akun & atur ulang kata sandi → kata sandi lama ditolak, kata sandi sementara diterima dan wajib diganti | ✅ |
| 13 | Pembaruan aplikasi saat tab masih terbuka (berkas halaman lama hilang) → muat ulang otomatis sekali; bila tetap gagal, pesan ramah di dalam tata letak | ✅ (setelah perbaikan #3) |
| 14 | Tampilan ponsel 375 px: tanpa gulir horizontal, menu laci, tabel menjadi kartu | ✅ (Fase 4) |

## Temuan & perbaikan

| # | Temuan | Perbaikan |
|---|---|---|
| 1 | Akun dinonaktifkan/sesi berakhir → pengguna dikembalikan ke halaman masuk tanpa penjelasan | Pesan dari server ditampilkan sebagai notifikasi |
| 2 | PDF seluruh pegawai satu triwulan (±2.000 baris) butuh ±20 detik dan ±258 MB memori — berisiko melewati batas shared hosting | Batas PDF `SILAKH_PDF_MAX_ROWS` (bawaan 1.000 ≈ 8 detik), pesan yang mengarahkan ke Excel atau penyaring unit/pegawai, tombol PDF dinonaktifkan di halaman Laporan Triwulan bila melebihi batas, `set_time_limit(120)` bila diizinkan server |
| 3 | Setelah pembaruan aplikasi, tab lama memuat berkas halaman yang sudah tidak ada → layar galat mentah | Muat ulang otomatis sekali (`vite:preloadError`) dan halaman galat berbahasa Indonesia untuk semua rute |

## Catatan untuk produksi

- Waktu respons lokal ±550 ms per permintaan berasal dari server PHP bawaan di Windows tanpa OPcache. Di Hostinger aktifkan OPcache dan jalankan `php artisan config:cache route:cache view:cache` (Fase 6).
- Hari libur nasional belum dikecualikan dari hitungan hari kerja (cakupan pelaporan).
