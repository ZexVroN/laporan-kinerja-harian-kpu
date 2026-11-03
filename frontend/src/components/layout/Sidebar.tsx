import { LogOut, ShieldCheck } from 'lucide-react'
import { NavLink } from 'react-router'
import { useLogout, useUser } from '@/features/auth/auth'
import { cn, initials } from '@/lib/format'
import { useAppInfo } from '@/lib/queries'
import { NAVIGATION } from './navigation'

export function Brand() {
  const { data } = useAppInfo()
  return (
    <div className="flex items-center gap-3 px-2">
      <span className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-xl border-[1.5px] border-gold-500 bg-white/8 text-gold-300" aria-hidden="true">
        <ShieldCheck className="size-[22px]" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-col">
        <strong className="text-[17px] tracking-wide">{data?.app_name ?? 'SILAKH'}</strong>
        <span className="truncate text-xs text-white/70">{data?.instansi_nama ?? 'Laporan Kinerja Harian'}</span>
      </div>
    </div>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useUser()
  const logout = useLogout()

  return (
    <nav aria-label="Navigasi utama" className="relative flex h-full flex-col gap-7 overflow-hidden bg-maroon-900 px-4 py-6 text-white">
      <svg aria-hidden="true" viewBox="0 0 264 260" className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-full" fill="none" preserveAspectRatio="none">
        <path d="M-20 260 C 60 210, 170 150, 300 140" stroke="#C9A24B" strokeWidth="1.6" opacity="0.55" />
        <path d="M-20 260 C 70 225, 180 180, 300 176" stroke="#C9A24B" strokeWidth="1" opacity="0.3" />
      </svg>

      <Brand />

      <div className="relative flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAVIGATION[user.role].map((group) => (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="px-3 pt-4 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-gold-300 uppercase">{group.title}</p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex h-11 items-center gap-3 rounded-[11px] px-3 text-sm transition-colors',
                        isActive ? 'bg-white font-bold text-maroon-900 shadow-[0_6px_16px_rgb(0_0_0/0.18)]' : 'font-medium text-white/85 hover:bg-white/8 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn('size-[19px]', isActive && 'text-gold-600')} strokeWidth={isActive ? 2 : 1.8} aria-hidden="true" />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="relative flex flex-col gap-2.5">
        <div className="flex items-center gap-3 rounded-[14px] border border-gold-500/30 bg-black/20 p-3">
          <span className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-gold-500 text-sm font-extrabold text-maroon-950">{initials(user.name)}</span>
          <div className="flex min-w-0 flex-col">
            <strong className="truncate text-sm">{user.name}</strong>
            <span className="text-xs text-white/70">{user.role_label}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex h-11 cursor-pointer items-center gap-3 rounded-[11px] px-3 text-sm font-medium text-white/85 hover:bg-white/8 hover:text-white disabled:opacity-60"
        >
          <LogOut className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
          Keluar
        </button>
      </div>
    </nav>
  )
}
