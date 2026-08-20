import type { Metadata } from 'next'
import './globals.css'

const siteUrl = 'https://orbiqen.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Orbiqen | Gateway de APIs de IA',
    template: '%s | Orbiqen',
  },
  description: 'Accedé a modelos GPT y Claude desde una API compatible, con saldo prepago, métricas de uso y configuración automática.',
  applicationName: 'Orbiqen',
  keywords: ['API de inteligencia artificial', 'API GPT', 'API Claude', 'gateway de IA', 'OpenAI compatible', 'Claude API'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: siteUrl,
    siteName: 'Orbiqen',
    title: 'Orbiqen | Gateway de APIs de IA',
    description: 'Una sola plataforma para conectar aplicaciones con modelos GPT y Claude.',
  },
  twitter: {
    card: 'summary',
    title: 'Orbiqen | Gateway de APIs de IA',
    description: 'Conectá tus aplicaciones con modelos GPT y Claude desde una API compatible.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Orbiqen',
              url: siteUrl,
              logo: `${siteUrl}/orbiqen-logo.png`,
              description: 'Gateway de APIs de inteligencia artificial con acceso a modelos GPT y Claude.',
            }),
          }}
        />
      </body>
    </html>
  )
}
