import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border border-white/50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none shadow-sm backdrop-blur-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-orange-500/15 to-orange-400/10 text-orange-700 [a&]:hover:from-orange-500/25 [a&]:hover:to-orange-400/15',
        secondary:
          'bg-white/60 text-gray-700 [a&]:hover:bg-white/90',
        destructive:
          'bg-red-50/90 text-red-700 [a&]:hover:bg-red-100 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 dark:text-red-300',
        outline:
          'border-gray-200/80 bg-white/50 text-gray-700 [a&]:hover:bg-white/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
