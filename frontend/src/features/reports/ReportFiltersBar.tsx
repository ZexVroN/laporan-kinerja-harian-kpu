import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input, Select } from '@/components/ui/form'
import { useAuth } from '@/features/auth/auth'
import { cn, MONTHS, ROMAN } from '@/lib/format'
import { useEmployeeOptions, useUnits } from '@/lib/queries'
import type { ReportFilters } from '@/lib/types'

export function yearOptions() {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now - i)
}

interface Props {
  filters: ReportFilters
  onChange: (patch: Partial<ReportFilters>) => void
  onReset: () => void
}

/** Penyaring riwayat: pencarian, unit & pegawai (Admin/Pimpinan), triwulan, bulan, tahun, rentang tanggal. */
export function ReportFiltersBar({ filters, onChange, onReset }: Props) {
  const { hasRole } = useAuth()
  const seesAll = hasRole('admin', 'pimpinan')
  const units = useUnits()
  const employees = useEmployeeOptions(seesAll)
  const [q, setQ] = useState(filters.q ?? '')

  // Pencarian dikirim setelah pengguna berhenti mengetik 350 ms.
  useEffect(() => {
    const t = setTimeout(() => (q !== (filters.q ?? '') ? onChange({ q: q || undefined }) : undefined), 350)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setQ(filters.q ?? ''), [filters.q])

  const employeeList = (employees.data ?? []).filter((e) => !filters.unit_id || e.unit_id === filters.unit_id)
  const quarterBtn = (active: boolean) =>
    cn('h-[34px] cursor-pointer rounded-[9px] px-3.5 text-[13px] font-bold', active ? 'bg-surface text-maroon-700 shadow-[0_1px_3px_rgb(31_26_27/0.12)]' : 'text-[#57534e] hover:text-ink')

  return (
    <section aria-label="Penyaring" className="flex flex-col gap-3.5 rounded-card border border-line bg-surface px-5 py-4.5">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-[2_1_260px]">
          <label htmlFor="f-q" className="sr-only">Cari laporan</label>
          <Search className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted" aria-hidden="true" />
          <Input id="f-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={seesAll ? 'Cari nama, NIP, atau uraian kegiatan' : 'Cari uraian kegiatan atau keterangan'} className="h-[42px] pl-10.5" />
        </div>
        {seesAll && (
          <>
            <label className="flex-[1_1_200px]">
              <span className="sr-only">Unit kerja</span>
              <Select className="h-[42px]" value={filters.unit_id ?? ''} onChange={(e) => onChange({ unit_id: e.target.value ? Number(e.target.value) : undefined, employee_id: undefined })}>
                <option value="">Semua unit kerja</option>
                {units.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </label>
            <label className="flex-[1_1_200px]">
              <span className="sr-only">Pegawai</span>
              <Select className="h-[42px]" value={filters.employee_id ?? ''} onChange={(e) => onChange({ employee_id: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Semua pegawai</option>
                {employeeList.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </Select>
            </label>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Triwulan" className="inline-flex gap-0.5 rounded-xl border border-line bg-canvas p-1">
          <button type="button" aria-pressed={!filters.quarter} className={quarterBtn(!filters.quarter)} onClick={() => onChange({ quarter: undefined })}>Semua</button>
          {[1, 2, 3, 4].map((qt) => (
            <button
              key={qt}
              type="button"
              aria-pressed={filters.quarter === qt}
              className={quarterBtn(filters.quarter === qt)}
              onClick={() => onChange({ quarter: qt, month: undefined, year: filters.year ?? new Date().getFullYear() })}
            >
              TW {ROMAN[qt]}
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Bulan</span>
          <Select className="h-[42px] w-40" value={filters.month ?? ''} onChange={(e) => onChange({ month: e.target.value ? Number(e.target.value) : undefined, quarter: undefined, year: filters.year ?? new Date().getFullYear() })}>
            <option value="">Semua bulan</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
        </label>
        <label>
          <span className="sr-only">Tahun</span>
          <Select
            className="h-[42px] w-32"
            value={filters.year ?? ''}
            onChange={(e) => {
              const year = e.target.value ? Number(e.target.value) : undefined
              onChange(year ? { year } : { year: undefined, month: undefined, quarter: undefined })
            }}
          >
            <option value="">Semua tahun</option>
            {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <label htmlFor="f-from" className="sr-only">Dari tanggal</label>
          <Input id="f-from" type="date" className="h-[42px] w-[150px]" value={filters.date_from ?? ''} onChange={(e) => onChange({ date_from: e.target.value || undefined })} />
          <span aria-hidden="true">–</span>
          <label htmlFor="f-to" className="sr-only">Sampai tanggal</label>
          <Input id="f-to" type="date" className="h-[42px] w-[150px]" value={filters.date_to ?? ''} min={filters.date_from} onChange={(e) => onChange({ date_to: e.target.value || undefined })} />
        </div>
        <button type="button" onClick={onReset} className="h-[42px] cursor-pointer px-2 text-[13px] font-bold text-maroon-700 hover:underline">Atur ulang</button>
      </div>
    </section>
  )
}
