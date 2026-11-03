import { ArrowRight, CalendarRange, FileText, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader, ProgressBar, StatTile } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'
import { useUser } from '@/features/auth/auth'
import { formatDateShort, formatTime, greeting, MONTHS, parseDate, percent, QUARTER_RANGES } from '@/lib/format'
import type { PegawaiDashboard as Data } from '@/lib/types'
import { MonthlyChart } from './charts'
import { Hero } from './Hero'

export function PegawaiDashboard({ data }: { data: Data }) {
  const user = useUser()
  const employee = user.employee
  const today = parseDate(data.period.today)
  const quarterPct = percent(data.quarter.days_reported, data.quarter.workdays)

  return (
    <>
      <Hero>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-gold-300">{greeting()},</span>
            <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[30px]">{user.name}</h1>
            {employee && (
              <div className="flex flex-wrap gap-x-4.5 gap-y-1 text-sm text-white/82">
                <span className="font-mono text-[13px]">NIP {employee.nip_formatted}</span>
                {employee.rank && <span>{employee.rank.label}</span>}
                <span>{employee.position} · {employee.unit?.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 items-center rounded-full border border-gold-500/50 bg-white/10 px-3.5 text-[13px] font-semibold">
              {data.period.quarter_label} · {QUARTER_RANGES[data.period.quarter]} {data.period.year}
            </span>
            <Button asChild variant="gold" className="h-[46px] rounded-xl font-extrabold shadow-[0_8px_20px_rgb(0_0_0/0.25)]">
              <Link to="/laporan/isi"><Plus strokeWidth={2.4} aria-hidden="true" />Isi Laporan Hari Ini</Link>
            </Button>
          </div>
        </div>
      </Hero>

      <section aria-label="Ringkasan" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatTile
          label="Laporan Hari Ini"
          value={data.today.total}
          badge={data.today.total > 0 ? <Badge tone="success" dot>Sudah mengisi</Badge> : <Badge tone="warning" dot>Belum mengisi</Badge>}
          hint={`kegiatan tercatat untuk ${formatDateShort(data.today.date)}`}
        />
        <StatTile
          label="Laporan Bulan Ini"
          value={data.month.total}
          icon={<FileText />}
          hint={`kegiatan ${MONTHS[today.getMonth()]} · ${data.month.days_reported} dari ${data.month.workdays} hari kerja`}
        />
        <StatTile label={`Laporan ${data.period.quarter_label}`} value={data.quarter.total} icon={<CalendarRange />} hint={`kegiatan sejak ${formatDateShort(data.period.quarter_start)}`} />
        <StatTile
          label="Cakupan Hari Kerja"
          value={<>{data.quarter.days_reported}<span className="text-lg font-bold text-muted"> / {data.quarter.workdays}</span></>}
          badge={<span className={`text-[13px] font-bold ${quarterPct >= 90 ? 'text-success' : 'text-warning'}`}>{quarterPct}%</span>}
        >
          <ProgressBar value={quarterPct} label={`${data.quarter.days_reported} dari ${data.quarter.workdays} hari kerja terlapor`} />
        </StatTile>
      </section>

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[3_1_460px] pb-5">
          <CardHeader title="Jumlah Kegiatan per Bulan" description={`Tahun ${data.period.year} · laporan Anda`} />
          <div className="px-4 pt-4 sm:px-6">
            <MonthlyChart data={data.monthly} currentMonth={today.getMonth() + 1} year={data.period.year} />
          </div>
        </Card>

        <Card className="min-w-0 flex-[2_1_320px] pb-5">
          <CardHeader title="Kelengkapan per Triwulan" description="Hari kerja yang memiliki laporan" />
          <ul className="flex flex-col gap-4.5 px-5 pt-5 sm:px-6">
            {data.quarters.map((q) => {
              const pct = percent(q.days_reported, q.workdays)
              const future = q.workdays === 0
              return (
                <li key={q.quarter} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold">
                      {q.label} <span className="text-[13px] font-medium text-muted">{QUARTER_RANGES[q.quarter]}</span>
                    </span>
                    <span className="text-[13px] font-bold tabular-nums">{future ? '–' : `${q.days_reported} / ${q.workdays} hari`}</span>
                  </div>
                  <ProgressBar value={pct} tone={q.is_current ? 'gold' : 'maroon'} label={`${q.label}: ${pct}% hari kerja terlapor`} className="h-2.5" />
                  <span className="text-xs text-muted">
                    {future
                      ? 'Belum dimulai'
                      : `${q.total} kegiatan · ${q.is_current ? 'sedang berjalan' : q.days_reported === q.workdays ? 'lengkap' : `${q.workdays - q.days_reported} hari tanpa laporan`}${q.is_locked ? ' · terkunci' : ''}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          bordered
          title="Kegiatan Terbaru"
          description="5 laporan terakhir yang Anda simpan"
          action={
            <Button asChild variant="soft" size="sm" className="h-10">
              <Link to="/laporan">Lihat Semua<ArrowRight aria-hidden="true" /></Link>
            </Button>
          }
        />
        {data.recent.length === 0 ? (
          <EmptyState icon={<FileText />} title="Belum ada laporan" description="Mulai catat kegiatan Anda hari ini." action={<Button asChild><Link to="/laporan/isi">Isi Laporan</Link></Button>} />
        ) : (
          <ul>
            {data.recent.map((r) => {
              const d = parseDate(r.report_date)
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#f3f1ee] px-5 py-4 last:border-0 sm:px-6">
                  <div className="flex size-[54px] shrink-0 flex-col items-center justify-center rounded-xl bg-maroon-50 text-maroon-700">
                    <strong className="text-lg leading-none">{String(d.getDate()).padStart(2, '0')}</strong>
                    <span className="text-[11px] font-bold uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                  </div>
                  <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
                    <strong className="text-sm leading-snug font-semibold">{r.activity_description}</strong>
                    <span className="text-[13px] text-muted">{r.remarks || '—'}</span>
                  </div>
                  <span className="text-xs text-muted">{formatDateShort(r.report_date)}{r.time_range ? ` · ${r.time_range}` : ''} · disimpan {formatTime(r.created_at)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
