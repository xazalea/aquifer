import { Metadata } from 'next'

export function generateMetadata({ params }: { params: { apkUrl: string[] } }): Metadata {
  const urlParts = Array.isArray(params.apkUrl) ? params.apkUrl : [params.apkUrl]
  const decodedUrl = urlParts.map(part => decodeURIComponent(part)).join('/')
  const appName = decodedUrl.split('/').pop()?.replace('.apk', '') || 'Android App'

  return {
    title: `${appName} - Aquifer`,
    description: `Play ${appName} in your browser with Aquifer - Android emulation in the browser`,
    robots: 'noindex, nofollow', // Don't index embed pages
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
    themeColor: '#667eea',
  }
}

