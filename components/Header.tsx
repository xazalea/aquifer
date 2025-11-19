'use client'

import Image from 'next/image'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import styles from './Header.module.css'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {onMenuClick && (
          <Button
            onClick={onMenuClick}
            variant="ghost"
            size="icon"
            className={styles.menuButton}
            aria-label="Toggle navigation"
          >
            <Menu className={styles.menuIcon} />
          </Button>
        )}
        <div className={styles.logoContainer}>
          <Image
            src="/icon.png"
            alt="Aquifer Logo"
            width={32}
            height={32}
            className={styles.logo}
            priority
          />
        </div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Aquifer</h1>
          <p className={styles.subtitle}>Android VM in Browser</p>
        </div>
      </div>
    </header>
  )
}
