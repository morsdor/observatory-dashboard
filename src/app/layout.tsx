import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { StoreProvider } from '@/stores/Provider'
import { DataStreamProvider } from '@/providers/DataStreamProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Observatory Dashboard',
  description: 'High-performance real-time data dashboard for large streaming datasets',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DataStreamProvider autoConnect={false}>
          <StoreProvider>
            {children}
          </StoreProvider>
        </DataStreamProvider>
      </body>
    </html>
  )
}
