import { Navigate, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { useFlashcards } from '@/context/FlashcardsContext'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import FlashcardView from '@/components/FlashcardView'
import ChoiceView from '@/components/ChoiceView'
import SessionSummary from '@/components/SessionSummary'

export default function Session() {
  const { session, getTopicMeta, getWords, recordAnswer, restartSession, endSession } =
    useFlashcards()
  const navigate = useNavigate()

  if (!session) return <Navigate to="/" replace />

  const topic = getTopicMeta(session.topicId)
  const words = getWords(session.topicId)
  if (!topic || words.length === 0) return <Navigate to="/" replace />

  const exit = () => {
    endSession()
    navigate(`/topic/${session.topicId}`)
  }

  if (session.finished) {
    return (
      <SessionSummary
        session={session}
        words={words}
        onRestart={restartSession}
        onExit={exit}
      />
    )
  }

  const wordId = session.queue[session.index]
  const word = words.find((w) => w.id === wordId)
  if (!word) return <Navigate to="/" replace />

  const total = session.queue.length
  const current = session.index + 1
  const progress = (session.index / total) * 100

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={progress} />
        </div>
        <span className="text-muted-foreground text-sm tabular-nums">
          {current}/{total}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={exit}
          aria-label="Salir de la sesión"
        >
          <X className="size-4" />
        </Button>
      </div>

      {session.mode === 'flashcard' ? (
        <FlashcardView
          key={session.index}
          word={word}
          orientation={session.orientation}
          onAnswer={recordAnswer}
        />
      ) : (
        <ChoiceView
          key={session.index}
          word={word}
          allWords={words}
          orientation={session.orientation}
          onAnswer={recordAnswer}
        />
      )}
    </div>
  )
}
