import { RotateCcw, Home } from 'lucide-react'

import type { Word } from '@/data/types'
import type { Session } from '@/context/FlashcardsContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SessionSummary({
  session,
  words,
  onRestart,
  onExit,
}: {
  session: Session
  words: Word[]
  onRestart: () => void
  onExit: () => void
}) {
  const total = session.correct + session.wrong
  const pct = total > 0 ? Math.round((session.correct / total) * 100) : 0
  const wrongWords = session.wrongIds
    .map((id) => words.find((w) => w.id === id))
    .filter((w): w is Word => Boolean(w))

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">¡Sesión completada!</h1>
        <p className="text-muted-foreground text-sm">
          Acertaste {session.correct} de {total} ({pct}%).
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-2">
            <span className="text-3xl font-bold text-[var(--success)]">
              {session.correct}
            </span>
            <span className="text-muted-foreground text-sm">Aciertos</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-2">
            <span className="text-destructive text-3xl font-bold">
              {session.wrong}
            </span>
            <span className="text-muted-foreground text-sm">Fallos</span>
          </CardContent>
        </Card>
      </div>

      {wrongWords.length > 0 && (
        <div className="w-full">
          <h2 className="mb-2 text-sm font-medium">Palabras para repasar</h2>
          <ul className="flex flex-col gap-1.5">
            {wrongWords.map((w) => (
              <li
                key={w.id}
                className="flex items-baseline justify-between gap-3 rounded-lg border p-3"
              >
                <span className="font-medium">
                  {w.word}
                  {w.kanji && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      {w.kanji}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-sm">
                  {w.meaning}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex w-full max-w-md gap-3">
        <Button variant="outline" className="flex-1" onClick={onExit}>
          <Home className="size-4" />
          Volver
        </Button>
        <Button className="flex-1" onClick={onRestart}>
          <RotateCcw className="size-4" />
          Repetir
        </Button>
      </div>
    </div>
  )
}
