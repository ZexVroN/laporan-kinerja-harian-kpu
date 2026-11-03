import { CircleCheck, ExternalLink, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/card'
import type { Report } from '@/lib/types'

/** Selesai / Berlanjut; laporan lama tanpa status tidak menampilkan apa pun. */
export function StatusBadge({ report }: { report: Pick<Report, 'is_completed'> }) {
  if (report.is_completed == null) return null
  return report.is_completed ? (
    <Badge tone="success"><CircleCheck className="size-3" aria-hidden="true" />Selesai</Badge>
  ) : (
    <Badge tone="warning"><RotateCcw className="size-3" aria-hidden="true" />Berlanjut</Badge>
  )
}

/** "3 / 5 Dokumen" — realisasi terhadap target. */
export function progressText(r: Pick<Report, 'realization' | 'target' | 'unit_of_measure'>) {
  return r.realization == null || r.target == null ? null : `${r.realization} / ${r.target} ${r.unit_of_measure ?? ''}`.trim()
}

/** Tautan bukti dukung; hanya tautan https yang sudah divalidasi server yang ditampilkan. */
export function EvidenceLink({ url, compact }: { url: string | null; compact?: boolean }) {
  if (!url || !url.startsWith('https://')) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-maroon-700 hover:underline">
      <ExternalLink className="size-3.5" aria-hidden="true" />
      {compact ? 'Bukti' : 'Buka bukti dukung'}
    </a>
  )
}
