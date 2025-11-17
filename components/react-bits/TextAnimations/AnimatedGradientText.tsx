'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './AnimatedGradientText.module.css'

interface AnimatedGradientTextProps {
  text: string
  className?: string
  speed?: number
}

export function AnimatedGradientText({
  text,
  className = '',
  speed = 1,
}: AnimatedGradientTextProps) {
  const [gradientPosition, setGradientPosition] = useState(0)

  useEffect(() => {
    let animationFrame: number
    let position = 0

    const animate = () => {
      position += 0.5 * speed
      if (position > 360) position = 0
      setGradientPosition(position)
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [speed])

  return (
    <span
      className={`${styles.gradientText} ${className}`}
      style={{
        backgroundImage: `linear-gradient(${gradientPosition}deg, #667eea 0%, #764ba2 50%, #f093fb 100%)`,
      }}
    >
      {text}
    </span>
  )
}
