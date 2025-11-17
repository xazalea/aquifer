'use client'

import { ReactNode } from 'react'
import styles from './ShimmerButton.module.css'

interface ShimmerButtonProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}

export function ShimmerButton({
  children,
  onClick,
  className = '',
  disabled = false,
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${styles.button} ${className}`}
    >
      <span className={styles.shimmer}></span>
      <span className={styles.content}>{children}</span>
    </button>
  )
}
