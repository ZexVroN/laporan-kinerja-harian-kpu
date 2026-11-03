import { lazy, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui/feedback'
import { useAuth } from '@/features/auth/auth'
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import type { Role } from '@/lib/types'
import { NotFoundPage } from './NotFoundPage'
import { RouteError } from './RouteError'

// Setiap halaman dimuat terpisah agar unduhan awal kecil.
const ActivityLogsPage = lazy(() => import('@/features/admin/ActivityLogsPage').then((m) => ({ default: m.ActivityLogsPage })))
const EmployeesPage = lazy(() => import('@/features/admin/EmployeesPage').then((m) => ({ default: m.EmployeesPage })))
const MasterDataPage = lazy(() => import('@/features/admin/MasterDataPage').then((m) => ({ default: m.MasterDataPage })))
const PeriodLocksPage = lazy(() => import('@/features/admin/PeriodLocksPage').then((m) => ({ default: m.PeriodLocksPage })))
const SettingsPage = lazy(() => import('@/features/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const GuidePage = lazy(() => import('@/features/profile/GuidePage').then((m) => ({ default: m.GuidePage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const RecapPage = lazy(() => import('@/features/reports/RecapPage').then((m) => ({ default: m.RecapPage })))
const ReportEntryPage = lazy(() => import('@/features/reports/ReportEntryPage').then((m) => ({ default: m.ReportEntryPage })))
const ReportHistoryPage = lazy(() => import('@/features/reports/ReportHistoryPage').then((m) => ({ default: m.ReportHistoryPage })))

function FullPageSpinner() {
  return <Spinner className="min-h-dvh" label="Memeriksa sesi…" />
}

/** Rute yang memerlukan login. Pengguna dengan kata sandi sementara diarahkan menggantinya dulu. */
function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />
  if (user.must_change_password && location.pathname !== '/ganti-kata-sandi') return <Navigate to="/ganti-kata-sandi" replace />

  return <Outlet />
}

/** Pembatasan menu di sisi klien; keamanan sebenarnya tetap di backend. */
function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? children : <Navigate to="/beranda" replace />
}

function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/beranda" replace />
  return <Outlet />
}

const admin: Role[] = ['admin']

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    errorElement: <RouteError />,
    children: [{ path: '/masuk', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      { path: '/ganti-kata-sandi', element: <ChangePasswordPage /> },
      {
        element: <AppShell />,
        children: [
          {
            // Galat halaman ditampilkan di dalam tata letak agar menu tetap tersedia.
            errorElement: <RouteError />,
            children: [
              { path: '/', element: <Navigate to="/beranda" replace /> },
              { path: '/beranda', element: <DashboardPage /> },
              { path: '/laporan', element: <ReportHistoryPage /> },
              { path: '/laporan/isi', element: <RequireRole roles={['pegawai']}><ReportEntryPage /></RequireRole> },
              { path: '/laporan/bulanan', element: <RecapPage key="month" mode="month" /> },
              { path: '/laporan/triwulan', element: <RecapPage key="quarter" mode="quarter" /> },
              { path: '/profil', element: <ProfilePage /> },
              { path: '/panduan', element: <GuidePage /> },
              { path: '/admin/pegawai', element: <RequireRole roles={admin}><EmployeesPage /></RequireRole> },
              { path: '/admin/data-induk', element: <RequireRole roles={admin}><MasterDataPage /></RequireRole> },
              { path: '/admin/kunci-periode', element: <RequireRole roles={admin}><PeriodLocksPage /></RequireRole> },
              { path: '/admin/log', element: <RequireRole roles={admin}><ActivityLogsPage /></RequireRole> },
              { path: '/admin/pengaturan', element: <RequireRole roles={admin}><SettingsPage /></RequireRole> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
