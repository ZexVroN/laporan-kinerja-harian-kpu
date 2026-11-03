import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Pencil, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { EmptyState, Notice, Spinner } from '@/components/ui/feedback'
import { useUser } from '@/features/auth/auth'
import { errorMessage, fieldErrors } from '@/lib/api'
import { formatDateLong, formatTime, initials, timeRange, toMinutes } from '@/lib/format'
import { useCreateReport, useReports } from '@/lib/queries'
import type { Report } from '@/lib/types'
import { EvidenceLink, progressText, StatusBadge } from './ReportBits'
import { DeleteReportDialog, EditReportDialog } from './ReportDialogs'
import { ReportFields, useTimeSlots } from './ReportFields'
import { emptyReport, formField, reportSchema, toPayload, type ReportValues } from './reportSchema'

/** Jam mulai = jam selesai paling akhir yang sudah diisi; jam selesai = 30 menit sesudahnya. */
function suggestTimes(items: { end_time: string | null }[], slots: string[]) {
  const latest = items.reduce<string | null>((acc, r) => (r.end_time && (!acc || toMinutes(r.end_time) > toMinutes(acc)) ? r.end_time : acc), null)
  const i = latest ? slots.indexOf(latest) : 0
  // Jam kerja sudah habis (atau jam tidak dikenal): kembali ke awal agar pengguna memilih sendiri.
  if (i < 0 || i >= slots.length - 1) return { start: slots[0], end: slots[1] }
  return { start: slots[i], end: slots[i + 1] }
}

