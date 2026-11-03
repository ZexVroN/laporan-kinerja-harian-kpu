import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-card border border-line bg-surface', className)} {...props} />
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
  bordered?: boolean
}

export function CardHeader({ title, description, action, className, bordered }: CardHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6', bordered && 'border-b border-[#efece8] pb-4', className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">{title}</h2>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'maroon' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'bg-[#f1f0ee] text-[#57534e]',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  maroon: 'bg-maroon-50 text-maroon-700',
  gold: 'bg-gold-100 text-gold-700',
}

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6.5 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-bold', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  children?: ReactNode
}

export function StatTile({ label, value, hint, icon, badge, children }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface px-5 py-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        {badge ??
          (icon && (
            <span className="inline-flex size-8.5 items-center justify-center rounded-[10px] bg-maroon-50 text-maroon-700 [&_svg]:size-[17px]" aria-hidden="true">
              {icon}
            </span>
          ))}
      </div>
      <div className="text-[34px] leading-tight font-extrabold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="text-[13px] text-muted">{hint}</div>}
      {children}
    </div>
  )
}

export function ProgressBar({ value, tone = 'maroon', label, className }: { value: number; tone?: 'maroon' | 'gold' | 'warning'; label: string; className?: string }) {
  const color = { maroon: 'bg-maroon-700', gold: 'bg-gold-500', warning: 'bg-warning' }[tone]
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} className={cn('h-2 overflow-hidden rounded-full bg-[#f1eeea]', className)}>
      <div className={cn('h-full rounded-full transition-[width]', color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}
