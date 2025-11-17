'use client'

import { Smartphone, Sparkles } from 'lucide-react'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { DotPattern } from '@/components/ui/dot-pattern'
import { SparklesText } from '@/components/ui/sparkles-text'

export function EnhancedHeader() {
  return (
    <header className="relative border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden">
      <DotPattern
        className="absolute inset-0 opacity-20 [mask-image:radial-gradient(300px_circle_at_center,white,transparent)]"
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        glow
      />
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg relative overflow-hidden">
                <Smartphone className="w-6 h-6 text-white relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
              <OrbitingCircles
                className="absolute -inset-4"
                duration={20}
                delay={20}
                radius={30}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />
              </OrbitingCircles>
              <OrbitingCircles
                className="absolute -inset-4"
                duration={20}
                delay={10}
                radius={30}
                path="reverse"
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50" />
              </OrbitingCircles>
            </div>
            <div>
              <SparklesText
                className="text-3xl font-bold"
                sparklesCount={20}
                colors={{
                  first: '#3b82f6',
                  second: '#8b5cf6',
                }}
              >
                Aquifer
              </SparklesText>
              <AnimatedGradientText className="mt-1">
                <span className="text-sm text-muted-foreground">
                  Android VM in Browser
                </span>
              </AnimatedGradientText>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

