import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'

import type { Word } from '@/data/types'
import type { Orientation } from '@/context/FlashcardsContext'
import { cn } from '@/lib/utils'

// Deterministic PRNG so the options stay stable across re-renders.
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rnd = mulberry32(seed)
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Option = { key: number; label: string; correct: boolean }

export default function ChoiceView({
  word,
  allWords,
  orientation,
  onAnswer,
}: {
  word: Word
  allWords: Word[]
  orientation: Orientation
  onAnswer: (correct: boolean) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const isJpQuestion = orientation === 'jp-meaning'
  const labelOf = (w: Word) => (isJpQuestion ? w.meaning : w.word)

  const options = useMemo<Option[]>(() => {
    const distractors = seededShuffle(
      allWords.filter(
        (w) => w.id !== word.id && labelOf(w) !== labelOf(word)
      ),
      word.id
    ).slice(0, 3)
    const pool: Option[] = [
      { key: word.id, label: labelOf(word), correct: true },
      ...distractors.map((w) => ({
        key: w.id,
        label: labelOf(w),
        correct: false,
      })),
    ]
    return seededShuffle(pool, word.id + 7)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id, orientation])

  const handlePick = (opt: Option) => {
    if (picked !== null) return
    setPicked(opt.key)
    window.setTimeout(() => onAnswer(opt.correct), 850)
  }

  // Keys 1-4 pick an option.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (i >= 0 && i < options.length) handlePick(options[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-card text-card-foreground flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center">
        {isJpQuestion ? (
          <>
            <span className="text-4xl font-bold sm:text-5xl">{word.word}</span>
            {word.kanji && (
              <span className="text-muted-foreground text-xl">
                {word.kanji}
              </span>
            )}
          </>
        ) : (
          <span className="text-2xl font-semibold sm:text-3xl">
            {word.meaning}
          </span>
        )}
      </div>

      <div className="grid w-full gap-3">
        {options.map((opt) => {
          const isPicked = picked === opt.key
          const revealed = picked !== null
          const showCorrect = revealed && opt.correct
          const showWrong = revealed && isPicked && !opt.correct
          return (
            <button
              key={opt.key}
              type="button"
              disabled={revealed}
              onClick={() => handlePick(opt)}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border p-4 text-left text-base transition-colors',
                'hover:bg-accent disabled:cursor-default',
                showCorrect &&
                  'border-[var(--success)] bg-[var(--success)]/10 text-foreground',
                showWrong && 'border-destructive bg-destructive/10',
                revealed && !showCorrect && !showWrong && 'opacity-60'
              )}
            >
              <span>
                <kbd className="text-muted-foreground mr-2 hidden text-xs sm:inline">
                  {options.indexOf(opt) + 1}
                </kbd>
                {opt.label}
              </span>
              {showCorrect && (
                <Check className="size-5 text-[var(--success)]" />
              )}
              {showWrong && <X className="text-destructive size-5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
