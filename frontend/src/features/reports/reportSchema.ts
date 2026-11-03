import { z } from 'zod'
import type { ReportInput } from '@/lib/queries'
import type { Report } from '@/lib/types'
import { todayYmd, toMinutes } from '@/lib/format'

export const MAX_ACTIVITY = 1000
export const MAX_REMARKS = 500
export const OTHER_PLAN = 'lainnya'

const wholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .regex(/^\d+$/, `${label} harus berupa bilangan bulat 0 atau lebih.`)

/** Aturan yang sama dengan DailyReportRequest di backend (backend tetap memvalidasi ulang). */
export const reportSchema = z
  .object({
    action_plan: z.string().min(1, 'Rencana Aksi wajib dipilih.'),
    action_plan_other: z.string().trim().max(200, 'Rencana Aksi lainnya maksimal 200 karakter.'),
    work_type: z.enum(['trajectory', 'non_trajectory'], { message: 'Jenis pekerjaan wajib dipilih.' }),
    report_date: z
      .string()
      .min(1, 'Tanggal laporan wajib diisi.')
      .refine((v) => v <= todayYmd(), 'Tanggal laporan tidak boleh melebihi hari ini.'),
    start_time: z.string().min(1, 'Jam mulai wajib dipilih.'),
    end_time: z.string().min(1, 'Jam selesai wajib dipilih.'),
    activity_description: z
      .string()
      .trim()
      .min(10, 'Kegiatan harian minimal 10 karakter.')
      .max(MAX_ACTIVITY, `Kegiatan harian maksimal ${MAX_ACTIVITY} karakter.`),
    data_source: z.string().trim().max(150, 'Sumber data maksimal 150 karakter.'),
    target: wholeNumber('Target'),
    realization: wholeNumber('Realisasi'),
    unit_of_measure: z.string().min(1, 'Satuan wajib dipilih.'),
    evidence_url: z
      .string()
      .trim()
      .max(500, 'Tautan bukti dukung terlalu panjang.')
      .refine((v) => v === '' || /^https:\/\/\S+\.\S+/.test(v), 'Bukti dukung harus berupa tautan https:// yang valid.'),
    remarks: z.string().trim().max(MAX_REMARKS, `Keterangan maksimal ${MAX_REMARKS} karakter.`),
    is_completed: z.boolean(),
  })
  .refine((v) => !v.start_time || !v.end_time || toMinutes(v.end_time) > toMinutes(v.start_time), {
    path: ['end_time'],
    message: 'Jam selesai harus setelah jam mulai.',
  })
  .refine((v) => v.action_plan !== OTHER_PLAN || v.action_plan_other.length > 0, {
    path: ['action_plan_other'],
    message: 'Isi Rencana Aksi lainnya.',
  })

export type ReportValues = z.infer<typeof reportSchema>

/** Nilai awal formulir baru; tanggal & jam diisi oleh halaman. */
export function emptyReport(overrides: Partial<ReportValues> = {}): ReportValues {
  return {
    action_plan: '',
    action_plan_other: '',
    work_type: 'non_trajectory',
    report_date: todayYmd(),
    start_time: '',
    end_time: '',
    activity_description: '',
    data_source: 'SKP / Rencana Aksi',
    target: '1',
    realization: '1',
    unit_of_measure: 'Dokumen',
    evidence_url: '',
    remarks: '',
    is_completed: false,
    ...overrides,
  }
}

/** Isi formulir dari laporan yang sudah ada (laporan lama boleh kosong pada isian baru). */
export function valuesFromReport(r: Report): ReportValues {
  return emptyReport({
    action_plan: r.action_plan ? (r.action_plan.is_other ? OTHER_PLAN : String(r.action_plan.id)) : '',
    action_plan_other: r.action_plan?.is_other ? r.action_plan.name : '',
    work_type: r.work_type ?? 'non_trajectory',
    report_date: r.report_date,
    start_time: r.start_time ?? '',
    end_time: r.end_time ?? '',
    activity_description: r.activity_description,
    data_source: r.data_source ?? '',
    target: r.target == null ? '' : String(r.target),
    realization: r.realization == null ? '' : String(r.realization),
    unit_of_measure: r.unit_of_measure ?? 'Dokumen',
    evidence_url: r.evidence_url ?? '',
    remarks: r.remarks ?? '',
    is_completed: r.is_completed ?? false,
  })
}

export function toPayload(v: ReportValues): ReportInput {
  const other = v.action_plan === OTHER_PLAN
  return {
    action_plan_id: other ? null : Number(v.action_plan),
    action_plan_other: other ? v.action_plan_other : null,
    work_type: v.work_type,
    report_date: v.report_date,
    start_time: v.start_time,
    end_time: v.end_time,
    activity_description: v.activity_description,
    data_source: v.data_source || null,
    target: Number(v.target),
    realization: Number(v.realization),
    unit_of_measure: v.unit_of_measure,
    evidence_url: v.evidence_url || null,
    remarks: v.remarks || null,
    is_completed: v.is_completed,
  }
}

/** Galat server memakai nama kolom API; petakan ke nama isian formulir. */
export function formField(apiField: string): keyof ReportValues {
  return (apiField === 'action_plan_id' ? 'action_plan' : apiField) as keyof ReportValues
}
