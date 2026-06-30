import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Nav } from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Snaply',
  description: 'Share your moments',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
