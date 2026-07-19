import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Loader2,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react'

import {
  useFlashcards,
  type Orientation,
  type SessionSize,
  type StudyMode,
} from '@/context/FlashcardsContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const SIZE_OPTIONS: { value: SessionSize; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

export default function TopicDetail() {
  const { topicId = '' } = useParams()
  const navigate = useNavigate()
  const {
    getTopicMeta,
    getWords,
    wordsStatusOf,
    ensureWords,
    retryWords,
    isSelected,
    toggleWord,
    selectAll,
    deselectAll,
    getSelectedIds,
    statOf,
    startSession,
  } = useFlashcards()

  const [size, setSize] = useState<SessionSize>('all')
  const [orientation, setOrientation] = useState<Orientation>('jp-meaning')
  const [mode, setMode] = useState<StudyMode>('flashcard')

  useEffect(() => {
    ensureWords(topicId)
  }, [topicId, ensureWords])

  const topic = getTopicMeta(topicId)
  const words = getWords(topicId)
  const status = wordsStatusOf(topicId)

  const BackButton = (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit text-muted-foreground"
    >
      <Link to="/">
        <ArrowLeft className="size-4" />
        Temas
      </Link>
    </Button>
  )

  if (!topic) {
    return (
      <div className="flex flex-col items-start gap-4">
        {BackButton}
        <p>Tema no encontrado.</p>
      </div>
    )
  }

  // No words yet: show loading or error state.
  if (words.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {BackButton}
        <h1 className="text-2xl font-bold">{topic.name}</h1>
        {status === 'error' ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="text-destructive size-8" />
            <p className="text-muted-foreground text-sm">
              No se pudieron cargar las palabras. Revisa tu conexión.
            </p>
            <Button variant="outline" onClick={() => retryWords(topicId)}>
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

  const selectedCount = getSelectedIds(topic.id).length

  const handlePlay = () => {
    startSession({ topicId: topic.id, size, orientation, mode })
    navigate('/session')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {BackButton}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{topic.name}</h1>
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
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Dirección</span>
            <ToggleGroup
              type="single"
              value={orientation}
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
        </CardContent>
      </Card>

      {/* Selection controls */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-sm">
          {selectedCount} de {words.length} seleccionadas
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectAll(topic.id)}
          >
            <CheckSquare className="size-4" />
            Todas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deselectAll(topic.id)}
          >
            <Square className="size-4" />
            Ninguna
          </Button>
        </div>
      </div>

      {/* Word list */}
      <ul className="flex flex-col gap-1.5">
        {words.map((word) => {
          const checked = isSelected(topic.id, word.id)
          const stat = statOf(topic.id, word.id)
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
                  onCheckedChange={() => toggleWord(topic.id, word.id)}
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
                {stat.seen > 0 && (
                  <Badge
                    variant={rate >= 40 ? 'destructive' : 'secondary'}
                    title={`${stat.wrong} fallos de ${stat.seen} veces`}
                  >
                    {stat.wrong}/{stat.seen}
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
