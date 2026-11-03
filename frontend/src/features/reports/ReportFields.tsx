import { Info, Link2 } from 'lucide-react'
import type { FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form'
import { Notice } from '@/components/ui/feedback'
import { Field, fieldAria, Input, Select, Textarea } from '@/components/ui/form'
import { DEFAULT_TIME_SLOTS, MONTHS, parseDate, quarterOf, ROMAN, todayYmd, toMinutes, UNITS_OF_MEASURE, WORK_TYPES } from '@/lib/format'
import { useActionPlans, useAppInfo } from '@/lib/queries'
import { MAX_ACTIVITY, OTHER_PLAN, type ReportValues } from './reportSchema'

interface Props {
  register: UseFormRegister<ReportValues>
  errors: FieldErrors<ReportValues>
  watch: UseFormWatch<ReportValues>
  idPrefix?: string
}

/** Pilihan jam kegiatan dari pengaturan server (bawaan 07:30–16:30, kelipatan 30 menit). */
export function useTimeSlots() {
  return useAppInfo().data?.work_hours.slots ?? DEFAULT_TIME_SLOTS
}

function duration(start: string, end: string) {
  const total = start && end ? toMinutes(end) - toMinutes(start) : 0
  if (total <= 0) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  return [h && `${h} jam`, m && `${m} menit`].filter(Boolean).join(' ')
}

/** Isian laporan bersama untuk formulir baru dan dialog ubah (urutan mengikuti format e-Kinerja). */
export function ReportFields({ register, errors, watch, idPrefix = 'r' }: Props) {
  const slots = useTimeSlots()
  const plans = useActionPlans()
  const [date, startTime, endTime, plan, activity] = watch(['report_date', 'start_time', 'end_time', 'action_plan', 'activity_description'])
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? parseDate(date) : null
  const lasts = duration(startTime, endTime)
  // Rencana Aksi nonaktif hanya muncul bila memang sudah terpilih (laporan lama yang sedang diubah).
  const options = (plans.data ?? []).filter((p) => p.is_active || String(p.id) === plan)
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-6">
      <Field label="Rencana Aksi" htmlFor={id('plan')} required error={errors.action_plan?.message} className="sm:col-span-6">
        <Select {...register('action_plan')} {...fieldAria(id('plan'), errors.action_plan?.message)}>
          <option value="">{plans.isPending ? 'Memuat daftar…' : 'Pilih rencana aksi…'}</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>{p.name}{p.is_active ? '' : ' (nonaktif)'}</option>
          ))}
          <option value={OTHER_PLAN}>Lainnya (isi sendiri)</option>
        </Select>
      </Field>

      {plan === OTHER_PLAN && (
        <Field label="Rencana Aksi lainnya" htmlFor={id('plan-other')} required error={errors.action_plan_other?.message} className="sm:col-span-6">
          <Input placeholder="Contoh: Rapat koordinasi dengan Bawaslu" {...register('action_plan_other')} {...fieldAria(id('plan-other'), errors.action_plan_other?.message)} />
        </Field>
      )}

      <fieldset className="flex flex-col gap-2 sm:col-span-6">
        <legend className="mb-1.5 text-sm font-semibold">Jenis Pekerjaan <span className="text-danger">*</span></legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {WORK_TYPES.map((t) => (
            <label key={t.value} className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
              <input type="radio" value={t.value} {...register('work_type')} className="size-[18px] accent-maroon-700" />
              {t.label}
            </label>
          ))}
        </div>
        <Notice icon={<Info />}>
          <strong>Trajectory</strong> adalah pekerjaan yang berulang dengan target yang jelas, sedangkan <strong>Non-Trajectory</strong> adalah pekerjaan insidental atau tugas tertentu.
        </Notice>
      </fieldset>

      <Field label="Tanggal Kegiatan" htmlFor={id('date')} required error={errors.report_date?.message} className="sm:col-span-2">
        <Input type="date" max={todayYmd()} {...register('report_date')} {...fieldAria(id('date'), errors.report_date?.message)} />
      </Field>
      <Field label="Jam Mulai" htmlFor={id('start')} required error={errors.start_time?.message} className="sm:col-span-2">
        <Select {...register('start_time')} {...fieldAria(id('start'), errors.start_time?.message)}>
          <option value="">Pilih jam</option>
          {slots.slice(0, -1).map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <Field
        label="Jam Selesai"
        htmlFor={id('end')}
        required
        error={errors.end_time?.message}
        hint={lasts ? `Durasi ${lasts}` : `Kelipatan 30 menit, ${slots[0]}–${slots[slots.length - 1]}`}
        className="sm:col-span-2"
      >
        <Select {...register('end_time')} {...fieldAria(id('end'), errors.end_time?.message, true)}>
          <option value="">Pilih jam</option>
          {slots.filter((s) => !startTime || toMinutes(s) > toMinutes(startTime)).map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      {d && (
        <div className="-mt-2 flex flex-wrap gap-2 sm:col-span-6" aria-label="Periode otomatis dari tanggal">
          <span className="inline-flex h-7 items-center rounded-full border border-line bg-canvas px-3 text-xs"><span className="text-muted">Bulan&nbsp;</span><strong>{MONTHS[d.getMonth()]}</strong></span>
          <span className="inline-flex h-7 items-center rounded-full border border-line bg-canvas px-3 text-xs"><span className="text-muted">Tahun&nbsp;</span><strong>{d.getFullYear()}</strong></span>
          <span className="inline-flex h-7 items-center rounded-full bg-maroon-50 px-3 text-xs font-bold text-maroon-700">Triwulan {ROMAN[quarterOf(date)]}</span>
        </div>
      )}

      <Field
        label="Kegiatan Harian"
        htmlFor={id('activity')}
        required
        error={errors.activity_description?.message}
        className="sm:col-span-6"
        hint={
          <span className="flex justify-between gap-3">
            <span>Tulis kalimat kerja yang jelas dan terukur.</span>
            <span className={`tabular-nums ${(activity ?? '').length > MAX_ACTIVITY ? 'font-bold text-danger' : ''}`}>{(activity ?? '').length} / {MAX_ACTIVITY}</span>
          </span>
        }
      >
        <Textarea
          rows={4}
          placeholder="Contoh: Menyusun surat undangan rapat koordinasi."
          {...register('activity_description')}
          {...fieldAria(id('activity'), errors.activity_description?.message, true)}
        />
      </Field>

      <Field label="Sumber Data" htmlFor={id('source')} optional error={errors.data_source?.message} className="sm:col-span-6">
        <Input placeholder="Contoh: SKP, surat tugas, disposisi" {...register('data_source')} {...fieldAria(id('source'), errors.data_source?.message)} />
      </Field>

      <Field label="Target" htmlFor={id('target')} required error={errors.target?.message} className="sm:col-span-2">
        <Input type="number" inputMode="numeric" min={0} step={1} {...register('target')} {...fieldAria(id('target'), errors.target?.message)} />
      </Field>
      <Field label="Realisasi" htmlFor={id('realization')} required error={errors.realization?.message} className="sm:col-span-2">
        <Input type="number" inputMode="numeric" min={0} step={1} {...register('realization')} {...fieldAria(id('realization'), errors.realization?.message)} />
      </Field>
      <Field label="Satuan" htmlFor={id('unit')} required error={errors.unit_of_measure?.message} className="sm:col-span-2">
        <Select {...register('unit_of_measure')} {...fieldAria(id('unit'), errors.unit_of_measure?.message)}>
          {UNITS_OF_MEASURE.map((u) => <option key={u} value={u}>{u}</option>)}
        </Select>
      </Field>

      <Field
        label="Bukti Dukung"
        htmlFor={id('evidence')}
        optional
        error={errors.evidence_url?.message}
        hint="Tautan Google Drive/OneDrive. Pastikan hanya dapat dibuka pihak yang berwenang."
        className="sm:col-span-6"
      >
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted" aria-hidden="true" />
          <Input type="url" inputMode="url" placeholder="https://…" className="pl-10.5" {...register('evidence_url')} {...fieldAria(id('evidence'), errors.evidence_url?.message, true)} />
        </div>
      </Field>

      <Field label="Keterangan" htmlFor={id('remarks')} optional error={errors.remarks?.message} className="sm:col-span-6">
        <Textarea rows={2} className="min-h-16" placeholder="Catatan tambahan atau kendala" {...register('remarks')} {...fieldAria(id('remarks'), errors.remarks?.message)} />
      </Field>

      <label htmlFor={id('done')} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas px-4 py-3 sm:col-span-6">
        <input id={id('done')} type="checkbox" {...register('is_completed')} className="mt-0.5 size-[18px] shrink-0 accent-maroon-700" />
        <span className="flex flex-col gap-0.5">
          <strong className="text-sm">Kegiatan ini selesai</strong>
          <span className="text-xs text-muted">Biarkan kosong bila pekerjaan masih berlanjut ke hari berikutnya.</span>
        </span>
      </label>
    </div>
  )
}