export function ReportEntryPage() {
  const user = useUser()
  const employee = user.employee
  const create = useCreateReport()
  const [editing, setEditing] = useState<Report | null>(null)
  const [deleting, setDeleting] = useState<Report | null>(null)
  const [lastSavedId, setLastSavedId] = useState<number | null>(null)

  const slots = useTimeSlots()
  const { register, handleSubmit, watch, reset, setError, setFocus, setValue, formState: { errors, dirtyFields } } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: emptyReport({ start_time: slots[0], end_time: slots[1] }),
  })

  const date = watch('report_date')
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '')
  const sameDay = useReports({ date_from: date, date_to: date, sort: 'report_date', direction: 'asc', per_page: 100 }, validDate)
  const items = sameDay.data?.data ?? []

  // Saran jam: lanjut dari jam selesai kegiatan terakhir pada tanggal itu, selama 30 menit.
  const suggestion = suggestTimes(items, slots)
  useEffect(() => {
    if (sameDay.isFetching || dirtyFields.start_time || dirtyFields.end_time) return
    setValue('start_time', suggestion.start)
    setValue('end_time', suggestion.end)
  }, [date, suggestion.start, suggestion.end, sameDay.isFetching]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = (values: ReportValues) =>
    create.mutate(toPayload(values), {
      onSuccess: (res) => {
        toast.success(res.message, { description: `Kegiatan tanggal ${formatDateLong(values.report_date)} telah tercatat.` })
        setLastSavedId(res.data.id)
        // Tanggal, jenis pekerjaan, dan sumber data dipertahankan; jam berikutnya disarankan.
        const next = suggestTimes([{ end_time: values.end_time }], slots)
        reset(emptyReport({ report_date: values.report_date, start_time: next.start, end_time: next.end, work_type: values.work_type, data_source: values.data_source }))
        setFocus('action_plan')
      },
      onError: (error) => {
        const fields = fieldErrors(error)
        Object.entries(fields).forEach(([k, v]) => setError(formField(k), { message: v }))
        if (!Object.keys(fields).length) toast.error(errorMessage(error))
      },
    })

  return (
    <>
      <PageHeader title="Isi Laporan Harian" description="Setiap kegiatan tersimpan langsung. Anda dapat menambah beberapa kegiatan untuk tanggal yang sama." />

      <div className="flex flex-wrap items-start gap-5">
        <aside className="min-w-0 flex-[1_1_280px] overflow-hidden rounded-card border border-line bg-surface">
          <div className="relative flex items-center gap-3.5 overflow-hidden bg-maroon-900 px-5.5 py-5 text-white">
            <svg aria-hidden="true" viewBox="0 0 300 90" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" fill="none">
              <path d="M60 90 C 150 80, 230 40, 310 -5" stroke="#C9A24B" strokeWidth="1.5" opacity="0.7" />
            </svg>
            <span className="relative inline-flex size-[46px] shrink-0 items-center justify-center rounded-full bg-gold-500 text-base font-extrabold text-maroon-950">{initials(user.name)}</span>
            <div className="relative flex flex-col">
              <strong className="text-base">{employee?.full_name ?? user.name}</strong>
              <span className="text-xs text-white/75">Identitas Pegawai</span>
            </div>
          </div>
          {employee ? (
            <dl className="flex flex-col px-5.5 pt-2 pb-4">
              {[
                ['NIP', <span key="nip" className="font-mono">{employee.nip_formatted}</span>],
                ['Pangkat/Golongan', employee.rank?.label ?? '—'],
                ['Jabatan', employee.position],
                ['Unit Kerja', employee.unit?.name ?? '—'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex flex-col gap-0.5 border-b border-[#f3f1ee] py-3 last:border-0">
                  <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
                  <dd className="m-0 text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="p-5 text-sm text-muted">Data kepegawaian belum terhubung ke akun Anda. Hubungi Administrator.</p>
          )}
          <Notice icon={<Lock />} className="mx-5.5 mb-5 text-xs">Diambil otomatis dari profil Anda. Perubahan data hanya melalui Administrator.</Notice>
        </aside>

        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <form onSubmit={handleSubmit(save)} noValidate className="flex flex-col gap-5">
              <h2 className="text-[17px] font-bold">Kegiatan Baru</h2>
              <ReportFields register={register} errors={errors} watch={watch} idPrefix="new" />
              <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#f3f1ee] pt-4">
                <Button variant="secondary" onClick={() => reset(emptyReport({ report_date: date, start_time: suggestion.start, end_time: suggestion.end }))} disabled={create.isPending}>
                  Kosongkan
                </Button>
                <Button type="submit" loading={create.isPending} className="shadow-[0_6px_14px_rgb(139_21_32/0.25)]">
                  {!create.isPending && <Save aria-hidden="true" />}Simpan Laporan
                </Button>
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[#efece8] px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold">Kegiatan pada {validDate ? formatDateLong(date) : '—'}</h2>
              <Badge tone="maroon">{items.length} kegiatan</Badge>
            </div>
            {sameDay.isPending && validDate ? (
              <Spinner />
            ) : items.length === 0 ? (
              <EmptyState title="Belum ada kegiatan pada tanggal ini" description="Kegiatan yang Anda simpan akan muncul di sini." />
            ) : (
              <ol>
                {items.map((r, i) => (
                  <li key={r.id} className={`flex items-start gap-4 border-b border-[#f3f1ee] px-5 py-4 last:border-0 sm:px-6 ${r.id === lastSavedId ? 'bg-[#fffcf5]' : ''}`}>
                    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ${r.id === lastSavedId ? 'bg-gold-100 text-gold-700' : 'bg-canvas'}`}>{i + 1}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {timeRange(r.start_time, r.end_time) && <span className="text-xs font-bold text-maroon-700 tabular-nums">{timeRange(r.start_time, r.end_time)}</span>}
                        {r.action_plan && <span className="text-xs font-semibold text-muted">· {r.action_plan.name}</span>}
                        <StatusBadge report={r} />
                      </div>
                      <strong className="text-sm leading-normal font-semibold whitespace-pre-line">{r.activity_description}</strong>
                      <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                        {progressText(r) && <span>Realisasi <strong className="text-ink">{progressText(r)}</strong></span>}
                        {r.remarks && <span>· {r.remarks}</span>}
                        <span>· disimpan {formatTime(r.created_at)}</span>
                        {r.id === lastSavedId && <span className="font-bold text-success">· baru</span>}
                        <EvidenceLink url={r.evidence_url} />
                      </span>
                    </div>
                    {r.is_locked ? (
                      <Badge><Lock className="size-3" aria-hidden="true" />Terkunci</Badge>
                    ) : (
                      <div className="flex gap-1.5">
                        <Button variant="icon" size="icon" aria-label={`Ubah kegiatan ${i + 1}`} onClick={() => setEditing(r)}><Pencil aria-hidden="true" /></Button>
                        <Button variant="icon-danger" size="icon" aria-label={`Hapus kegiatan ${i + 1}`} onClick={() => setDeleting(r)}><Trash2 aria-hidden="true" /></Button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>

      <EditReportDialog report={editing} onClose={() => setEditing(null)} />
      <DeleteReportDialog report={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}
