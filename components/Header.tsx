'use client'

import { Smartphone } from 'lucide-react'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
import { OrbitingCircles } from '@/components/ui/orbiting-circles'
import { DotPattern } from '@/components/ui/dot-pattern'

export function Header() {
  return (
    <header className="relative border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <DotPattern
        className="absolute inset-0 opacity-30 [mask-image:radial-gradient(300px_circle_at_center,white,transparent)]"
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
      />
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <OrbitingCircles
                className="absolute -inset-4"
                duration={20}
                delay={20}
                radius={30}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </OrbitingCircles>
              <OrbitingCircles
                className="absolute -inset-4"
                duration={20}
                delay={10}
                radius={30}
                path="reverse"
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
              </OrbitingCircles>
            </div>
            <div>
              <AnimatedGradientText>
                <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                  Aquifer
                </span>
              </AnimatedGradientText>
              <p className="text-sm text-muted-foreground mt-1">Android VM in Browser</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
