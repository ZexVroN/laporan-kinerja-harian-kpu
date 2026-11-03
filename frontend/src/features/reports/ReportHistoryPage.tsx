import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FileSpreadsheet, FileText, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { EmptyState, ErrorState, Spinner } from '@/components/ui/feedback'
import { Pagination } from '@/components/ui/pagination'
import { useAuth } from '@/features/auth/auth'
import { errorMessage } from '@/lib/api'
import { downloadFile } from '@/lib/download'
import { cn, formatDateShort, formatNumber, ROMAN } from '@/lib/format'
import { useReports } from '@/lib/queries'
import type { Report, ReportFilters } from '@/lib/types'
import { DeleteReportDialog, EditReportDialog, ReportDetailDialog, useReportPermissions } from './ReportDialogs'
import { ReportFiltersBar } from './ReportFiltersBar'

const NUMERIC = ['employee_id', 'unit_id', 'year', 'month', 'quarter', 'per_page', 'page'] as const
const TEXT = ['q', 'date_from', 'date_to', 'sort', 'direction'] as const

/** Penyaring disimpan di URL agar dapat dibagikan dan bertahan saat halaman dimuat ulang. */
function useFilterParams(): [ReportFilters, (patch: Partial<ReportFilters>) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const filters: ReportFilters = {}
  NUMERIC.forEach((k) => params.get(k) && Object.assign(filters, { [k]: Number(params.get(k)) }))
  TEXT.forEach((k) => params.get(k) && Object.assign(filters, { [k]: params.get(k) }))

  const update = (patch: Partial<ReportFilters>) => {
    const next = { ...filters, page: undefined, ...patch }
    const sp = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => v !== undefined && v !== '' && sp.set(k, String(v)))
    setParams(sp, { replace: true })
  }

  return [filters, update, () => setParams(new URLSearchParams(), { replace: true })]
}

