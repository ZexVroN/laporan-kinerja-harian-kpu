import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Suspense, useState, type ReactNode } from 'react'
import { Outlet } from 'react-router'
import { Spinner } from '@/components/ui/feedback'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <a href="#konten" className="sr-only z-50 rounded-lg bg-surface px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Lewati ke konten
      </a>

      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 lg:block print:hidden">
        <Sidebar />
      </aside>

      {/* Menu laci untuk layar di bawah 1024 px */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#1f1a1b]/45 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(288px,86vw)] focus:outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu navigasi</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Pilih halaman</DialogPrimitive.Description>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 pt-6 pb-12 focus:outline-none sm:px-8 sm:pt-7">
          <Suspense fallback={<Spinner label="Memuat halaman…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  )
}
