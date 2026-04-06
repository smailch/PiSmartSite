'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

/** Aligné sur le thème sombre global (:root), indépendamment de next-themes. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            '!border-white/10 !bg-card/95 !text-card-foreground !shadow-xl !shadow-black/40 !backdrop-blur-xl',
          description: '!text-slate-400',
          actionButton: '!text-slate-100',
          cancelButton: '!text-slate-400 !border-white/10',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--card-foreground)',
          '--normal-border': 'rgba(255,255,255,0.1)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
