'use client'

import { useState } from 'react'
import { Users, Settings, User, MessageSquare, X, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './NavigationSidebar.module.css'

interface NavigationSidebarProps {
  onClose?: () => void
}

export function NavigationSidebar({ onClose }: NavigationSidebarProps) {
  const [activeView, setActiveView] = useState<'friends' | 'settings' | 'profile' | 'dms' | null>(null)

  const handleNavClick = (view: 'friends' | 'settings' | 'profile' | 'dms') => {
    setActiveView(view)
  }

  return (
    <>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Navigation</h2>
          {onClose && (
            <button onClick={onClose} className={styles.closeButton} aria-label="Close sidebar">
              <X className={styles.icon} />
            </button>
          )}
        </div>
        
        <nav className={styles.nav}>
          <button
            onClick={() => handleNavClick('friends')}
            className={`${styles.navButton} ${activeView === 'friends' ? styles.active : ''}`}
          >
            <Users className={styles.navIcon} />
            <span>Friends</span>
          </button>
          
          <button
            onClick={() => handleNavClick('dms')}
            className={`${styles.navButton} ${activeView === 'dms' ? styles.active : ''}`}
          >
            <MessageSquare className={styles.navIcon} />
            <span>Messages</span>
          </button>
          
          <button
            onClick={() => handleNavClick('profile')}
            className={`${styles.navButton} ${activeView === 'profile' ? styles.active : ''}`}
          >
            <User className={styles.navIcon} />
            <span>Profile</span>
          </button>
          
          <button
            onClick={() => handleNavClick('settings')}
            className={`${styles.navButton} ${activeView === 'settings' ? styles.active : ''}`}
          >
            <Settings className={styles.navIcon} />
            <span>Settings</span>
          </button>
        </nav>

        {/* Content Area */}
        <div className={styles.content}>
          {activeView === 'friends' && (
            <div className={styles.viewContent}>
              <h3 className={styles.viewTitle}>Friends</h3>
              <p className={styles.viewDescription}>Your friends list will appear here.</p>
            </div>
          )}
          
          {activeView === 'dms' && (
            <div className={styles.viewContent}>
              <h3 className={styles.viewTitle}>Direct Messages</h3>
              <p className={styles.viewDescription}>Your conversations will appear here.</p>
            </div>
          )}
          
          {activeView === 'profile' && (
            <div className={styles.viewContent}>
              <h3 className={styles.viewTitle}>Profile</h3>
              <div className={styles.profileSection}>
                <div className={styles.profileAvatar}>
                  <User className={styles.avatarIcon} />
                </div>
                <p className={styles.viewDescription}>Your profile information will appear here.</p>
              </div>
            </div>
          )}
          
          {activeView === 'settings' && (
            <div className={styles.viewContent}>
              <h3 className={styles.viewTitle}>Settings</h3>
              <SettingsView />
            </div>
          )}
          
          {!activeView && (
            <div className={styles.viewContent}>
              <p className={styles.viewDescription}>Select a navigation item to get started.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SettingsView() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      // Clear all storage
      const { appStorage } = await import('@/lib/app-storage')
      await appStorage.clearAll()
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases()
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name)
          }
        }
      }
      
      // Clear localStorage
      localStorage.clear()
      
      // Clear sessionStorage
      sessionStorage.clear()
      
      // Reload the page
      window.location.reload()
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account. Please try again.')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className={styles.settingsContent}>
      <div className={styles.settingsSection}>
        <h4 className={styles.settingsSectionTitle}>Account</h4>
        <div className={styles.settingsItem}>
          <p className={styles.settingsLabel}>Account Management</p>
          <p className={styles.settingsDescription}>
            Manage your account settings and data.
          </p>
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h4 className={styles.settingsSectionTitle}>Danger Zone</h4>
        <div className={styles.dangerZone}>
          {!showDeleteConfirm ? (
            <Button
              onClick={handleDeleteAccount}
              variant="destructive"
              className={styles.deleteButton}
            >
              Delete Account
            </Button>
          ) : (
            <div className={styles.deleteConfirm}>
              <p className={styles.deleteWarning}>
                Are you sure you want to delete your account? This will permanently delete all your data, including installed apps and settings. This action cannot be undone.
              </p>
              <div className={styles.deleteActions}>
                <Button
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  disabled={isDeleting}
                  className={styles.deleteConfirmButton}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                </Button>
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setIsDeleting(false)
                  }}
                  variant="outline"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

