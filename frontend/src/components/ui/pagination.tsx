import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatNumber } from '@/lib/format'
import type { PaginationMeta } from '@/lib/types'

/** Nomor halaman ringkas: 1 … 4 5 6 … 30 */
function pages(current: number, last: number): (number | '…')[] {
  const set = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

interface PaginationProps {
  meta: PaginationMeta
  onPage: (page: number) => void
  perPage?: number
  onPerPage?: (n: number) => void
  noun?: string
}

export function Pagination({ meta, onPage, perPage, onPerPage, noun = 'data' }: PaginationProps) {
  const btn = 'inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-[9px] border border-line bg-surface px-2 text-[13px] font-semibold disabled:cursor-default disabled:text-[#a8a29e]'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efece8] px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
        <span>
          {meta.total === 0 ? `Tidak ada ${noun}` : <>Menampilkan <strong className="text-ink">{meta.from}–{meta.to}</strong> dari <strong className="text-ink">{formatNumber(meta.total)}</strong> {noun}</>}
        </span>
        {onPerPage && (
          <label className="inline-flex items-center gap-2">
            Baris
            <select value={perPage} onChange={(e) => onPerPage(Number(e.target.value))} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-[13px] font-semibold">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {meta.last_page > 1 && (
        <nav aria-label="Halaman" className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => onPage(meta.current_page - 1)} disabled={meta.current_page <= 1} aria-label="Halaman sebelumnya">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {pages(meta.current_page, meta.last_page).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-muted">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === meta.current_page ? 'page' : undefined}
                className={cn(btn, p === meta.current_page && 'border-maroon-700 bg-maroon-700 text-white')}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" className={btn} onClick={() => onPage(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page} aria-label="Halaman berikutnya">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
