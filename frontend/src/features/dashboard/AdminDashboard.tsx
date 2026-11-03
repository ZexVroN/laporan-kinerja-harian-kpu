import { ArrowRight, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, ProgressBar, StatTile } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { Input } from '@/components/ui/form'
import { formatDateFull, formatDateShort, formatNumber, formatTime, initials, percent } from '@/lib/format'
import type { AdminDashboard as Data } from '@/lib/types'
import { UnitBars } from './charts'

export function AdminDashboard({ data }: { data: Data }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const reportedPct = percent(data.today.reported, data.today.active_employees)

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold tracking-tight">Ringkasan Sistem</h1>
          <p className="text-sm text-muted">{data.period.quarter_label} {data.period.year} · data per {formatDateFull(data.period.today)}</p>
        </div>
        <form
          role="search"
          className="flex flex-wrap gap-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(`/admin/pegawai?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <div className="relative w-[300px] max-w-full">
            <label htmlFor="admin-search" className="sr-only">Cari pegawai</label>
            <Search className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted" aria-hidden="true" />
            <Input id="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pegawai berdasarkan nama atau NIP" className="h-[42px] pl-10.5" />
          </div>
          <Button asChild className="h-[42px]">
            <Link to="/admin/pegawai?baru=1"><Plus aria-hidden="true" />Tambah Pegawai</Link>
          </Button>
        </form>
      </div>

      <section aria-label="Ringkasan" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <StatTile label="Pegawai Terdaftar" value={data.employees_total} hint={`di ${data.units_total} unit kerja`} />
        <StatTile label="Akun Aktif" value={data.accounts_active} hint={`${data.accounts_inactive} akun dinonaktifkan`} />
        <StatTile label={`Total Laporan ${data.period.year}`} value={formatNumber(data.reports_year)} hint="kegiatan sejak 1 Januari" />
        <StatTile label="Laporan Bulan Ini" value={formatNumber(data.reports_month)} hint={`${data.month_workdays} hari kerja berjalan`} />
      </section>

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[3_1_440px] pb-6">
          <CardHeader title="Laporan per Unit Kerja" description={`Jumlah kegiatan ${data.period.quarter_label} ${data.period.year}`} />
          <div className="px-5 pt-5 sm:px-6"><UnitBars units={data.by_unit} showStaff /></div>
        </Card>

        <Card className="flex min-w-0 flex-[2_1_300px] flex-col gap-4 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold">Aktivitas Hari Ini</h2>
            <p className="text-[13px] text-muted">{formatDateFull(data.period.today)}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-extrabold tabular-nums">{data.today.reported}</span>
            <span className="text-sm text-muted">dari {data.today.active_employees} pegawai sudah melapor</span>
          </div>
          <ProgressBar value={reportedPct} className="h-2.5" label={`${data.today.reported} dari ${data.today.active_employees} pegawai sudah melapor`} />
          <h3 className="mt-1.5 text-[13px] font-bold tracking-wider text-muted uppercase">Belum melapor ({data.today.missing_total})</h3>
          {data.today.missing.length === 0 ? (
            <p className="text-sm text-success">Semua pegawai aktif sudah melapor.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.today.missing.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-extrabold text-gold-700">{initials(m.full_name)}</span>
                  <div className="flex min-w-0 flex-col">
                    <strong className="truncate text-sm font-semibold">{m.full_name}</strong>
                    <span className="truncate text-xs text-muted">{m.unit}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.today.missing_total > data.today.missing.length && (
            <span className="text-[13px] text-muted">dan {data.today.missing_total - data.today.missing.length} pegawai lainnya</span>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          bordered
          title="Laporan Terbaru"
          action={<Button asChild variant="soft" size="sm" className="h-10"><Link to="/laporan">Lihat Semua<ArrowRight aria-hidden="true" /></Link></Button>}
        />
        {data.latest.length === 0 ? (
          <EmptyState title="Belum ada laporan" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf9f7] text-left">
                  {['Waktu', 'Pegawai', 'Kegiatan Harian', 'Unit Kerja'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase first:pl-6 last:pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.latest.map((l) => (
                  <tr key={l.id} className="border-t border-[#f1eeea] align-top">
                    <td className="py-3 pr-3 pl-6 whitespace-nowrap text-muted tabular-nums">{formatDateShort(l.report_date)} · {formatTime(l.created_at)}</td>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">{l.employee}</td>
                    <td className="px-3 py-3 leading-relaxed">{l.activity_description}</td>
                    <td className="py-3 pr-6 pl-3 text-[#57534e]">{l.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
