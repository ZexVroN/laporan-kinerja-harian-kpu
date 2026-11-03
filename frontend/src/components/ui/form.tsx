import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

const control =
  'w-full rounded-control border border-line-strong bg-surface text-sm font-medium text-ink placeholder:font-normal placeholder:text-muted transition-shadow focus:border-maroon-700 focus:shadow-[0_0_0_4px_rgb(201_162_75/0.28)] focus:outline-none disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-danger'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11 px-3.5', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-24 resize-y px-3.5 py-3 leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'h-11 cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%236B6466%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-3', className)} {...props}>
      {children}
    </select>
  )
}

interface FieldProps {
  label: ReactNode
  htmlFor: string
  required?: boolean
  optional?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}

/** Label, kontrol, petunjuk, dan pesan galat yang terhubung lewat aria. */
export function Field({ label, htmlFor, required, optional, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required && <span className="text-danger"> *</span>}
        {optional && <span className="font-medium text-muted"> (opsional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-semibold text-danger">{error}</p>
      ) : hint ? (
        <div id={`${htmlFor}-hint`} className="text-xs text-muted">{hint}</div>
      ) : null}
    </div>
  )
}

/** Atribut aria untuk kontrol di dalam <Field>. */
export function fieldAria(id: string, error?: string, hint?: boolean) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const
}
