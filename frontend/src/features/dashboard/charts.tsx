import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatNumber, MONTHS } from '@/lib/format'
import type { MonthlyPoint, UnitStat } from '@/lib/types'

interface MonthlyChartProps {
  data: MonthlyPoint[]
  currentMonth: number
  year: number
}

/** Satu seri: jumlah kegiatan per bulan. Bulan berjalan diarsir emas agar tidak terbaca sebagai penurunan. */
export function MonthlyChart({ data, currentMonth, year }: MonthlyChartProps) {
  const rows = data.map((d) => ({ ...d, value: d.total ?? 0 }))
  const summary = data.filter((d) => d.total != null).map((d) => `${MONTHS[d.month - 1]} ${d.total}`).join(', ')

  return (
    <figure className="m-0">
      <div className="h-[230px] w-full" role="img" aria-label={`Jumlah kegiatan per bulan tahun ${year}: ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 18, right: 4, bottom: 0, left: -12 }} barCategoryGap="22%">
            <defs>
              <pattern id="running" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="#E9D29A" />
                <rect width="3" height="6" fill="#C9A24B" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="#ECE8E4" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#D9D4CF' }} tick={{ fontSize: 12, fill: '#6B6466' }} interval={0} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B6466' }} allowDecimals={false} tickFormatter={(v: number) => formatNumber(v)} width={44} />
            <Tooltip
              cursor={{ fill: 'rgb(139 21 32 / 0.06)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (MonthlyPoint & { value: number }) | undefined
                if (!active || !p) return null
                return (
                  <div className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[13px] shadow-float">
                    <p className="font-bold">{MONTHS[p.month - 1]} {year}</p>
                    <p className="text-muted">{p.total == null ? 'Belum berjalan' : `${formatNumber(p.total)} kegiatan${p.month === currentMonth ? ' · berjalan' : ''}`}</p>
                  </div>
                )
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
              {rows.map((d) => (
                <Cell key={d.month} fill={d.month === currentMonth ? 'url(#running)' : '#8B1520'} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                content={({ x, y, width, value, index }) => {
                  const month = rows[index as number]?.month
                  // Label langsung hanya untuk bulan berjalan dan puncak tertinggi.
                  const peak = Math.max(...rows.map((r) => r.value))
                  if (!value || (month !== currentMonth && value !== peak)) return null
                  return (
                    <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1F1A1B">
                      {formatNumber(Number(value))}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span className="bar-running inline-block size-3 rounded-[3px]" aria-hidden="true" /> Bulan berjalan
      </figcaption>
    </figure>
  )
}

/** Batang horizontal per unit kerja dengan nilai tertulis di samping. */
export function UnitBars({ units, showStaff }: { units: UnitStat[]; showStaff?: boolean }) {
  const max = Math.max(1, ...units.map((u) => u.total))
  if (!units.length) return <p className="py-6 text-sm text-muted">Belum ada data unit kerja.</p>

  return (
    <ul className="flex flex-col gap-4">
      {units.map((u) => (
        <li key={u.id} className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="font-semibold">
              {u.name}
              {showStaff && <span className="font-medium text-muted"> · {u.employees} pegawai</span>}
            </span>
            <strong className="tabular-nums">{formatNumber(u.total)}</strong>
          </div>
          <div className="h-3 rounded-[4px] bg-[#f6f3f0]" role="img" aria-label={`${u.name}: ${formatNumber(u.total)} kegiatan`}>
            <div className="h-full rounded-r-[4px] bg-maroon-700" style={{ width: `${(u.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
