import { ChevronDown, ScrollText, Search } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Card } from '@/components/ui/card'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { errorMessage } from '@/lib/api'
import { cn, formatDateTime } from '@/lib/format'
import { useActivityLogs, type LogFilters } from '@/lib/queries'
import type { ActivityLogEntry } from '@/lib/types'

const ACTIONS: { value: string; label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' | 'maroon' | 'gold' }[] = [
  { value: 'auth.', label: 'Masuk/keluar', tone: 'neutral' },
  { value: 'report.created', label: 'Laporan dibuat', tone: 'success' },
  { value: 'report.updated', label: 'Laporan diubah', tone: 'warning' },
  { value: 'report.deleted', label: 'Laporan dihapus', tone: 'danger' },
  { value: 'report.exported', label: 'Ekspor', tone: 'neutral' },
  { value: 'account.', label: 'Akun pegawai', tone: 'gold' },
  { value: 'period.', label: 'Kunci periode', tone: 'maroon' },
  { value: 'master.', label: 'Data induk', tone: 'gold' },
  { value: 'settings.', label: 'Pengaturan', tone: 'gold' },
]

function actionMeta(action: string) {
  return ACTIONS.find((a) => action.startsWith(a.value)) ?? { label: action, tone: 'neutral' as const }
}

const FIELD_LABELS: Record<string, string> = {
  report_date: 'Tanggal', activity_description: 'Kegiatan', remarks: 'Keterangan', employee_id: 'Pegawai',
  full_name: 'Nama', nip: 'NIP', rank_id: 'Pangkat', position: 'Jabatan', unit_id: 'Unit', supervisor_id: 'Atasan',
  username: 'Nama pengguna', email: 'Email', role: 'Peran', name: 'Nama', code: 'Kode', is_active: 'Aktif', sort_order: 'Urutan',
}

function Changes({ log }: { log: ActivityLogEntry }) {
  const oldV = log.properties?.old ?? {}
  const newV = log.properties?.new ?? {}
  const fields = [...new Set([...Object.keys(oldV), ...Object.keys(newV)])]
  if (!fields.length) return <p className="text-[13px] text-muted">Tidak ada rincian perubahan.</p>

  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th scope="col" className="w-32 py-1 pr-3 font-semibold">Kolom</th>
          <th scope="col" className="py-1 pr-3 font-semibold">Sebelum</th>
          <th scope="col" className="py-1 font-semibold">Sesudah</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f} className="border-t border-line align-top">
            <td className="py-1.5 pr-3 font-semibold">{FIELD_LABELS[f] ?? f}</td>
            <td className="py-1.5 pr-3 whitespace-pre-line text-danger">{String(oldV[f] ?? '—')}</td>
            <td className="py-1.5 whitespace-pre-line text-success">{f in newV ? String(newV[f] ?? '—') : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ActivityLogsPage() {
  const [filters, setFilters] = useState<LogFilters>({ page: 1 })
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const logs = useActivityLogs(filters)

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === (search || undefined) ? f : { ...f, q: search || undefined, page: 1 })), 350)
    return () => clearTimeout(t)
  }, [search])

  const rows = logs.data?.data ?? []

  return (
    <>
      <PageHeader title="Log Aktivitas" description="Jejak masuk/keluar, perubahan laporan, akun, dan pengaturan." />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#efece8] px-5 py-4">
          <div className="relative flex-[2_1_240px]">
            <label htmlFor="log-q" className="sr-only">Cari deskripsi</label>
            <Search className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted" aria-hidden="true" />
            <Input id="log-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari deskripsi aktivitas" className="h-[42px] pl-10.5" />
          </div>
          <label className="flex-[1_1_180px]">
            <span className="sr-only">Jenis aktivitas</span>
            <Select className="h-[42px]" value={filters.action ?? ''} onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined, page: 1 })}>
              <option value="">Semua aktivitas</option>
              {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="log-from" className="sr-only">Dari tanggal</label>
            <Input id="log-from" type="date" className="h-[42px] w-[150px]" value={filters.date_from ?? ''} onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined, page: 1 })} />
            <span className="text-muted" aria-hidden="true">–</span>
            <label htmlFor="log-to" className="sr-only">Sampai tanggal</label>
            <Input id="log-to" type="date" className="h-[42px] w-[150px]" value={filters.date_to ?? ''} onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined, page: 1 })} />
          </div>
        </div>

        {logs.isPending ? (
          <Spinner />
        ) : logs.isError ? (
          <ErrorState message={errorMessage(logs.error)} onRetry={() => logs.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ScrollText />} title="Belum ada aktivitas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf9f7] text-left">
                  {['Waktu', 'Pengguna', 'Aktivitas', 'Deskripsi', 'IP'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => {
                  const meta = actionMeta(log.action)
                  const expandable = !!(log.properties?.old || log.properties?.new)
                  return (
                    <Fragment key={log.id}>
                      <tr className="border-t border-[#f1eeea] align-top">
                        <td className="py-3 pr-3 pl-5 whitespace-nowrap text-muted tabular-nums">{formatDateTime(log.created_at)}</td>
                        <td className="px-3 py-3">
                          {log.user ? <div className="flex flex-col"><strong className="font-semibold">{log.user.name}</strong><span className="text-xs text-muted">@{log.user.username} · {log.user.role_label}</span></div> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-3 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className="px-3 py-3 leading-relaxed">
                          {log.description}
                          {expandable && (
                            <button type="button" aria-expanded={open === log.id} onClick={() => setOpen(open === log.id ? null : log.id)} className="ml-2 inline-flex cursor-pointer items-center gap-1 text-[13px] font-bold text-maroon-700">
                              Rincian <ChevronDown className={cn('size-3.5 transition-transform', open === log.id && 'rotate-180')} aria-hidden="true" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 pr-5 pl-3 font-mono text-xs text-muted">{log.ip_address}</td>
                      </tr>
                      {open === log.id && (
                        <tr className="bg-[#fdfcfb]">
                          <td colSpan={5} className="px-5 pt-1 pb-4"><Changes log={log} /></td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {logs.data && rows.length > 0 && <Pagination meta={logs.data.meta} noun="aktivitas" onPage={(page) => setFilters({ ...filters, page })} />}
      </Card>
    </>
  )
}