export function ReportHistoryPage() {
  const { user, hasRole } = useAuth()
  const seesAll = hasRole('admin', 'pimpinan')
  const { canModify } = useReportPermissions()
  const [filters, setFilters, resetFilters] = useFilterParams()
  const query = { per_page: 25, sort: 'report_date' as const, direction: 'desc' as const, ...filters }
  const reports = useReports(query)

  const [viewing, setViewing] = useState<Report | null>(null)
  const [editing, setEditing] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState<Report | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  const exportAs = async (format: 'pdf' | 'xlsx') => {
    // Ekspor memerlukan periode; tanpa penyaring periode dipakai tahun berjalan.
    const hasPeriod = filters.year || filters.date_from || filters.date_to
    const params = { ...filters, page: undefined, per_page: undefined, sort: undefined, direction: undefined, format, ...(hasPeriod ? {} : { year: new Date().getFullYear() }) }
    setExporting(format)
    try {
      await downloadFile('/reports/export', params)
      toast.success(`Berkas ${format.toUpperCase()} diunduh.`)
    } catch (error) {
      toast.error(errorMessage(error, 'Gagal mengunduh berkas.'))
    } finally {
      setExporting(null)
    }
  }

  const sortBy = (column: 'report_date' | 'employee_name') => {
    const same = query.sort === column
    setFilters({ sort: column, direction: same && query.direction === 'desc' ? 'asc' : 'desc' })
  }

  const SortIcon = ({ column }: { column: string }) =>
    query.sort !== column ? <ArrowUpDown className="size-3.5 opacity-60" aria-hidden="true" /> : query.direction === 'asc' ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />

  const sortHeader = (column: 'report_date' | 'employee_name', label: string) => (
    <th scope="col" aria-sort={query.sort === column ? (query.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-3">
      <button type="button" onClick={() => sortBy(column)} className={cn('inline-flex cursor-pointer items-center gap-1 text-xs font-bold tracking-wider uppercase', query.sort === column ? 'text-maroon-700' : 'text-muted')}>
        {label}
        <SortIcon column={column} />
      </button>
    </th>
  )

  const rows = reports.data?.data ?? []
  const meta = reports.data?.meta
  const periodLabel = filters.quarter ? `Triwulan ${ROMAN[filters.quarter]} ${filters.year}` : filters.month && filters.year ? `${filters.month}/${filters.year}` : filters.year ? `Tahun ${filters.year}` : 'Semua periode'

  const actions = (r: Report) => (
    <div className="flex justify-end gap-1.5">
      <Button variant="icon" size="icon" aria-label="Lihat detail" onClick={() => setViewing(r)}><Eye aria-hidden="true" /></Button>
      {canModify(r) ? (
        <>
          <Button variant="icon" size="icon" aria-label="Ubah" onClick={() => setEditing(r)}><Pencil aria-hidden="true" /></Button>
          <Button variant="icon-danger" size="icon" aria-label="Hapus" onClick={() => setDeleting(r)}><Trash2 aria-hidden="true" /></Button>
        </>
      ) : (
        r.is_locked && user?.role === 'pegawai' && <span className="inline-flex size-9 items-center justify-center text-muted" title="Periode terkunci"><Lock className="size-4" aria-label="Periode terkunci" /></span>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title={seesAll ? 'Laporan Pegawai' : 'Riwayat Laporan'}
        description={seesAll ? (user?.role === 'admin' ? 'Seluruh laporan harian pegawai. Perubahan oleh Administrator tercatat di log aktivitas.' : 'Seluruh laporan harian pegawai (hanya baca).') : 'Semua kegiatan yang pernah Anda laporkan.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => exportAs('xlsx')} loading={exporting === 'xlsx'} disabled={!!exporting}>
              {exporting !== 'xlsx' && <FileSpreadsheet className="text-success" aria-hidden="true" />}Ekspor Excel
            </Button>
            <Button variant="secondary" onClick={() => exportAs('pdf')} loading={exporting === 'pdf'} disabled={!!exporting}>
              {exporting !== 'pdf' && <FileText className="text-maroon-700" aria-hidden="true" />}Ekspor PDF
            </Button>
            {user?.role === 'pegawai' && (
              <Button asChild><Link to="/laporan/isi"><Plus aria-hidden="true" />Isi Laporan</Link></Button>
            )}
          </>
        }
      />

      <ReportFiltersBar filters={filters} onChange={setFilters} onReset={resetFilters} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efece8] px-5 py-3.5 text-[13px] text-muted">
          <span>{meta ? <><strong className="text-ink">{formatNumber(meta.total)}</strong> laporan · {periodLabel}</> : 'Memuat…'}</span>
          {reports.isFetching && !reports.isPending && <span role="status">Memperbarui…</span>}
        </div>

        {reports.isPending ? (
          <Spinner />
        ) : reports.isError ? (
          <ErrorState message={errorMessage(reports.error)} onRetry={() => reports.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<FileText />} title="Tidak ada laporan" description="Ubah penyaring atau rentang tanggal untuk melihat laporan lain." />
        ) : (
          <>
            {/* Tabel untuk layar lebar */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#faf9f7] text-left">
                    <th scope="col" className="w-12 py-3 pr-3 pl-5 text-xs font-bold tracking-wider text-muted uppercase">No.</th>
                    {sortHeader('report_date', 'Tanggal')}
                    {sortHeader('employee_name', 'Nama Pegawai')}
                    <th scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase">NIP</th>
                    <th scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase">Kegiatan Tugas Jabatan</th>
                    <th scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase">Keterangan</th>
                    <th scope="col" className="py-3 pr-5 pl-3 text-right text-xs font-bold tracking-wider text-muted uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-[#f1eeea] align-top hover:bg-[#fdfcfb]">
                      <td className="py-3.5 pr-3 pl-5 text-muted tabular-nums">{(meta!.from ?? 1) + i}</td>
                      <td className="px-3 py-3.5 font-semibold whitespace-nowrap tabular-nums">{formatDateShort(r.report_date)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col"><strong className="font-semibold">{r.employee?.full_name}</strong><span className="text-xs text-muted">{r.snapshot.unit?.name}</span></div>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[12.5px] whitespace-nowrap text-[#3f3a3b]">{r.employee?.nip_formatted}</td>
                      <td className="max-w-[360px] px-3 py-3.5 leading-relaxed"><span className="line-clamp-3">{r.activity_description}</span></td>
                      <td className="max-w-[200px] px-3 py-3.5 leading-relaxed text-[#57534e]"><span className="line-clamp-2">{r.remarks || '—'}</span></td>
                      <td className="py-2.5 pr-5 pl-3">{actions(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu untuk ponsel */}
            <ul className="md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 border-t border-[#f1eeea] px-5 py-4 first:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm tabular-nums">{formatDateShort(r.report_date)}</strong>
                    {r.is_locked && <Badge><Lock className="size-3" aria-hidden="true" />Terkunci</Badge>}
                  </div>
                  {seesAll && <span className="text-[13px] font-semibold">{r.employee?.full_name} <span className="font-mono font-normal text-muted">{r.employee?.nip_formatted}</span></span>}
                  <p className="line-clamp-3 text-sm leading-relaxed">{r.activity_description}</p>
                  {r.remarks && <p className="text-[13px] text-muted">{r.remarks}</p>}
                  {actions(r)}
                </li>
              ))}
            </ul>

            {meta && (
              <Pagination meta={meta} noun="laporan" onPage={(page) => setFilters({ ...filters, page })} perPage={query.per_page} onPerPage={(per_page) => setFilters({ per_page })} />
            )}
          </>
        )}
      </Card>

      <ReportDetailDialog report={viewing} onClose={() => setViewing(null)} onEdit={(r) => { setViewing(null); setEditing(r) }} />
      <EditReportDialog report={editing} onClose={() => setEditing(null)} />
      <DeleteReportDialog report={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}
