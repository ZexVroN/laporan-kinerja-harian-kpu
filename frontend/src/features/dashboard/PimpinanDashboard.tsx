import { Card, CardHeader, ProgressBar } from '@/components/ui/card'
import { formatNumber, parseDate, percent, QUARTER_RANGES } from '@/lib/format'
import type { PimpinanDashboard as Data } from '@/lib/types'
import { MonthlyChart, UnitBars } from './charts'
import { Hero } from './Hero'

export function PimpinanDashboard({ data }: { data: Data }) {
  const month = parseDate(data.period.today).getMonth() + 1
  const kpis = [
    { label: 'Pegawai Aktif', value: formatNumber(data.active_employees) },
    { label: `Kegiatan ${data.quarter.label}`, value: formatNumber(data.quarter.total) },
    { label: 'Cakupan Pelaporan', value: data.quarter.coverage_percent == null ? '–' : `${data.quarter.coverage_percent}%`, gold: true },
    { label: 'Rata-rata / Pegawai / Hari', value: data.avg_per_employee_per_day.toLocaleString('id-ID') },
  ]

  return (
    <>
      <Hero>
        <div className="flex flex-col gap-5.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-gold-300">Ringkasan Eksekutif · {data.period.quarter_label} {data.period.year}</span>
            <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[28px]">Kinerja harian seluruh pegawai</h1>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-px overflow-hidden rounded-[14px] bg-gold-500/35">
            {kpis.map((k) => (
              <div key={k.label} className="flex flex-col gap-1 bg-maroon-900 px-5 py-4">
                <dt className="text-[13px] text-white/75">{k.label}</dt>
                <dd className={`text-[30px] font-bold tabular-nums ${k.gold ? 'text-gold-300' : ''}`}>{k.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Hero>

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[3_1_460px] pb-5">
          <CardHeader title="Tren Kegiatan Bulanan" description={`Seluruh pegawai · ${data.period.year}`} />
          <div className="px-4 pt-4 sm:px-6"><MonthlyChart data={data.monthly} currentMonth={month} year={data.period.year} /></div>
        </Card>

        <Card className="min-w-0 flex-[2_1_300px] pb-5">
          <CardHeader title="Ringkasan per Triwulan" description={`Jumlah kegiatan · ${data.period.year}`} />
          <ul className="flex flex-col gap-2.5 px-5 pt-4 sm:px-6">
            {data.quarters.map((q) => (
              <li key={q.quarter} className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${q.is_current ? 'border-gold-500 bg-gold-100/40' : 'border-[#efece8]'}`}>
                <div className="flex flex-col">
                  <strong className="text-sm">{q.label}</strong>
                  <span className="text-xs text-muted">{QUARTER_RANGES[q.quarter]}{q.is_current ? ' · berjalan' : ''}</span>
                </div>
                <div className="flex flex-col items-end">
                  <strong className="text-lg tabular-nums">{q.workdays ? formatNumber(q.total) : '–'}</strong>
                  <span className="text-xs text-muted">{q.coverage_percent == null ? 'belum dimulai' : `cakupan ${q.coverage_percent}%`}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap gap-5">
        <Card className="min-w-0 flex-[1_1_380px] pb-6">
          <CardHeader title="Kegiatan per Unit Kerja" description={`${data.quarter.label} ${data.period.year}`} />
          <div className="px-5 pt-5 sm:px-6"><UnitBars units={data.by_unit} /></div>
        </Card>

        <Card className="flex min-w-0 flex-[1_1_420px] flex-col overflow-hidden">
          <CardHeader title="Cakupan Pelaporan Pegawai" description="Hari kerja terlapor triwulan ini · terendah lebih dulu" className="pb-3.5" />
          {data.coverage.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted">Belum ada pegawai aktif.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#faf9f7] text-left">
                    <th scope="col" className="py-2.5 pr-3 pl-6 text-xs font-bold tracking-wider text-muted uppercase">Pegawai</th>
                    <th scope="col" className="w-[40%] px-3 py-2.5 text-xs font-bold tracking-wider text-muted uppercase">Cakupan</th>
                    <th scope="col" className="py-2.5 pr-6 pl-3 text-right text-xs font-bold tracking-wider text-muted uppercase">Kegiatan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.coverage.map((c) => {
                    const pct = percent(c.days_reported, c.workdays)
                    return (
                      <tr key={c.id} className="border-t border-[#f1eeea]">
                        <td className="py-2.5 pr-3 pl-6">
                          <div className="flex flex-col"><strong className="font-semibold">{c.full_name}</strong><span className="text-xs text-muted">{c.unit}</span></div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <ProgressBar value={pct} tone={pct < 80 ? 'warning' : 'maroon'} label={`${c.full_name}: ${c.days_reported} dari ${c.workdays} hari`} className="flex-1" />
                            <span className="w-12 text-[13px] font-bold tabular-nums">{c.days_reported}/{c.workdays}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-6 pl-3 text-right tabular-nums">{c.total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
