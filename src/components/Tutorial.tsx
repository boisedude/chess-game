/**
 * Chess Tutorial Component
 *
 * 9-step guided walkthrough with inline SVG diagrams teaching chess basics.
 * Steps: welcome, goal, pieces, movement, captures, special moves, check/mate, tips, ready.
 * onComplete marks tutorial as done in localStorage to prevent re-showing.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

interface TutorialProps {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

interface TutorialStep {
  title: string
  description: string
  tip?: string
  image?: React.ReactNode
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Chess!',
    description:
      'Chess is a two-player strategy game played on an 8\u00d78 board. White moves first. The goal is to checkmate your opponent\'s King!',
    image: (
      <div className="flex items-center justify-center gap-6 py-4">
        <div className="text-center">
          <div className="text-5xl mb-1">♔</div>
          <div className="text-xs font-semibold text-gray-600">White</div>
        </div>
        <div className="text-2xl font-bold text-gray-400">VS</div>
        <div className="text-center">
          <div className="text-5xl mb-1">♚</div>
          <div className="text-xs font-semibold text-gray-600">Black</div>
        </div>
      </div>
    ),
  },
  {
    title: 'The Goal',
    description:
      'Checkmate your opponent\'s King! This means their King is under attack and cannot escape. Capture pieces, control the board, and corner their King.',
    tip: 'Plan ahead! Every move should either attack, defend, or improve your position.',
  },
  {
    title: 'Your Pieces',
    description:
      'Each side starts with 16 pieces: 1 King, 1 Queen, 2 Rooks, 2 Bishops, 2 Knights, and 8 Pawns. Each type moves differently.',
    image: (
      <div className="grid grid-cols-3 gap-3 py-4 text-center text-sm">
        <div>
          <div className="text-3xl">♔</div>
          <div className="font-semibold">King</div>
          <div className="text-xs text-gray-500">1 square, any direction</div>
        </div>
        <div>
          <div className="text-3xl">♕</div>
          <div className="font-semibold">Queen</div>
          <div className="text-xs text-gray-500">Any direction, any distance</div>
        </div>
        <div>
          <div className="text-3xl">♖</div>
          <div className="font-semibold">Rook</div>
          <div className="text-xs text-gray-500">Straight lines</div>
        </div>
        <div>
          <div className="text-3xl">♗</div>
          <div className="font-semibold">Bishop</div>
          <div className="text-xs text-gray-500">Diagonals only</div>
        </div>
        <div>
          <div className="text-3xl">♘</div>
          <div className="font-semibold">Knight</div>
          <div className="text-xs text-gray-500">L-shape, jumps pieces</div>
        </div>
        <div>
          <div className="text-3xl">♙</div>
          <div className="font-semibold">Pawn</div>
          <div className="text-xs text-gray-500">Forward 1, captures diagonal</div>
        </div>
      </div>
    ),
  },
  {
    title: 'How Pieces Move',
    description:
      'Click a piece to see its valid moves highlighted in green. Click a highlighted square to move there. Each piece type has unique movement rules.',
    tip: 'Knights are the only pieces that can jump over others!',
    image: (
      <div className="flex justify-center py-4">
        <svg width="200" height="160" viewBox="0 0 200 160" role="img" aria-label="Knight on a mini board showing L-shaped movement destinations">
          {/* Mini board - 4x4 */}
          <rect x="20" y="0" width="40" height="40" fill="#f0d9b5" />
          <rect x="60" y="0" width="40" height="40" fill="#769656" />
          <rect x="100" y="0" width="40" height="40" fill="#f0d9b5" />
          <rect x="140" y="0" width="40" height="40" fill="#769656" />
          <rect x="20" y="40" width="40" height="40" fill="#769656" />
          <rect x="60" y="40" width="40" height="40" fill="#f0d9b5" />
          <rect x="100" y="40" width="40" height="40" fill="#769656" />
          <rect x="140" y="40" width="40" height="40" fill="#f0d9b5" />
          <rect x="20" y="80" width="40" height="40" fill="#f0d9b5" />
          <rect x="60" y="80" width="40" height="40" fill="#769656" />
          <rect x="100" y="80" width="40" height="40" fill="#f0d9b5" />
          <rect x="140" y="80" width="40" height="40" fill="#769656" />
          <rect x="20" y="120" width="40" height="40" fill="#769656" />
          <rect x="60" y="120" width="40" height="40" fill="#f0d9b5" />
          <rect x="100" y="120" width="40" height="40" fill="#769656" />
          <rect x="140" y="120" width="40" height="40" fill="#f0d9b5" />

          {/* Knight in center */}
          <text x="80" y="72" textAnchor="middle" fontSize="28" fill="#fff" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>♘</text>

          {/* Knight L-shape destinations */}
          <circle cx="40" cy="20" r="8" fill="#22c55e" opacity="0.6" />
          <circle cx="120" cy="20" r="8" fill="#22c55e" opacity="0.6" />
          <circle cx="40" cy="100" r="8" fill="#22c55e" opacity="0.6" />
          <circle cx="120" cy="100" r="8" fill="#22c55e" opacity="0.6" />
          <circle cx="160" cy="40" r="8" fill="#22c55e" opacity="0.6" />
          <circle cx="160" cy="80" r="8" fill="#22c55e" opacity="0.6" />

          {/* L-shape arrows */}
          <path d="M72 48 L45 25" stroke="#22c55e" strokeWidth="2" fill="none" strokeDasharray="3,2" markerEnd="url(#tutArrow)" />
          <path d="M88 48 L115 25" stroke="#22c55e" strokeWidth="2" fill="none" strokeDasharray="3,2" markerEnd="url(#tutArrow)" />

          <defs>
            <marker id="tutArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
      </div>
    ),
  },
  {
    title: 'Capturing Pieces',
    description:
      'Move your piece to a square occupied by an opponent\'s piece to capture it. The captured piece is removed from the board. Pawns capture diagonally forward.',
    tip: 'Capture high-value pieces when possible! Queen (9) > Rook (5) > Bishop/Knight (3) > Pawn (1)',
    image: (
      <div className="flex justify-center py-4">
        <svg width="160" height="120" viewBox="0 0 160 120" role="img" aria-label="White pawn capturing a black knight diagonally">
          {/* Board squares */}
          <rect x="20" y="40" width="40" height="40" fill="#769656" />
          <rect x="60" y="40" width="40" height="40" fill="#f0d9b5" />
          <rect x="100" y="40" width="40" height="40" fill="#769656" />
          <rect x="20" y="80" width="40" height="40" fill="#f0d9b5" />
          <rect x="60" y="80" width="40" height="40" fill="#769656" />
          <rect x="100" y="80" width="40" height="40" fill="#f0d9b5" />

          {/* White pawn */}
          <text x="80" y="112" textAnchor="middle" fontSize="28" fill="#fff" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>♙</text>

          {/* Black knight (target) with red ring */}
          <circle cx="40" cy="60" r="16" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
          <text x="40" y="72" textAnchor="middle" fontSize="28" fill="#1a1a1a">♞</text>

          {/* Capture arrow */}
          <path d="M72 90 L48 68" stroke="#ef4444" strokeWidth="3" fill="none" markerEnd="url(#captureArrow)" />

          <defs>
            <marker id="captureArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
      </div>
    ),
  },
  {
    title: 'Special Moves',
    description:
      'Chess has three special moves that add strategic depth to the game.',
    image: (
      <div className="space-y-3 text-sm py-2">
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
          <div className="text-2xl shrink-0">♔♖</div>
          <div>
            <div className="font-semibold">Castling</div>
            <div className="text-xs text-muted-foreground">King moves 2 squares toward a rook; the rook jumps over. Only if neither has moved and no squares are under attack.</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
          <div className="text-2xl shrink-0">♙♟</div>
          <div>
            <div className="font-semibold">En Passant</div>
            <div className="text-xs text-muted-foreground">If a pawn moves 2 squares forward past an enemy pawn, it can be captured as if it moved 1 square. Must capture immediately!</div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
          <div className="text-2xl shrink-0">♙→♕</div>
          <div>
            <div className="font-semibold">Pawn Promotion</div>
            <div className="text-xs text-muted-foreground">A pawn reaching the opposite end becomes a Queen, Rook, Bishop, or Knight of your choice!</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Check & Checkmate',
    description:
      'When a King is under attack, it\'s in "check" and must escape. If there\'s no way to escape, it\'s "checkmate" and the game is over!',
    tip: 'Three ways to escape check: move the King, block the attack, or capture the attacker.',
    image: (
      <div className="flex justify-center py-4">
        <svg width="200" height="120" viewBox="0 0 200 120" role="img" aria-label="White queen attacking the black king diagonally, showing check">
          {/* Board squares */}
          <rect x="20" y="40" width="40" height="40" fill="#f0d9b5" />
          <rect x="60" y="40" width="40" height="40" fill="#769656" />
          <rect x="100" y="40" width="40" height="40" fill="#f0d9b5" />
          <rect x="140" y="40" width="40" height="40" fill="#769656" />
          <rect x="20" y="80" width="40" height="40" fill="#769656" />
          <rect x="60" y="80" width="40" height="40" fill="#f0d9b5" />
          <rect x="100" y="80" width="40" height="40" fill="#769656" />
          <rect x="140" y="80" width="40" height="40" fill="#f0d9b5" />

          {/* Red glow on king's square */}
          <rect x="140" y="80" width="40" height="40" fill="rgba(239,68,68,0.3)" />

          {/* White queen attacking */}
          <text x="40" y="72" textAnchor="middle" fontSize="28" fill="#fff" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>♕</text>

          {/* Black king in check */}
          <text x="160" y="112" textAnchor="middle" fontSize="28" fill="#1a1a1a">♚</text>

          {/* Attack line */}
          <path d="M55 58 L145 98" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="5,3" />

          {/* CHECK label */}
          <text x="100" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#ef4444">CHECK!</text>
        </svg>
      </div>
    ),
  },
  {
    title: 'Choose Your Challenge',
    description:
      'Start on Easy mode with Bella to learn the basics. When you\'re ready, challenge Coop on Medium or face Bentley on Hard \u2014 he thinks many moves ahead!',
    tip: 'Easy is great for learning. Medium teaches strategy. Hard will really test your skills!',
    image: (
      <div className="flex items-center justify-center gap-4 py-4 text-sm">
        <div className="text-center px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="text-2xl mb-1">🐕</div>
          <div className="font-semibold text-amber-600">Bella</div>
          <div className="text-xs text-gray-500">Easy</div>
        </div>
        <div className="text-center px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
          <div className="text-2xl mb-1">🎮</div>
          <div className="font-semibold text-blue-600">Coop</div>
          <div className="text-xs text-gray-500">Medium</div>
        </div>
        <div className="text-center px-3 py-2 rounded-lg bg-red-50 border border-red-200">
          <div className="text-2xl mb-1">🐺</div>
          <div className="font-semibold text-red-600">Bentley</div>
          <div className="text-xs text-gray-500">Hard</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Ready to Play!',
    description:
      'You\'re all set! Remember: control the center, develop your pieces early, castle to safety, and watch for tactical opportunities. Good luck!',
    tip: 'Press U to undo your last move. Click on any piece to see where it can go!',
  },
]

export function Tutorial({ open, onClose, onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (open) setCurrentStep(0)
  }, [open])

  const step = tutorialSteps[currentStep]
  const isLastStep = currentStep === tutorialSteps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
      onClose()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onComplete()
    onClose()
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {tutorialSteps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step.image && <div className="py-2">{step.image}</div>}

          <p className="text-center text-muted-foreground">{step.description}</p>

          {step.tip && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-sm font-semibold text-amber-900">
                Tip
              </div>
              <p className="text-sm text-amber-800">{step.tip}</p>
            </div>
          )}

          <div className="flex justify-center gap-2 pt-2" aria-hidden="true">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={handleSkip} className="sm:w-auto">
            Skip Tutorial
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>{isLastStep ? "Let's Play!" : 'Next'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
