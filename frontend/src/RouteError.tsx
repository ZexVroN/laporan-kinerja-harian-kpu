import { RotateCcw, TriangleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

const RELOAD_FLAG = 'silakh:reloaded-after-update'

/** Berkas halaman gagal dimuat — biasanya karena aplikasi baru saja diperbarui di server. */
export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(message)
}

/** Muat ulang sekali per sesi tab agar tidak berulang tanpa henti bila server benar-benar bermasalah. */
export function reloadOnceForUpdate() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return false
    sessionStorage.setItem(RELOAD_FLAG, '1')
  } catch {
    /* sessionStorage tidak tersedia: tetap muat ulang */
  }
  window.location.reload()
  return true
}

export function clearReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {
    /* abaikan */
  }
}

export function RouteError() {
  const error = useRouteError()
  const updated = isChunkLoadError(error)

  if (updated && reloadOnceForUpdate()) return null

  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-4 py-10">
      <div role="alert" className="flex max-w-md flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-8 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-warning-soft text-warning" aria-hidden="true">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="text-lg font-bold">{updated ? 'Aplikasi telah diperbarui' : 'Terjadi kesalahan'}</h1>
        <p className="text-sm text-muted">
          {updated
            ? 'Versi baru aplikasi tersedia. Muat ulang halaman untuk melanjutkan.'
            : 'Halaman ini tidak dapat ditampilkan. Muat ulang halaman; jika masih terjadi, hubungi Administrator.'}
        </p>
        <Button onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden="true" />
          Muat Ulang
        </Button>
      </div>
    </div>
  )
}
