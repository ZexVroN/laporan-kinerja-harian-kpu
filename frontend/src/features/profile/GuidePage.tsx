import { CalendarRange, FilePenLine, History, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth'

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="flex gap-4 p-5 sm:p-6">
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-maroon-50 text-maroon-700 [&_svg]:size-5" aria-hidden="true">{icon}</span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-[#3f3a3b]">{children}</div>
      </div>
    </Card>
  )
}

export function GuidePage() {
  const { hasRole } = useAuth()
  const pegawai = hasRole('pegawai')

  return (
    <>
      <PageHeader title="Panduan" description="Cara memakai aplikasi laporan kinerja harian." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {pegawai && (
          <Step icon={<FilePenLine />} title="1. Isi laporan setiap hari kerja">
            <p>Buka <Link to="/laporan/isi" className="font-semibold">Isi Laporan</Link>, pilih tanggal, lalu tulis kegiatan tugas jabatan. Keterangan boleh dikosongkan.</p>
            <p>Klik <strong>Simpan Laporan</strong>. Tanggal tetap terpilih sehingga Anda bisa langsung menambah kegiatan lain pada hari yang sama.</p>
          </Step>
        )}
        <Step icon={<History />} title={pegawai ? '2. Periksa riwayat' : 'Telusuri laporan'}>
          <p>Halaman <Link to="/laporan" className="font-semibold">{pegawai ? 'Riwayat Laporan' : 'Laporan Pegawai'}</Link> dapat disaring berdasarkan triwulan, bulan, tahun, rentang tanggal, dan kata kunci.</p>
          <p>Klik ikon mata untuk melihat detail. {pegawai ? 'Laporan dapat diubah atau dihapus selama periodenya belum terkunci.' : ''}</p>
        </Step>
        <Step icon={<CalendarRange />} title={pegawai ? '3. Unduh rekap triwulan' : 'Rekap triwulan'}>
          <p>Di <Link to="/laporan/triwulan" className="font-semibold">Laporan Triwulan</Link>, pilih tahun dan triwulan. Pratinjau dokumen langsung tampil.</p>
          <p>Unduh sebagai PDF untuk ditandatangani, Excel untuk diolah, atau cetak langsung dari peramban.</p>
        </Step>
        <Step icon={<Lock />} title="Kunci periode">
          <p>Triwulan I: Januari–Maret · II: April–Juni · III: Juli–September · IV: Oktober–Desember.</p>
          <p>Setelah tanggal 5 bulan pertama triwulan berikutnya, laporan periode sebelumnya terkunci. Hubungi Administrator bila perlu koreksi.</p>
        </Step>
      </div>
    </>
  )
}
