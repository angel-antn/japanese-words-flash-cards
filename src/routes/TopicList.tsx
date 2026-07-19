import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronRight, Loader2, RotateCcw, Trash2 } from 'lucide-react'

import { useFlashcards } from '@/context/FlashcardsContext'
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

export default function TopicList() {
  const {
    topics,
    topicsLoading,
    reloadTopics,
    getWords,
    getSelectedIds,
    clearLocalData,
  } = useFlashcards()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Elige un tema</h1>
          <p className="text-muted-foreground text-sm">
            Selecciona un tema para empezar a practicar.
          </p>
        </div>
        {topicsLoading && (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        )}
      </div>

      {!topicsLoading && topics.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="text-destructive size-8" />
          <p className="text-muted-foreground text-sm">
            No se pudieron cargar los temas. Revisa tu conexión e inténtalo de
            nuevo.
          </p>
          <Button variant="outline" onClick={() => reloadTopics()}>
            <RotateCcw className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {topics.map((topic) => {
          const count = getWords(topic.id).length
          const selected = getSelectedIds(topic.id).length
          return (
            <Link key={topic.id} to={`/topic/${topic.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{topic.name}</CardTitle>
                    <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  {count > 0 && (
                    <Badge variant="secondary">{count} palabras</Badge>
                  )}
                  {selected > 0 && (
                    <Badge variant="outline">{selected} seleccionadas</Badge>
                  )}
                </CardContent>
              </Card>
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
