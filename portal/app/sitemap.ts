import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://orbiqen.com'
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/es`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/precios`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/en`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/en/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/en/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ]
}
