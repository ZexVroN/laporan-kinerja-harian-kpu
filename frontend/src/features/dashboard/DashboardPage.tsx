import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { errorMessage } from '@/lib/api'
import { useDashboard } from '@/lib/queries'
import type { AdminDashboard as AdminData, PegawaiDashboard as PegawaiData, PimpinanDashboard as PimpinanData } from '@/lib/types'
import { AdminDashboard } from './AdminDashboard'
import { PegawaiDashboard } from './PegawaiDashboard'
import { PimpinanDashboard } from './PimpinanDashboard'

export function DashboardPage() {
  const { data, isPending, isError, error, refetch } = useDashboard()

  if (isPending) {
    return (
      <div className="flex flex-col gap-5" aria-busy="true">
        <span className="sr-only" role="status">Memuat beranda…</span>
        <Skeleton className="h-36 rounded-[20px]" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-card" />)}
        </div>
        <Skeleton className="h-72 rounded-card" />
      </div>
    )
  }

  if (isError) return <ErrorState message={errorMessage(error, 'Beranda gagal dimuat.')} onRetry={() => refetch()} />

  switch (data.role) {
    case 'pegawai':
      return <PegawaiDashboard data={data as PegawaiData} />
    case 'admin':
      return <AdminDashboard data={data as AdminData} />
    case 'pimpinan':
      return <PimpinanDashboard data={data as PimpinanData} />
  }
}
