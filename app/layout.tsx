import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aquifer - Android VM in Browser',
  description: 'Run Android OS and APKs directly in your browser',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

