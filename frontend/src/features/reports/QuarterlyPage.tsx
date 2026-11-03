import { FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/ui/feedback'
import { Select } from '@/components/ui/form'
import { useAuth } from '@/features/auth/auth'
import { errorMessage } from '@/lib/api'
import { downloadFile } from '@/lib/download'
import { cn, formatDateLong, formatNumber, QUARTER_RANGES, quarterOf, ROMAN, todayYmd } from '@/lib/format'
import { useEmployeeOptions, useReportSummary, useUnits } from '@/lib/queries'
import type { CompiledReport, ReportFilters } from '@/lib/types'
import { yearOptions } from './ReportFiltersBar'

export function QuarterlyPage() {
  const { hasRole } = useAuth()
  const seesAll = hasRole('admin', 'pimpinan')
  const units = useUnits()
  const employees = useEmployeeOptions(seesAll)

  const today = todayYmd()
  const [params, setParams] = useState<ReportFilters>({ year: Number(today.slice(0, 4)), quarter: quarterOf(today) })
  const summary = useReportSummary(params, true)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)

  const exportAs = async (format: 'pdf' | 'xlsx') => {
    setExporting(format)
    try {
      await downloadFile('/reports/export', { ...params, format })
      toast.success(`Berkas ${format.toUpperCase()} diunduh.`)
    } catch (error) {
      toast.error(errorMessage(error, 'Gagal mengunduh berkas.'))
    } finally {
      setExporting(null)
    }
  }

  const employeeList = (employees.data ?? []).filter((e) => !params.unit_id || e.unit_id === params.unit_id)
  const data = summary.data
  const daysReported = data?.groups.reduce((n, g) => n + g.days_reported, 0) ?? 0
  const pdfTooLarge = !!data && data.total > data.limits.pdf_max_rows

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Laporan Triwulan" description="Rekap laporan harian per triwulan, langsung dari basis data, siap diunduh atau dicetak." />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 print:hidden">
          <Card className="flex flex-col gap-4 p-5.5">
            <h2 className="text-base font-bold">Parameter Laporan</h2>
            {seesAll && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Unit Kerja</span>
                  <Select value={params.unit_id ?? ''} onChange={(e) => setParams({ ...params, unit_id: e.target.value ? Number(e.target.value) : undefined, employee_id: undefined })}>
                    <option value="">Semua unit kerja</option>
                    {units.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Pegawai</span>
                  <Select value={params.employee_id ?? ''} onChange={(e) => setParams({ ...params, employee_id: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">Semua pegawai{params.unit_id ? ' di unit ini' : ''}</option>
                    {employeeList.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                  </Select>
                </label>
              </>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Tahun</span>
              <Select value={params.year} onChange={(e) => setParams({ ...params, year: Number(e.target.value) })}>
                {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold">Triwulan</legend>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={params.quarter === q}
                    onClick={() => setParams({ ...params, quarter: q })}
                    className={cn(
                      'flex min-h-14 cursor-pointer flex-col items-start gap-0.5 rounded-[11px] px-3 py-2 text-left',
                      params.quarter === q ? 'border-[1.5px] border-maroon-700 bg-maroon-50 text-maroon-900' : 'border border-line bg-surface hover:bg-canvas',
                    )}
                  >
                    <strong className="text-sm">Triwulan {ROMAN[q]}</strong>
                    <span className="text-xs opacity-80">{QUARTER_RANGES[q]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </Card>

          <Card className="flex flex-col gap-3.5 p-5.5">
            <h2 className="text-base font-bold">Ringkasan</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.5 rounded-xl bg-maroon-50 px-3.5 py-3">
                <span className="text-xs font-semibold text-maroon-800">Total kegiatan</span>
                <strong className="text-2xl text-maroon-900 tabular-nums">{data ? formatNumber(data.total) : '–'}</strong>
              </div>
              <div className="flex flex-col gap-0.5 rounded-xl bg-canvas px-3.5 py-3">
                <span className="text-xs font-semibold text-muted">{data && data.groups.length > 1 ? 'Pegawai' : 'Hari terlapor'}</span>
                <strong className="text-2xl tabular-nums">{data ? (data.groups.length > 1 ? data.groups.length : daysReported) : '–'}</strong>
              </div>
            </div>
            {data && <span className="text-[13px] text-muted">Periode {formatDateLong(data.period_from)} – {formatDateLong(data.period_to)}</span>}
            <div className="flex flex-col gap-2.5 border-t border-[#f3f1ee] pt-4">
              {pdfTooLarge && (
                <Notice tone="warning">
                  PDF dibatasi {formatNumber(data!.limits.pdf_max_rows)} kegiatan per unduhan. Gunakan Excel, atau pilih unit kerja/pegawai tertentu.
                </Notice>
              )}
              <Button onClick={() => exportAs('pdf')} loading={exporting === 'pdf'} disabled={!!exporting || !data || pdfTooLarge}>
                {exporting !== 'pdf' && <FileText aria-hidden="true" />}Unduh PDF
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" onClick={() => exportAs('xlsx')} loading={exporting === 'xlsx'} disabled={!!exporting || !data}>
                  {exporting !== 'xlsx' && <FileSpreadsheet className="text-success" aria-hidden="true" />}Excel
                </Button>
                <Button variant="secondary" onClick={() => window.print()} disabled={!data}>
                  <Printer aria-hidden="true" />Cetak
                </Button>
              </div>
            </div>
          </Card>
        </aside>

        <section aria-label="Pratinjau dokumen" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 rounded-card bg-[#e9e6e2] p-4 sm:p-6 print:bg-transparent print:p-0">
          <div className="flex items-center justify-between gap-3 text-[13px] text-[#57534e] print:hidden">
            <span className="font-bold">Pratinjau dokumen · A4 potret</span>
            {summary.isFetching && <span role="status">Memuat…</span>}
          </div>
          {summary.isPending ? (
            <Card><Spinner label="Menyusun rekap…" /></Card>
          ) : summary.isError ? (
            <Card><ErrorState message={errorMessage(summary.error)} onRetry={() => summary.refetch()} /></Card>
          ) : data!.groups.length === 0 ? (
            <Card><EmptyState icon={<FileText />} title="Tidak ada laporan pada periode ini" description="Pilih triwulan, tahun, atau pegawai lain." /></Card>
          ) : (
            data!.groups.map((group) => <DocumentPreview key={group.employee.id} data={data!} group={group} />)
          )}
        </section>
      </div>
    </>
  )
}

/** Pratinjau HTML dengan tata letak yang sama seperti PDF (resources/views/pdf/report.blade.php). */
function DocumentPreview({ data, group }: { data: CompiledReport; group: CompiledReport['groups'][number] }) {
  const s = data.settings
  const signDate = data.period_to < todayYmd() ? data.period_to : todayYmd()

  return (
    <article className="flex flex-col gap-4 overflow-x-auto bg-white px-6 py-8 font-[Tinos,'Times_New_Roman',serif] text-[12.5px] leading-snug text-[#111] shadow-[0_10px_30px_rgb(31_26_27/0.12)] sm:px-11 sm:py-10 print:break-after-page print:shadow-none">
      <header className="flex items-center gap-4 border-b-[3px] border-double border-[#111] pb-3">
        <div className="w-16 shrink-0" />
        <div className="flex flex-1 flex-col text-center">
          <strong className="text-[15px] tracking-wide">{s.instansi_kop_1}</strong>
          {s.instansi_kop_2 && <strong className="text-[17px] tracking-wide">{s.instansi_kop_2}</strong>}
          {s.instansi_alamat && <span className="text-[11.5px]">{s.instansi_alamat}</span>}
        </div>
        <div className="w-16 shrink-0" />
      </header>

      <div className="flex flex-col text-center">
        <strong className="text-sm underline">{data.title}</strong>
        <span className="text-[13px]">{data.period_label}</span>
      </div>

      <table className="text-[12.5px]">
        <tbody>
          {[
            ['Nama', group.employee.full_name],
            ['NIP', group.employee.nip_formatted],
            ['Pangkat/Golongan', group.employee.rank ?? '-'],
            ['Jabatan', group.employee.position],
            ['Unit Kerja', group.employee.unit ?? '-'],
          ].map(([k, v]) => (
            <tr key={k}><td className="w-36 py-0.5 align-top">{k}</td><td className="px-2 align-top">:</td><td className="py-0.5">{v}</td></tr>
          ))}
        </tbody>
      </table>

      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="bg-[#f2f2f2]">
            <th className="w-8 border border-[#111] p-1.5">No.</th>
            <th className="w-[86px] border border-[#111] p-1.5">Tanggal</th>
            <th className="border border-[#111] p-1.5">Kegiatan Tugas Jabatan</th>
            <th className="w-[150px] border border-[#111] p-1.5">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {group.reports.map((r, i) => (
            <tr key={r.id} className="break-inside-avoid">
              <td className="border border-[#111] px-1.5 py-1 text-center align-top">{i + 1}</td>
              <td className="border border-[#111] px-1.5 py-1 text-center align-top whitespace-nowrap">{r.report_date_formatted}</td>
              <td className="border border-[#111] px-1.5 py-1 align-top whitespace-pre-line">{r.activity_description}</td>
              <td className="border border-[#111] px-1.5 py-1 align-top whitespace-pre-line">{r.remarks}</td>
            </tr>
          ))}
          <tr className="bg-[#f2f2f2] font-bold">
            <td colSpan={3} className="border border-[#111] p-1.5 text-right">Jumlah kegiatan ({group.days_reported} hari)</td>
            <td className="border border-[#111] p-1.5">{group.total} kegiatan</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex justify-between gap-6 text-[12.5px] break-inside-avoid">
        <div className="flex w-[46%] flex-col">
          <span>&nbsp;</span>
          <span>Mengetahui,</span>
          <span>{group.supervisor?.position ?? 'Atasan Langsung'}</span>
          <span className="h-14" />
          <strong className="underline">{group.supervisor?.full_name ?? '........................................'}</strong>
          <span>NIP {group.supervisor?.nip_formatted ?? '..................................'}</span>
        </div>
        <div className="flex w-[40%] flex-col">
          <span>{s.kota_ttd}, {formatDateLong(signDate)}</span>
          <span>Pegawai yang bersangkutan,</span>
          <span>&nbsp;</span>
          <span className="h-14" />
          <strong className="underline">{group.employee.full_name}</strong>
          <span>NIP {group.employee.nip_formatted}</span>
        </div>
      </div>
    </article>
  )
}
