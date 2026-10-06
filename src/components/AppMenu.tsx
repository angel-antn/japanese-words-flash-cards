import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  Download,
  Menu,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { clearCache } from '@/data/remote'
import { Button } from '@/components/ui/button'
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

const row =
  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none'
const tile = 'grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4'
const label = 'flex min-w-0 flex-1 flex-col'
const title = 'text-sm font-medium'
const hint = 'text-muted-foreground text-xs'
const chevron =
  'text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100'

export default function AppMenu() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const close = () => setOpen(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 top-0 right-0 left-auto flex h-full w-80 max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 duration-300 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 [&>button]:text-primary-foreground [&>button]:opacity-80">
        <div className="bg-primary text-primary-foreground px-5 pt-5 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base text-primary-foreground">
                Japan Flashcards
              </DialogTitle>
              <DialogDescription className="text-primary-foreground/75 text-xs">
                Vocabulario JLPT, a tu ritmo
              </DialogDescription>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <Link to="/progress" className={row} onClick={close}>
            <span className={`${tile} bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`}>
              <BarChart3 />
            </span>
            <span className={label}>
              <span className={title}>Tu progreso</span>
              <span className={hint}>Racha, sesiones y palabras dominadas</span>
            </span>
            <ChevronRight className={chevron} />
          </Link>

          <Link to="/install" className={row} onClick={close}>
            <span className={`${tile} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}>
              <Download />
            </span>
            <span className={label}>
              <span className={title}>Descargar</span>
              <span className={hint}>Instala la app en tu móvil</span>
            </span>
            <ChevronRight className={chevron} />
          </Link>

          <div className="bg-border/60 mx-3 my-1 h-px" />

          <button type="button" className={row} onClick={() => setConfirm(true)}>
            <span className={`${tile} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300`}>
              <RefreshCw />
            </span>
            <span className={label}>
              <span className={title}>Limpiar caché</span>
              <span className={hint}>Vuelve a descargar niveles y palabras</span>
            </span>
          </button>
        </nav>

        <p className="text-muted-foreground mt-auto border-t px-5 py-4 text-xs">
          Tu progreso se guarda en este navegador y no se borra al limpiar la
          caché.
        </p>

        <Dialog open={confirm} onOpenChange={setConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Limpiar caché?</DialogTitle>
              <DialogDescription>
                Se volverán a descargar los niveles y las palabras. Tu
                progreso, racha y estadísticas no se tocan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                onClick={() => {
                  clearCache()
                  location.reload()
                }}
              >
                Limpiar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
