import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gateway AI',
  description: 'Panel de consumo y claves API',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
