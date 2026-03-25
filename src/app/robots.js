const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://credo.vercel.app'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/dashboard/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
