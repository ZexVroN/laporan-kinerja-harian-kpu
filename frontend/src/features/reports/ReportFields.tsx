import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Field, fieldAria, Input, Textarea } from '@/components/ui/form'
import { MONTHS, parseDate, quarterOf, ROMAN, todayYmd } from '@/lib/format'
import { MAX_ACTIVITY, type ReportValues } from './reportSchema'

interface Props {
  register: UseFormRegister<ReportValues>
  errors: FieldErrors<ReportValues>
  date: string
  activityLength: number
  idPrefix?: string
  autoFocusActivity?: boolean
}

/** Isian laporan bersama untuk formulir baru dan dialog ubah. */
export function ReportFields({ register, errors, date, activityLength, idPrefix = 'r', autoFocusActivity }: Props) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date)
  const d = valid ? parseDate(date) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Tanggal Laporan" htmlFor={`${idPrefix}-date`} required error={errors.report_date?.message} className="flex-[1_1_200px]">
          <Input type="date" max={todayYmd()} {...register('report_date')} {...fieldAria(`${idPrefix}-date`, errors.report_date?.message)} />
        </Field>
        {d && (
          <div className="flex flex-[2_1_260px] flex-wrap gap-2 pb-1.5" aria-label="Periode otomatis dari tanggal">
            <span className="inline-flex h-8 items-center rounded-full border border-line bg-canvas px-3 text-[13px]"><span className="text-muted">Bulan&nbsp;</span><strong>{MONTHS[d.getMonth()]}</strong></span>
            <span className="inline-flex h-8 items-center rounded-full border border-line bg-canvas px-3 text-[13px]"><span className="text-muted">Tahun&nbsp;</span><strong>{d.getFullYear()}</strong></span>
            <span className="inline-flex h-8 items-center rounded-full bg-maroon-50 px-3 text-[13px] font-bold text-maroon-700">Triwulan {ROMAN[quarterOf(date)]}</span>
          </div>
        )}
      </div>

      <Field
        label="Kegiatan Tugas Jabatan"
        htmlFor={`${idPrefix}-activity`}
        required
        error={errors.activity_description?.message}
        hint={
          <span className="flex justify-between gap-3">
            <span>Tulis kalimat kerja yang jelas dan terukur.</span>
            <span className={`tabular-nums ${activityLength > MAX_ACTIVITY ? 'font-bold text-danger' : ''}`}>{activityLength} / {MAX_ACTIVITY}</span>
          </span>
        }
      >
        <Textarea
          rows={6}
          autoFocus={autoFocusActivity}
          placeholder="Contoh: Menyusun laporan realisasi anggaran belanja barang bulan Oktober"
          {...register('activity_description')}
          {...fieldAria(`${idPrefix}-activity`, errors.activity_description?.message, true)}
        />
      </Field>

      <Field label="Keterangan" htmlFor={`${idPrefix}-remarks`} optional error={errors.remarks?.message}>
        <Textarea rows={3} className="min-h-20" placeholder="Hasil, jumlah berkas, atau kendala" {...register('remarks')} {...fieldAria(`${idPrefix}-remarks`, errors.remarks?.message)} />
      </Field>
    </div>
  )
}
