'use client'

import { useState, useEffect } from 'react'
import { Search, Download, Package, Loader2 } from 'lucide-react'
import { APKStore, APKStoreApp } from '@/lib/apk-store'
import { Button } from '@/components/ui/button'
import styles from './AppStore.module.css'

interface AppStoreProps {
  onInstallAPK: (apkData: ArrayBuffer) => Promise<void>
  isInstalling: boolean
}

export function AppStore({ onInstallAPK, isInstalling }: AppStoreProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<APKStoreApp[]>([])
  const [popularApps, setPopularApps] = useState<APKStoreApp[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadPopularApps()
  }, [])

  const loadPopularApps = async () => {
    try {
      const apps = await APKStore.getPopularApps()
      setPopularApps(apps)
    } catch (error) {
      console.error('Failed to load popular apps:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const results = await APKStore.searchAPK(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleDownload = async (app: APKStoreApp) => {
    try {
      const downloadUrl = await APKStore.getDownloadUrl(app.packageName, app.version)
      if (downloadUrl) {
        const apkData = await APKStore.downloadAPK(downloadUrl)
        await onInstallAPK(apkData)
      } else {
        alert('Download URL not available. Please upload the APK file manually.')
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert('Failed to download APK. Please try uploading manually.')
    }
  }

  const formatSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const displayApps = searchQuery ? searchResults : popularApps

  return (
    <div className={styles.store}>
      <div className={styles.searchSection}>
        <h3 className={styles.sectionTitle}>
          <Search className={styles.icon} />
          Search APKs
        </h3>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search by app name or package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={styles.searchInput}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className={styles.searchButton}
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className={styles.appsSection}>
        <h3 className={styles.sectionTitle}>
          <Package className={styles.icon} />
          {searchQuery ? 'Search Results' : 'Popular Apps'}
        </h3>
        <div className={styles.appsGrid}>
          {displayApps.length === 0 ? (
            <p className={styles.emptyMessage}>
              {searchQuery ? 'No apps found. Try a different search.' : 'Loading apps...'}
            </p>
          ) : (
            displayApps.map((app) => (
              <div key={app.packageName} className={styles.appCard}>
                <div className={styles.appIcon}>
                  <Package className="w-8 h-8" />
                </div>
                <div className={styles.appInfo}>
                  <h4 className={styles.appName}>{app.appName}</h4>
                  <p className={styles.appPackage}>{app.packageName}</p>
                  <p className={styles.appVersion}>v{app.version}</p>
                  {app.description && (
                    <p className={styles.appDescription}>{app.description}</p>
                  )}
                  <p className={styles.appSize}>{formatSize(app.size)}</p>
                </div>
                <Button
                  onClick={() => handleDownload(app)}
                  disabled={isInstalling}
                  className={styles.downloadButton}
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isInstalling ? 'Installing...' : 'Install'}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.infoSection}>
        <p className={styles.infoText}>
          <strong>Note:</strong> APK download functionality requires integration with APK download services.
          For now, please upload APK files manually using the upload button.
        </p>
      </div>
    </div>
  )
}

