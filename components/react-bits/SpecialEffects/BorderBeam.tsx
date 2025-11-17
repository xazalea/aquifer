'use client'

import { ReactNode } from 'react'
import styles from './BorderBeam.module.css'

interface BorderBeamProps {
  children: ReactNode
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
}

export function BorderBeam({
  children,
  className = '',
  size = 200,
  duration = 3,
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      className={`${styles.container} ${className}`}
      style={{
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--border-width': `${borderWidth}px`,
      } as React.CSSProperties}
    >
      <div className={styles.beam}></div>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
