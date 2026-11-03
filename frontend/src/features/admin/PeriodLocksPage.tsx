import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, LockOpen, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { ErrorState, Notice, Spinner } from '@/components/ui/feedback'
import { Select } from '@/components/ui/form'
import { yearOptions } from '@/features/reports/ReportFiltersBar'
import { api, errorMessage } from '@/lib/api'
import { formatDateLong, formatDateTime } from '@/lib/format'
import { usePeriodLocks } from '@/lib/queries'
import type { PeriodLockRow } from '@/lib/types'

type Change = { row: PeriodLockRow; is_locked: boolean | null } | null

export function PeriodLocksPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const locks = usePeriodLocks(year)
  const queryClient = useQueryClient()
  const [change, setChange] = useState<Change>(null)

  const mutation = useMutation({
    mutationFn: async (c: NonNullable<Change>) => (await api.put<{ message: string }>('/period-locks', { year: c.row.year, quarter: c.row.quarter, is_locked: c.is_locked })).data,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['period-locks'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setChange(null)
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      setChange(null)
    },
  })

  const confirm = change && {
    title: change.is_locked === null ? 'Kembalikan ke aturan otomatis?' : change.is_locked ? `Kunci ${change.row.label}?` : `Buka kunci ${change.row.label}?`,
    body:
      change.is_locked === null
        ? 'Status kunci kembali mengikuti tanggal batas otomatis.'
        : change.is_locked
          ? 'Pegawai tidak dapat lagi menambah, mengubah, atau menghapus laporan pada periode ini.'
          : 'Pegawai dapat kembali menambah, mengubah, dan menghapus laporan pada periode ini sampai dikunci lagi.',
  }

  return (
    <>
      <PageHeader
        title="Kunci Periode"
        description="Batas pengeditan laporan oleh pegawai per triwulan."
        actions={
          <label className="inline-flex items-center gap-2 text-sm text-muted">
            Tahun
            <Select className="h-[42px] w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </label>
        }
      />

      <Notice>Secara otomatis, laporan suatu triwulan terkunci setelah tanggal 5 bulan pertama triwulan berikutnya. Administrator tetap dapat mengoreksi laporan kapan pun, dan setiap perubahan tercatat di log aktivitas.</Notice>

      {locks.isPending ? (
        <Card><Spinner /></Card>
      ) : locks.isError ? (
        <Card><ErrorState message={errorMessage(locks.error)} onRetry={() => locks.refetch()} /></Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
          {locks.data.map((row) => (
            <Card key={row.quarter} className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{row.label}</h2>
                  <p className="text-[13px] text-muted">{formatDateLong(row.start)} – {formatDateLong(row.end)}</p>
                </div>
                {row.is_locked ? <Badge><Lock className="size-3" aria-hidden="true" />Terkunci</Badge> : <Badge tone="success"><LockOpen className="size-3" aria-hidden="true" />Terbuka</Badge>}
              </div>
              <dl className="flex flex-col gap-1 text-[13px]">
                <div className="flex justify-between gap-2"><dt className="text-muted">Mode</dt><dd className="m-0 font-semibold capitalize">{row.mode}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Kunci otomatis</dt><dd className="m-0 font-semibold">{formatDateTime(row.auto_lock_at)}</dd></div>
                {row.mode === 'manual' && row.changed_by && (
                  <div className="flex justify-between gap-2"><dt className="text-muted">Diubah oleh</dt><dd className="m-0 text-right font-semibold">{row.changed_by}{row.changed_at ? `, ${formatDateTime(row.changed_at)}` : ''}</dd></div>
                )}
              </dl>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-[#f3f1ee] pt-3">
                {row.is_locked ? (
                  <Button variant="soft" size="sm" className="h-10 flex-1" onClick={() => setChange({ row, is_locked: false })}><LockOpen aria-hidden="true" />Buka Kunci</Button>
                ) : (
                  <Button variant="secondary" size="sm" className="h-10 flex-1" onClick={() => setChange({ row, is_locked: true })}><Lock aria-hidden="true" />Kunci</Button>
                )}
                {row.mode === 'manual' && (
                  <Button variant="ghost" size="sm" className="h-10" onClick={() => setChange({ row, is_locked: null })}><RotateCcw aria-hidden="true" />Otomatis</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!change}
        onOpenChange={(o) => !o && setChange(null)}
        title={confirm?.title ?? ''}
        description={confirm?.body ?? ''}
        confirmLabel="Ya, Lanjutkan"
        tone={change?.is_locked ? 'danger' : 'primary'}
        loading={mutation.isPending}
        onConfirm={() => change && mutation.mutate(change)}
      />
    </>
  )
}
