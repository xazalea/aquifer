'use client'

import styles from './Header.module.css'

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Aquifer</h1>
        <p className={styles.subtitle}>Android VM in Browser</p>
      </div>
    </header>
  )
}
