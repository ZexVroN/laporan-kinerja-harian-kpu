import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/feedback'
import { useAuth } from '@/features/auth/auth'
import { errorMessage, fieldErrors } from '@/lib/api'
import { formatDateFull, formatDateShort, formatDateTime } from '@/lib/format'
import { useDeleteReport, useUpdateReport } from '@/lib/queries'
import type { Report } from '@/lib/types'
import { ReportFields } from './ReportFields'
import { reportSchema, type ReportValues } from './reportSchema'

/** Hak ubah di sisi klien hanya untuk menampilkan tombol; backend tetap memutuskan. */
export function useReportPermissions() {
  const { user } = useAuth()
  return {
    canModify: (r: Report) => user?.role === 'admin' || (user?.role === 'pegawai' && !r.is_locked),
    isAdmin: user?.role === 'admin',
  }
}

export function EditReportDialog({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const update = useUpdateReport()
  const { isAdmin } = useReportPermissions()
  const { register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm<ReportValues>({ resolver: zodResolver(reportSchema) })

  useEffect(() => {
    if (report) reset({ report_date: report.report_date, activity_description: report.activity_description, remarks: report.remarks ?? '' })
  }, [report, reset])

  const submit = handleSubmit((values) => {
    if (!report) return
    update.mutate(
      { id: report.id, ...values, remarks: values.remarks || null },
      {
        onSuccess: (res) => {
          toast.success(res.message)
          onClose()
        },
        onError: (error) => {
          const fields = fieldErrors(error)
          Object.entries(fields).forEach(([k, v]) => setError(k as keyof ReportValues, { message: v }))
          if (!Object.keys(fields).length) toast.error(errorMessage(error))
        },
      },
    )
  })

  return (
    <Dialog
      open={!!report}
      onOpenChange={(o) => !o && onClose()}
      title="Ubah Laporan"
      description={report?.employee ? `${report.employee.full_name} · ${formatDateShort(report.report_date)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={update.isPending}>Simpan Perubahan</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {isAdmin && <Notice>Perubahan oleh Administrator dicatat di log aktivitas beserta nilai sebelumnya.</Notice>}
        <ReportFields register={register} errors={errors} date={watch('report_date') ?? ''} activityLength={(watch('activity_description') ?? '').length} idPrefix="edit" />
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}

export function DeleteReportDialog({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const remove = useDeleteReport()

  return (
    <ConfirmDialog
      open={!!report}
      onOpenChange={(o) => !o && onClose()}
      title="Hapus laporan ini?"
      description={
        report && (
          <>
            Kegiatan tanggal <strong className="text-ink">{formatDateShort(report.report_date)}</strong> akan dihapus dari riwayat. Tindakan ini tercatat di log aktivitas.
          </>
        )
      }
      confirmLabel="Ya, Hapus"
      loading={remove.isPending}
      onConfirm={() =>
        report &&
        remove.mutate(report.id, {
          onSuccess: (res) => {
            toast.success(res.message)
            onClose()
          },
          onError: (error) => toast.error(errorMessage(error)),
        })
      }
    />
  )
}

export function ReportDetailDialog({ report, onClose, onEdit }: { report: Report | null; onClose: () => void; onEdit?: (r: Report) => void }) {
  const { canModify } = useReportPermissions()
  const rows: [string, ReactNode][] = report
    ? [
        ['Tanggal', formatDateFull(report.report_date)],
        ['Periode', `${report.month_name} ${report.year} · ${report.quarter_label}`],
        ['Pegawai', report.employee ? `${report.employee.full_name} · NIP ${report.employee.nip_formatted}` : '—'],
        ['Jabatan saat melapor', report.snapshot.position],
        ['Pangkat/Golongan', report.snapshot.rank ?? '—'],
        ['Unit Kerja', report.snapshot.unit?.name ?? '—'],
        ['Kegiatan Tugas Jabatan', <span key="act" className="whitespace-pre-line">{report.activity_description}</span>],
        ['Keterangan', report.remarks ? <span key="rem" className="whitespace-pre-line">{report.remarks}</span> : '—'],
        ['Disimpan', formatDateTime(report.created_at)],
        ...(report.updated_at !== report.created_at ? [['Terakhir diubah', formatDateTime(report.updated_at)] as [string, string]] : []),
      ]
    : []

  return (
    <Dialog
      open={!!report}
      onOpenChange={(o) => !o && onClose()}
      title="Detail Laporan"
      footer={
        report && onEdit && canModify(report) ? (
          <Button variant="secondary" onClick={() => onEdit(report)}>Ubah</Button>
        ) : undefined
      }
    >
      {report?.is_locked && (
        <Badge tone="neutral" className="mb-4"><Lock className="size-3" aria-hidden="true" />Periode terkunci</Badge>
      )}
      <dl className="flex flex-col">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 border-b border-[#f3f1ee] py-2.5 last:border-0">
            <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
            <dd className="m-0 text-sm leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  )
}
