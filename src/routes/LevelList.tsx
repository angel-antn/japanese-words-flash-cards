import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronRight, Loader2, RotateCcw, Trash2 } from 'lucide-react'

import { useFlashcards } from '@/context/FlashcardsContext'
import { isDue } from '@/lib/srs'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export default function LevelList() {
  const {
    levels,
    levelsLoading,
    reloadLevels,
    getWords,
    getSelectedIds,
    statOf,
    clearLocalData,
  } = useFlashcards()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Elige un nivel</h1>
          <p className="text-muted-foreground text-sm">
            Selecciona tu nivel JLPT para empezar a practicar.
          </p>
        </div>
        {levelsLoading && (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        )}
      </div>

      {!levelsLoading && levels.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">
            No se pudieron cargar los niveles. Revisa tu conexión e inténtalo de
            nuevo.
          </p>
          <Button variant="outline" onClick={() => reloadLevels()}>
            <RotateCcw className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {levels.map((level) => {
            const count = getWords(level.id).length
            const selectedIds = getSelectedIds(level.id)
            const selected = selectedIds.length
            const due = selectedIds.filter((id) =>
              isDue(statOf(level.id, id))
            ).length
            const soon = !level.url
            const card = (
              <Card
                className={`h-full transition-colors ${
                  soon ? 'opacity-60' : 'group-hover:border-primary'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{level.name}</CardTitle>
                    {soon ? (
                      <Badge variant="outline">Próximamente</Badge>
                    ) : (
                      <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                  <CardDescription>{level.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  {count > 0 && (
                    <Badge variant="secondary">{count} palabras</Badge>
                  )}
                  {selected > 0 && (
                    <Badge variant="outline">{selected} seleccionadas</Badge>
                  )}
                  {due > 0 && <Badge>{due} para repasar</Badge>}
                </CardContent>
              </Card>
            )
            return soon ? (
              <div key={level.id} aria-disabled>
                {card}
              </div>
            ) : (
              <Link key={level.id} to={`/level/${level.id}`} className="group">
                {card}
              </Link>
            )
          })}
        </div>
      )}

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
                Se eliminarán tu selección de palabras y todas las
                estadísticas de aciertos y fallos guardadas en este navegador.
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
          Borra tu selección de palabras y las estadísticas de aciertos y
          fallos guardadas en este navegador.
        </p>
      </div>
    </div>
  )
}
