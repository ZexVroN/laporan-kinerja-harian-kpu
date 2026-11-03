import { CircleAlert, Info, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/format'
import { Button } from './button'

export function Spinner({ label = 'Memuat…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2.5 py-10 text-sm text-muted', className)}>
      <LoaderCircle className="size-5 animate-spin text-maroon-700" aria-hidden="true" />
      {label}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-[#efece8]', className)} aria-hidden="true" />
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <span className="mb-1 inline-flex size-12 items-center justify-center rounded-2xl bg-maroon-50 text-maroon-700 [&_svg]:size-6" aria-hidden="true">{icon}</span>}
      <p className="font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <CircleAlert className="size-7 text-danger" aria-hidden="true" />
      <p className="text-sm font-semibold">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Coba lagi</Button>}
    </div>
  )
}

export function Notice({ children, tone = 'gold', icon, className }: { children: ReactNode; tone?: 'gold' | 'maroon' | 'warning'; icon?: ReactNode; className?: string }) {
  const tones = { gold: 'bg-gold-100 text-[#5b4512]', maroon: 'bg-maroon-50 text-maroon-800', warning: 'bg-warning-soft text-[#7c3a06]' }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed', tones[tone], className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4" aria-hidden="true">{icon ?? <Info />}</span>
      <div>{children}</div>
    </div>
  )
}
