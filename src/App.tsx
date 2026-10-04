import { Link, Route, Routes } from 'react-router-dom'
import { Download, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import LevelList from '@/routes/LevelList'
import LevelDetail from '@/routes/LevelDetail'
import Session from '@/routes/Session'
import InstallGuide from '@/routes/InstallGuide'

function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            Japan Flashcards
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/install">
              <Download className="size-4" />
              <span className="hidden sm:inline">Instalar</span>
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <Routes>
          <Route path="/" element={<LevelList />} />
          <Route path="/level/:levelId" element={<LevelDetail />} />
          <Route path="/session" element={<Session />} />
          <Route path="/install" element={<InstallGuide />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
