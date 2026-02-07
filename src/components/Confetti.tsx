/**
 * Confetti Component
 * CSS-based confetti animation for victory celebrations.
 * Renders particles with varied shapes, colors, falling with sway and spin.
 */

import { useMemo } from 'react'

const CONFETTI_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Cyan
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#FF85A2', // Pink
  '#7CFC00', // Lawn Green
  '#FF4500', // Orange Red
  '#00CED1', // Dark Turquoise
]

const CONFETTI_MIN_DURATION_S = 1.5
const CONFETTI_DURATION_VARIANCE_S = 1

type ParticleShape = 'square' | 'rectangle' | 'circle' | 'triangle' | 'star'

interface ConfettiParticle {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotation: number
  size: number
  shape: ParticleShape
  swayAmount: number
  opacity: number
}

interface ConfettiProps {
  active?: boolean
  particleCount?: number
}

function generateParticles(count: number): ConfettiParticle[] {
  const shapes: ParticleShape[] = ['square', 'rectangle', 'circle', 'triangle', 'star']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: CONFETTI_MIN_DURATION_S + Math.random() * CONFETTI_DURATION_VARIANCE_S,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    rotation: Math.random() * 1080,
    size: 6 + Math.random() * 10,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    swayAmount: 20 + Math.random() * 40,
    opacity: 0.7 + Math.random() * 0.3,
  }))
}

function ParticleShape({ particle }: { particle: ConfettiParticle }) {
  const baseStyle = {
    backgroundColor: particle.color,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3)',
    opacity: particle.opacity,
  }

  switch (particle.shape) {
    case 'circle':
      return (
        <div
          className="rounded-full"
          style={{
            ...baseStyle,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
        />
      )
    case 'rectangle':
      return (
        <div
          className="rounded-sm"
          style={{
            ...baseStyle,
            width: `${particle.size * 0.5}px`,
            height: `${particle.size * 1.5}px`,
          }}
        />
      )
    case 'triangle':
      return (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${particle.size / 2}px solid transparent`,
            borderRight: `${particle.size / 2}px solid transparent`,
            borderBottom: `${particle.size}px solid ${particle.color}`,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
            opacity: particle.opacity,
          }}
        />
      )
    case 'star':
      return (
        <div
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color,
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))',
            opacity: particle.opacity,
          }}
        />
      )
    default: // square
      return (
        <div
          className="rounded-sm"
          style={{
            ...baseStyle,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
        />
      )
  }
}

export function Confetti({ active = true, particleCount = 50 }: ConfettiProps) {
  const particles = useMemo(
    () => (active ? generateParticles(particleCount) : []),
    [active, particleCount]
  )

  if (!active) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute top-0"
          style={{
            left: `${particle.left}%`,
            animation: `confetti-fall ${particle.duration}s ease-out ${particle.delay}s forwards`,
            '--sway': `${particle.swayAmount}px`,
            '--rotation': `${particle.rotation}deg`,
          } as React.CSSProperties}
        >
          <div
            style={{
              transform: `rotate(${particle.rotation}deg)`,
              animation: `confetti-spin ${particle.duration * 0.5}s linear infinite`,
            }}
          >
            <ParticleShape particle={particle} />
          </div>
        </div>
      ))}
    </div>
  )
}
