import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  Loader2,
  Play,
  Search,
  Flame,
  CalendarCheck,
  Volume2,
  SlidersHorizontal,
  RotateCcw,
  Square,
} from 'lucide-react'

import {
  useFlashcards,
  type Orientation,
  type SessionSize,
  type StudyMode,
} from '@/context/FlashcardsContext'
import type { Word } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { categoryColor } from '@/lib/categories'
import { isDue } from '@/lib/srs'
import { canSpeak, speak } from '@/lib/speech'
import { cn } from '@/lib/utils'

const CHIP =
  'h-8 rounded-full border px-3 text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const SIZE_OPTIONS: { value: SessionSize; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

export default function LevelDetail() {
  const { levelId = '' } = useParams()
  const navigate = useNavigate()
  const {
    getLevelMeta,
    getWords,
    wordsStatusOf,
    ensureWords,
    retryWords,
    isSelected,
    getSelectedIds,
    toggleWord,
    selectAll,
    deselectAll,
    statOf,
    startSession,
  } = useFlashcards()

  const [size, setSize] = useState<SessionSize>('all')
  const [orientation, setOrientation] = useState<Orientation>('jp-meaning')
  const [mode, setMode] = useState<StudyMode>('flashcard')
  const [categories, setCategories] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'default' | 'failed' | 'unseen' | 'az'>(
    'default'
  )

  useEffect(() => {
    ensureWords(levelId)
  }, [levelId, ensureWords])

  const level = getLevelMeta(levelId)
  const words = getWords(levelId)
  const status = wordsStatusOf(levelId)

  // Categories in order of first appearance; index picks the chip color.
  const allCategories = useMemo(
    () => [...new Set(words.map((w) => w.category))],
    [words]
  )
  const colorOf = (cat: string) => categoryColor(allCategories.indexOf(cat))
  const visible = useMemo(() => {
    const q = norm(query.trim())
    const list = words.filter(
      (w) =>
        (categories.length === 0 || categories.includes(w.category)) &&
        (!q ||
          norm(w.word).includes(q) ||
          norm(w.meaning).includes(q) ||
          (w.kanji ?? '').includes(q))
    )
    const rate = (w: Word) => {
      const st = statOf(levelId, w.id)
      return st.seen ? st.wrong / st.seen : -1
    }
    if (sort === 'failed') list.sort((a, b) => rate(b) - rate(a))
    else if (sort === 'unseen')
      list.sort(
        (a, b) => statOf(levelId, a.id).seen - statOf(levelId, b.id).seen
      )
    else if (sort === 'az')
      list.sort((a, b) => a.word.localeCompare(b.word, 'ja'))
    return list
  }, [words, categories, query, sort, statOf, levelId])

  const BackButton = (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
    >
      <Link to="/">
        <ArrowLeft className="size-4" />
        Niveles
      </Link>
    </Button>
  )

  if (!level) {
    return (
      <div className="flex flex-col items-start gap-4">
        {BackButton}
        <p>Nivel no encontrado.</p>
      </div>
    )
  }

  // No words yet: show loading or error state.
  if (words.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {BackButton}
        <h1 className="text-2xl font-bold">{level.name}</h1>
        {status === 'error' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="text-destructive size-8" />
            <p className="text-muted-foreground text-sm">
              No se pudieron cargar las palabras. Revisa tu conexión.
            </p>
            <Button variant="outline" onClick={() => retryWords(levelId)}>
              <RotateCcw className="size-4" />
              Reintentar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground text-sm">Cargando palabras…</p>
          </div>
        )}
      </div>
    )
  }

  // Session plays everything selected; the list header counts only what's visible.
  const selectedCount = getSelectedIds(level.id).length
  const visibleSelected = visible.filter((w) => isSelected(level.id, w.id)).length
  const visibleIds = visible.map((w) => w.id)

  const handlePlay = () => {
    startSession({ levelId: level.id, size, orientation, mode })
    navigate('/session')
  }

  // Words failed at least once; ignores selection so weak spots never hide.
  const failedIds = words
    .filter((w) => statOf(level.id, w.id).wrong > 0)
    .map((w) => w.id)
  // Selected words whose Leitner review is due (never-seen words count as due).
  const dueIds = words
    .filter((w) => isSelected(level.id, w.id) && isDue(statOf(level.id, w.id)))
    .map((w) => w.id)
  const handlePlayDue = () => {
    startSession({
      levelId: level.id,
      size: 'all',
      orientation,
      mode,
      wordIds: dueIds,
    })
    navigate('/session')
  }
  const handlePlayFailed = () => {
    startSession({
      levelId: level.id,
      size: 'all',
      orientation,
      mode,
      wordIds: failedIds,
    })
    navigate('/session')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {BackButton}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{level.name}</h1>
          {status === 'loading' && (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          )}
        </div>
      </div>

      {/* Session config */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Modo</span>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as StudyMode)}
            >
              <ToggleGroupItem value="flashcard">Flashcard</ToggleGroupItem>
              <ToggleGroupItem value="choice">Selección simple</ToggleGroupItem>
              <ToggleGroupItem value="typing">Escritura</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Dirección</span>
            <ToggleGroup
              type="single"
              // Typing only makes sense from meaning to Japanese.
              value={mode === 'typing' ? 'meaning-jp' : orientation}
              disabled={mode === 'typing'}
              onValueChange={(v) => v && setOrientation(v as Orientation)}
            >
              <ToggleGroupItem value="jp-meaning">
                日本語 → Significado
              </ToggleGroupItem>
              <ToggleGroupItem value="meaning-jp">
                Significado → 日本語
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Tarjetas por sesión</span>
            <ToggleGroup
              type="single"
              value={String(size)}
              onValueChange={(v) =>
                v && setSize(v === 'all' ? 'all' : (Number(v) as SessionSize))
              }
            >
              {SIZE_OPTIONS.map((opt) => (
                <ToggleGroupItem
                  key={String(opt.value)}
                  value={String(opt.value)}
                  disabled={
                    typeof opt.value === 'number' && opt.value > selectedCount
                  }
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={selectedCount === 0}
            onClick={handlePlay}
          >
            <Play className="size-4" />
            Jugar ({selectedCount} seleccionadas)
          </Button>
          {dueIds.length > 0 && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={handlePlayDue}
            >
              <CalendarCheck className="size-4" />
              Repaso del día ({dueIds.length})
            </Button>
          )}
          {failedIds.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handlePlayFailed}
            >
              <Flame className="size-4" />
              Practicar las que fallo ({failedIds.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <details className="group bg-card text-card-foreground rounded-xl border shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4" />
          Filtro
          {(categories.length > 0 || query.trim()) && (
            <Badge variant="secondary">
              {visible.length} de {words.length}
            </Badge>
          )}
          <ChevronDown className="text-muted-foreground ml-auto size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por kana, kanji o significado…"
              aria-label="Buscar palabra"
              className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Ordenar"
            className="border-input bg-background focus-visible:ring-ring/50 h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
          >
            <option value="default">Orden original</option>
            <option value="failed">Más falladas</option>
            <option value="unseen">No vistas primero</option>
            <option value="az">あ → ん</option>
          </select>
          </div>
        <div
          role="group"
          aria-label="Filtrar por categoría"
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            aria-pressed={categories.length === 0}
            onClick={() => setCategories([])}
            className={cn(
              CHIP,
              categories.length === 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            Todas
          </button>
          {allCategories.map((cat) => {
            const on = categories.includes(cat)
            return (
              <button
                key={cat}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setCategories((c) =>
                    on ? c.filter((x) => x !== cat) : [...c, cat]
                  )
                }
                className={cn(
                  CHIP,
                  colorOf(cat),
                  on ? 'ring-2 ring-foreground/60' : 'opacity-50 hover:opacity-80'
                )}
              >
                {cap(cat)}
              </button>
            )
          })}
        </div>
        </div>
      </details>

      {/* Selection controls */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          {visibleSelected} de {visible.length} seleccionadas
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectAll(level.id, visibleIds)}
          >
            <CheckSquare className="size-4" />
            Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deselectAll(level.id, visibleIds)}
          >
            <Square className="size-4" />
            Ninguna
          </Button>
        </div>
      </div>

      {/* Word list */}
      <ul className="flex flex-col gap-1.5">
        {visible.map((word) => {
          const checked = isSelected(level.id, word.id)
          const stat = statOf(level.id, word.id)
          const rate =
            stat.seen > 0 ? Math.round((stat.wrong / stat.seen) * 100) : 0
          return (
            <li key={word.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                  checked ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleWord(level.id, word.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-medium">{word.word}</span>
                    {word.kanji && (
                      <span className="text-muted-foreground text-sm">
                        {word.kanji}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {word.meaning}
                  </p>
                </div>
                {canSpeak && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-8"
                    aria-label={`Escuchar ${word.word}`}
                    onClick={(e) => {
                      e.preventDefault() // don't toggle the checkbox
                      speak(word.word)
                    }}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                )}
                <Badge
                  className={colorOf(word.category)}
                  variant="outline"
                >
                  {cap(word.category)}
                </Badge>
                {stat.seen > 0 && (
                  <Badge
                    variant={rate >= 40 ? 'destructive' : 'secondary'}
                    title={`${stat.wrong} fallos de ${stat.seen} veces · caja ${stat.box ?? 0}`}
                  >
                    {stat.wrong}/{stat.seen}
                    <span aria-hidden className="ml-1 tracking-tighter opacity-70">
                      {'●'.repeat(stat.box ?? 0)}
                      {'○'.repeat(4 - (stat.box ?? 0))}
                    </span>
                  </Badge>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
