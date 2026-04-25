import * as React from 'react'

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'skeleton-premium rounded-xl border border-white/30 bg-slate-200/40',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
