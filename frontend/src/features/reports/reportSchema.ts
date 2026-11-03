import { z } from 'zod'
import { todayYmd } from '@/lib/format'

export const MAX_ACTIVITY = 1000
export const MAX_REMARKS = 500

/** Aturan yang sama dengan DailyReportRequest di backend (backend tetap memvalidasi ulang). */
export const reportSchema = z.object({
  report_date: z
    .string()
    .min(1, 'Tanggal laporan wajib diisi.')
    .refine((v) => v <= todayYmd(), 'Tanggal laporan tidak boleh melebihi hari ini.'),
  activity_description: z
    .string()
    .trim()
    .min(10, 'Kegiatan tugas jabatan minimal 10 karakter.')
    .max(MAX_ACTIVITY, `Kegiatan tugas jabatan maksimal ${MAX_ACTIVITY} karakter.`),
  remarks: z.string().trim().max(MAX_REMARKS, `Keterangan maksimal ${MAX_REMARKS} karakter.`),
})

export type ReportValues = z.infer<typeof reportSchema>
