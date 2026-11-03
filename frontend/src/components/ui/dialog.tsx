import * as DialogPrimitive from '@radix-ui/react-dialog'
import { TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/format'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** "side" untuk panel formulir di sisi kanan (lebar penuh di ponsel). */
  variant?: 'center' | 'side'
  className?: string
}

export function Dialog({ open, onOpenChange, title, description, children, footer, variant = 'center', className }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#1f1a1b]/45 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex max-h-[100dvh] flex-col bg-surface shadow-float focus:outline-none',
            variant === 'center'
              ? 'top-1/2 left-1/2 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-card max-h-[calc(100dvh-32px)]'
              : 'top-0 right-0 h-full w-full max-w-[480px] sm:rounded-l-card',
            className,
          )}
        >
          <div className={cn('flex items-start justify-between gap-3 px-5 py-4 sm:px-6', variant === 'side' ? 'border-b-2 border-gold-500 bg-maroon-900 text-white sm:rounded-tl-card' : 'border-b border-[#efece8]')}>
            <div className="flex flex-col gap-0.5">
              <DialogPrimitive.Title className="text-[17px] font-bold">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className={cn('text-[13px]', variant === 'side' ? 'text-white/75' : 'text-muted')}>{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Tutup" className={cn('inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[9px]', variant === 'side' ? 'bg-white/10 text-white hover:bg-white/20' : 'text-muted hover:bg-canvas')}>
                <X className="size-4" aria-hidden="true" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#efece8] px-5 py-4 sm:px-6">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  tone?: 'danger' | 'primary'
}

/** Konfirmasi sebelum tindakan yang merusak atau tidak dapat dibatalkan. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, loading, tone = 'danger' }: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[#1f1a1b]/45" />
        <DialogPrimitive.Content role="alertdialog" className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-card bg-surface p-6 shadow-float focus:outline-none">
          <div className="flex gap-3.5">
            <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-maroon-50 text-maroon-700')} aria-hidden="true">
              <TriangleAlert className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-base font-bold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm leading-relaxed text-muted">{description}</DialogPrimitive.Description>
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" size="sm" className="h-10">Batal</Button>
            </DialogPrimitive.Close>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="sm" className="h-10" loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
