'use client'

import Image from 'next/image'
import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
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
        <h1 className={styles.title}>Aquifer</h1>
        <p className={styles.subtitle}>Android VM in Browser</p>
      </div>
    </header>
  )
}
