'use client'

import { useEffect, useRef } from 'react'
import styles from './AnimatedGridPattern.module.css'

interface AnimatedGridPatternProps {
  className?: string
  squareSize?: number
  gap?: number
  color?: string
}

export function AnimatedGridPattern({
  className = '',
  squareSize = 40,
  gap = 4,
  color = '#1a1a1a',
}: AnimatedGridPatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    resize()
    window.addEventListener('resize', resize)

    let animationFrame: number
    let time = 0

    const animate = () => {
      time += 0.01
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const totalSize = squareSize + gap
      const cols = Math.ceil(canvas.width / totalSize) + 1
      const rows = Math.ceil(canvas.height / totalSize) + 1

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * totalSize
          const y = j * totalSize
          const offset = Math.sin(time + i * 0.1 + j * 0.1) * 0.5 + 0.5
          const alpha = 0.1 + offset * 0.2

          ctx.fillStyle = color
          ctx.globalAlpha = alpha
          ctx.fillRect(x, y, squareSize, squareSize)
        }
      }

      ctx.globalAlpha = 1
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
    }
  }, [squareSize, gap, color])

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.grid} ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
