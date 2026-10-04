import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Flame, Trash2 } from 'lucide-react'

import { useFlashcards } from '@/context/FlashcardsContext'
import type { Word } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const DAY = 86_400_000
const dateKey = (d: Date) => d.toISOString().slice(0, 10)
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Sequential ramp, one hue light→dark: new → learning → reviewing → mastered.
const STAGES = [
  { key: 'new', label: 'Nuevas', cls: 'bg-indigo-200 dark:bg-indigo-900' },
  { key: 'learning', label: 'Aprendiendo', cls: 'bg-indigo-400 dark:bg-indigo-700' },
  { key: 'reviewing', label: 'Repasando', cls: 'bg-indigo-600 dark:bg-indigo-500' },
  { key: 'mastered', label: 'Dominadas', cls: 'bg-indigo-900 dark:bg-indigo-300' },
] as const
type Stage = (typeof STAGES)[number]['key']

export default function Progress() {
  const { levels, getWords, statOf, days, streak, sessions, clearLocalData } =
    useFlashcards()
  const [open, setOpen] = useState(false)
  // Frozen at mount so render stays pure (React Compiler rule).
  const [now] = useState(() => Date.now())

  // --- Activity: last 8 weeks, Monday-first columns.
  const today = new Date(now)
  const weekday = (today.getDay() + 6) % 7 // Mon = 0
  const start = new Date(today.getTime() - (7 * 7 + weekday) * DAY)
  const cells = Array.from({ length: 56 }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY)
    return { key: dateKey(d), future: d > today }
  })
  const daySet = new Set(days)
  const activeDays = cells.filter((c) => daySet.has(c.key)).length

  // --- Sessions: last 7 days.
  const weekAgo = now - 7 * DAY
  const recent = sessions.filter((s) => s.at >= weekAgo)
  const recentAnswers = recent.reduce((n, s) => n + s.correct + s.wrong, 0)
  const recentCorrect = recent.reduce((n, s) => n + s.correct, 0)
  const accuracy =
    recentAnswers > 0 ? Math.round((recentCorrect / recentAnswers) * 100) : null

  const levelsWithWords = levels.filter((l) => getWords(l.id).length > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Niveles
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Tu progreso</h1>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Racha" value={`${streak}`} unit={streak === 1 ? 'día' : 'días'} icon={<Flame className="size-4 text-orange-500" />} />
        <Stat label="Sesiones · 7 días" value={`${recent.length}`} />
        <Stat label="Aciertos · 7 días" value={accuracy === null ? '—' : `${accuracy}`} unit={accuracy === null ? '' : '%'} />
      </div>

      {/* Activity calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Actividad
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              {activeDays} de 56 días
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="grid w-fit grid-flow-col grid-rows-7 gap-1"
            role="img"
            aria-label={`Practicaste ${activeDays} de los últimos 56 días`}
          >
            {cells.map((c) => (
              <div
                key={c.key}
                title={c.key}
                className={cn(
                  'size-3.5 rounded-sm sm:size-4',
                  c.future ? 'bg-transparent' : daySet.has(c.key) ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {levelsWithWords.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Abre un nivel y juega una sesión para ver tu progreso por palabras.
        </p>
      )}

      {levelsWithWords.map((level) => {
        const words = getWords(level.id)
        const stageOf = (w: Word): Stage => {
          const st = statOf(level.id, w.id)
          if (st.seen === 0) return 'new'
          const box = st.box ?? 0
          return box >= 3 ? 'mastered' : box === 2 ? 'reviewing' : 'learning'
        }
        const counts = Object.fromEntries(STAGES.map((s) => [s.key, 0])) as Record<Stage, number>
        for (const w of words) counts[stageOf(w)]++

        // Weakest categories: fail rate with at least 3 answers.
        const byCat = new Map<string, { seen: number; wrong: number }>()
        for (const w of words) {
          const st = statOf(level.id, w.id)
          const c = byCat.get(w.category) ?? { seen: 0, wrong: 0 }
          c.seen += st.seen
          c.wrong += st.wrong
          byCat.set(w.category, c)
        }
        const weakest = [...byCat.entries()]
          .filter(([, c]) => c.seen >= 3 && c.wrong > 0)
          .map(([cat, c]) => ({ cat, rate: c.wrong / c.seen, ...c }))
          .sort((a, b) => b.rate - a.rate)
          .slice(0, 4)

        return (
          <Card key={level.id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link to={`/level/${level.id}`} className="hover:underline">
                  {level.name}
                </Link>
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {counts.mastered} de {words.length} dominadas
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Stacked bar */}
              <div>
                <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={STAGES.map((s) => `${s.label}: ${counts[s.key]}`).join(', ')}>
                  {STAGES.map((s) =>
                    counts[s.key] > 0 ? (
                      <div
                        key={s.key}
                        className={s.cls}
                        style={{ width: `${(counts[s.key] / words.length) * 100}%` }}
                        title={`${s.label}: ${counts[s.key]}`}
                      />
                    ) : null
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {STAGES.map((s) => (
                    <li key={s.key} className="flex items-center gap-1.5">
                      <span className={cn('size-2.5 rounded-sm', s.cls)} />
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="tabular-nums">{counts[s.key]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weakest categories */}
              {weakest.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Donde más fallas</h3>
                  <ul className="flex flex-col gap-2">
                    {weakest.map((w) => (
                      <li key={w.cat}>
                        <Link
                          to={`/level/${level.id}?cat=${encodeURIComponent(w.cat)}`}
                          className="group flex items-center gap-3 text-sm"
                          title={`${w.wrong} fallos de ${w.seen} respuestas`}
                        >
                          <span className="w-36 shrink-0 truncate group-hover:underline">{cap(w.cat)}</span>
                          <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <span
                              className="bg-destructive block h-full rounded-full"
                              style={{ width: `${Math.round(w.rate * 100)}%` }}
                            />
                          </span>
                          <span className="w-10 text-right tabular-nums">{Math.round(w.rate * 100)}%</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <div className="border-t pt-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-destructive">
              <Trash2 className="size-4" />
              Borrar datos locales
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Borrar datos locales?</DialogTitle>
              <DialogDescription>
                Se eliminarán tu selección de palabras, las estadísticas, la
                racha y el historial de sesiones guardados en este navegador.
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  clearLocalData()
                  setOpen(false)
                }}
              >
                Borrar todo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-muted-foreground mt-2 text-xs">
          Borra tu selección, estadísticas, racha e historial de sesiones de
          este navegador.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, unit, icon }: { label: string; value: string; unit?: string; icon?: React.ReactNode }) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-1 px-4">
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          {icon}
          {label}
        </span>
        <span className="text-2xl font-bold tabular-nums">
          {value}
          {unit && <span className="text-muted-foreground ml-1 text-sm font-normal">{unit}</span>}
        </span>
      </CardContent>
    </Card>
  )
}
