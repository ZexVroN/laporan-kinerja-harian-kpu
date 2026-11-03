import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { Bell, CalendarDays, ChevronDown, ChevronRight, House, KeyRound, LogOut, Menu, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useLogout, useUser } from '@/features/auth/auth'
import { formatDateFull, initials, todayYmd } from '@/lib/format'
import { useDashboard } from '@/lib/queries'
import type { AdminDashboard, Dashboard, PegawaiDashboard } from '@/lib/types'
import { findNavItem } from './navigation'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const user = useUser()
  const { pathname } = useLocation()
  const item = findNavItem(user.role, pathname)

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] print:hidden flex-wrap items-center justify-between gap-3 border-b border-line bg-white/92 px-4 py-3 backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenMenu} aria-label="Buka menu" className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[11px] border border-line bg-surface text-ink lg:hidden">
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <House className="hidden size-4 sm:block" aria-hidden="true" />
          {item && item.section !== item.label && (
            <>
              <span className="hidden sm:inline">{item.section}</span>
              <ChevronRight className="hidden size-3.5 sm:block" aria-hidden="true" />
            </>
          )}
          <span aria-current="page" className="truncate font-bold text-ink">{item?.label ?? 'Halaman'}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="hidden h-10 items-center gap-2 rounded-[10px] bg-maroon-50 px-3.5 text-[13px] font-bold text-maroon-700 md:inline-flex">
          <CalendarDays className="size-4" aria-hidden="true" />
          {formatDateFull(todayYmd())}
        </span>
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  )
}

interface Notice {
  title: string
  body: string
  to: string
}

function noticesFor(data: Dashboard | undefined): Notice[] {
  if (!data) return []
  if (data.role === 'pegawai') {
    const d = data as PegawaiDashboard
    const list: Notice[] = []
    if (d.today.total === 0) list.push({ title: 'Laporan hari ini belum diisi', body: 'Catat kegiatan Anda hari ini agar rekap triwulan lengkap.', to: '/laporan/isi' })
    const gap = d.quarter.workdays - d.quarter.days_reported - (d.today.total === 0 ? 1 : 0)
    if (gap > 0) list.push({ title: `${gap} hari kerja tanpa laporan`, body: `Pada ${d.period.quarter_label} ini. Lengkapi sebelum periode dikunci.`, to: '/laporan' })
    return list
  }
  if (data.role === 'admin') {
    const d = data as AdminDashboard
    return d.today.missing_total > 0
      ? [{ title: `${d.today.missing_total} pegawai belum melapor hari ini`, body: `Dari ${d.today.active_employees} pegawai aktif.`, to: '/beranda' }]
      : []
  }
  return []
}

function Notifications() {
  const { data } = useDashboard()
  const notices = noticesFor(data)
  const navigate = useNavigate()

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={notices.length ? `Pemberitahuan, ${notices.length} baru` : 'Pemberitahuan'}
          className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-[11px] border border-line bg-surface text-[#57534e] hover:text-ink"
        >
          <Bell className="size-[19px]" aria-hidden="true" />
          {notices.length > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-gold-500 ring-2 ring-white" aria-hidden="true" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-50 w-[min(340px,calc(100vw-32px))] rounded-[14px] border border-line bg-surface p-2 shadow-float">
          <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted uppercase">Pemberitahuan</p>
          {notices.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">Tidak ada pemberitahuan. Semua laporan terkini.</p>
          ) : (
            <ul className="flex flex-col">
              {notices.map((n) => (
                <li key={n.title}>
                  <Popover.Close asChild>
                    <button type="button" onClick={() => navigate(n.to)} className="flex w-full cursor-pointer flex-col gap-0.5 rounded-[10px] px-3 py-2.5 text-left hover:bg-canvas">
                      <strong className="text-sm">{n.title}</strong>
                      <span className="text-[13px] text-muted">{n.body}</span>
                    </button>
                  </Popover.Close>
                </li>
              ))}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function ProfileMenu() {
  const user = useUser()
  const logout = useLogout()

  const itemClass = 'flex h-10 cursor-pointer items-center gap-2.5 rounded-[9px] px-3 text-sm outline-none data-[highlighted]:bg-canvas'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label="Menu profil" className="inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full border border-line bg-surface py-0 pr-2.5 pl-1">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-maroon-900 text-[13px] font-extrabold text-gold-300">{initials(user.name)}</span>
          <span className="hidden flex-col items-start leading-tight sm:flex">
            <strong className="max-w-40 truncate text-[13px]">{user.name}</strong>
            <span className="text-xs text-muted">{user.role_label}</span>
          </span>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-56 rounded-[14px] border border-line bg-surface p-1.5 shadow-float">
          <div className="px-3 py-2">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="text-xs text-muted">@{user.username}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/profil"><UserRound className="size-4" aria-hidden="true" />Profil Saya</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={itemClass}>
            <Link to="/profil#kata-sandi"><KeyRound className="size-4" aria-hidden="true" />Ganti Kata Sandi</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={`${itemClass} text-danger`} onSelect={() => logout.mutate()}>
            <LogOut className="size-4" aria-hidden="true" />Keluar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
