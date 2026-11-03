import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Field, fieldAria, Input, Select, Textarea } from '@/components/ui/form'
import { DEFAULT_TIME_SLOTS, MONTHS, parseDate, quarterOf, ROMAN, todayYmd, toMinutes } from '@/lib/format'
import { useAppInfo } from '@/lib/queries'
import { MAX_ACTIVITY, type ReportValues } from './reportSchema'

interface Props {
  register: UseFormRegister<ReportValues>
  errors: FieldErrors<ReportValues>
  date: string
  startTime: string
  endTime: string
  activityLength: number
  idPrefix?: string
  autoFocusActivity?: boolean
}

/** Pilihan jam kegiatan dari pengaturan server (bawaan 07:30–16:30, kelipatan 30 menit). */
export function useTimeSlots() {
  return useAppInfo().data?.work_hours.slots ?? DEFAULT_TIME_SLOTS
}

function duration(start: string, end: string) {
  const total = toMinutes(end) - toMinutes(start)
  if (!start || !end || total <= 0) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  return [h && `${h} jam`, m && `${m} menit`].filter(Boolean).join(' ')
}

/** Isian laporan bersama untuk formulir baru dan dialog ubah. */
export function ReportFields({ register, errors, date, startTime, endTime, activityLength, idPrefix = 'r', autoFocusActivity }: Props) {
  const slots = useTimeSlots()
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date)
  const d = valid ? parseDate(date) : null
  const lasts = duration(startTime, endTime)

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

      <div className="flex flex-wrap items-start gap-4">
        <Field label="Jam Mulai" htmlFor={`${idPrefix}-start`} required error={errors.start_time?.message} className="flex-[1_1_150px]">
          <Select {...register('start_time')} {...fieldAria(`${idPrefix}-start`, errors.start_time?.message)}>
            <option value="">Pilih jam</option>
            {slots.slice(0, -1).map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field
          label="Jam Selesai"
          htmlFor={`${idPrefix}-end`}
          required
          error={errors.end_time?.message}
          hint={lasts ? `Durasi ${lasts}` : `Kelipatan 30 menit, ${slots[0]}–${slots[slots.length - 1]}`}
          className="flex-[1_1_150px]"
        >
          <Select {...register('end_time')} {...fieldAria(`${idPrefix}-end`, errors.end_time?.message, true)}>
            <option value="">Pilih jam</option>
            {slots
              .filter((s) => !startTime || toMinutes(s) > toMinutes(startTime))
              .map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
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
