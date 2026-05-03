import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ToasterClient } from '@/components/toaster-client'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SmartSite - Construction Management',
  description: 'Professional construction management platform for project oversight and team coordination',
  generator: 'v0.app',
  icons: {
    /** `favicon.svg` = marque carrée (onglet) ; logo complet pour « Ajouter à l’écran d’accueil ». */
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/logo-smartsite-clients.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <ToasterClient /> 
        <Analytics />
      </body>
    </html>
  )
}
