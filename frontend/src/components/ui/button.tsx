import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/format'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-maroon-700 text-white shadow-[0_1px_2px_rgb(92_10_18/0.3)] hover:bg-maroon-800',
        secondary: 'border border-line-strong bg-surface text-ink hover:bg-canvas',
        soft: 'border border-maroon-100 bg-maroon-50 text-maroon-700 hover:bg-maroon-100',
        gold: 'bg-gold-500 font-bold text-[#2a1a00] hover:bg-gold-300',
        ghost: 'text-maroon-700 hover:bg-maroon-50',
        danger: 'bg-danger text-white hover:bg-[#991b1b]',
        icon: 'border border-line bg-surface text-[#57534e] hover:bg-canvas hover:text-ink',
        'icon-danger': 'border border-[#f3d0d0] bg-surface text-danger hover:bg-danger-soft',
      },
      size: {
        md: 'h-11 px-5',
        sm: 'h-9 px-3.5 text-[13px]',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export function Button({ className, variant, size, asChild, loading, disabled, children, type = 'button', ...props }: ButtonProps) {
  if (asChild) {
    return <Slot className={cn(buttonVariants({ variant, size }), className)} {...props}>{children}</Slot>
  }
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export { buttonVariants }
