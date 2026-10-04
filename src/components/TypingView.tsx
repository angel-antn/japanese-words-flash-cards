import { useState } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'

import type { Word } from '@/data/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Katakana → hiragana (fixed code-point offset), drop spaces. */
function normalizeKana(s: string) {
  return s
    .trim()
    .replace(/[ァ-ヶ]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    )
    .replace(/[\s\u3000]/g, '')
}

export default function TypingView({
  word,
  onAnswer,
}: {
  word: Word
  onAnswer: (correct: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<boolean | null>(null)

  const check = () => {
    if (result !== null || !value.trim()) return
    const typed = normalizeKana(value)
    const ok =
      typed === normalizeKana(word.word) ||
      (!!word.kanji && typed === normalizeKana(word.kanji))
    setResult(ok)
    if (ok) window.setTimeout(() => onAnswer(true), 700)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-card text-card-foreground flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border p-6 text-center">
        <span className="text-2xl font-semibold sm:text-3xl">{word.meaning}</span>
      </div>

      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <input
          autoFocus
          lang="ja"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          disabled={result !== null}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escribe en kana…"
          aria-label="Respuesta en japonés"
          className={cn(
            'border-input bg-background h-14 w-full rounded-lg border px-4 text-center text-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            result === true && 'border-[var(--success)] bg-[var(--success)]/10',
            result === false && 'border-destructive bg-destructive/10'
          )}
        />
        {result === null && (
          <Button type="submit" size="lg" disabled={!value.trim()}>
            <Check className="size-4" />
            Comprobar
          </Button>
        )}
      </form>

      {result === false && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
              <X className="text-destructive size-4" />
              La respuesta correcta era
            </p>
            <p className="text-3xl font-bold">{word.word}</p>
            {word.kanji && (
              <p className="text-muted-foreground text-lg">{word.kanji}</p>
            )}
          </div>
          <Button size="lg" className="w-full max-w-xs" onClick={() => onAnswer(false)}>
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
