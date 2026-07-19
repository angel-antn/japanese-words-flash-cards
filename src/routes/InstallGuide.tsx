import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  Share2,
  Smartphone,
  Wifi,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function readBip(): BeforeInstallPromptEvent | null {
  return (
    ((window as Window & { __bipEvent?: Event }).__bipEvent as
      | BeforeInstallPromptEvent
      | undefined) ?? null
  )
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
        {n}
      </span>
      <span className="pt-0.5 text-sm leading-relaxed">{children}</span>
    </li>
  )
}

export default function InstallGuide() {
  const [bip, setBip] = useState<BeforeInstallPromptEvent | null>(() =>
    readBip()
  )
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onBip = () => setBip(readBip())
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMode = () => setInstalled(isStandalone())
    window.addEventListener('bip-available', onBip)
    mq.addEventListener('change', onMode)
    return () => {
      window.removeEventListener('bip-available', onBip)
      mq.removeEventListener('change', onMode)
    }
  }, [])

  const install = async () => {
    if (!bip) return
    await bip.prompt()
    await bip.userChoice
    ;(window as Window & { __bipEvent?: Event }).__bipEvent = undefined
    setBip(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
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
        <h1 className="text-2xl font-bold">Instalar la app</h1>
        <p className="text-muted-foreground text-sm">
          Instálala en tu teléfono para abrirla como una app y usarla sin
          conexión.
        </p>
      </div>

      {installed && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--success)] bg-[var(--success)]/10 p-4">
          <CheckCircle2 className="size-5 text-[var(--success)]" />
          <p className="text-sm font-medium">
            Ya tienes la app instalada. ¡Listo! 🎉
          </p>
        </div>
      )}

      {bip && !installed && (
        <Button size="lg" className="w-full" onClick={install}>
          <Download className="size-4" />
          Instalar ahora
        </Button>
      )}

      {/* Android */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5" />
            Android (Chrome)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            <Step n={1}>
              Abre esta página en <strong>Chrome</strong>.
            </Step>
            <Step n={2}>
              Si aparece el botón <strong>«Instalar ahora»</strong> de arriba,
              tócalo. Si no, abre el menú <strong>⋮</strong> (arriba a la
              derecha).
            </Step>
            <Step n={3}>
              Elige{' '}
              <strong>«Instalar aplicación»</strong> o{' '}
              <strong>«Añadir a la pantalla principal»</strong>.
            </Step>
            <Step n={4}>
              Confirma con <strong>«Instalar»</strong>.
            </Step>
          </ol>
        </CardContent>
      </Card>

      {/* iOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="size-5" />
            iPhone / iPad (Safari)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            <Step n={1}>
              Abre esta página en <strong>Safari</strong> (en iOS solo se puede
              instalar desde Safari).
            </Step>
            <Step n={2}>
              Toca el botón <strong>Compartir</strong>{' '}
              <Share2 className="inline size-4 align-text-bottom" /> (el cuadro
              con una flecha hacia arriba).
            </Step>
            <Step n={3}>
              Desliza y elige{' '}
              <strong>«Añadir a pantalla de inicio»</strong>{' '}
              <Plus className="inline size-4 align-text-bottom" />.
            </Step>
            <Step n={4}>
              Toca <strong>«Añadir»</strong> arriba a la derecha.
            </Step>
          </ol>
        </CardContent>
      </Card>

      <div className="text-muted-foreground flex items-start gap-2 text-xs">
        <Wifi className="mt-0.5 size-4 shrink-0" />
        <p>
          Ábrela una vez <strong>con internet</strong> para descargar las
          palabras; después funciona sin conexión.
        </p>
      </div>
    </div>
  )
}
