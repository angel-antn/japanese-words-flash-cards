import { Flashcard, useFlashcard } from 'react-quizlet-flashcard'
import { Check, RotateCw, X } from 'lucide-react'

import type { Word } from '@/data/types'
import type { Orientation } from '@/context/FlashcardsContext'
import { Button } from '@/components/ui/button'

function JapaneseFace({ word }: { word: Word }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="text-4xl font-bold sm:text-5xl">{word.word}</span>
      {word.kanji && (
        <span className="text-muted-foreground text-xl">{word.kanji}</span>
      )}
    </div>
  )
}

function MeaningFace({ word }: { word: Word }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="text-2xl font-semibold sm:text-3xl">{word.meaning}</span>
    </div>
  )
}

export default function FlashcardView({
  word,
  orientation,
  onAnswer,
}: {
  word: Word
  orientation: Orientation
  onAnswer: (correct: boolean) => void
}) {
  const flip = useFlashcard({})
  const isJpFront = orientation === 'jp-meaning'
  const frontFace = isJpFront ? (
    <JapaneseFace word={word} />
  ) : (
    <MeaningFace word={word} />
  )
  const backFace = isJpFront ? (
    <MeaningFace word={word} />
  ) : (
    <JapaneseFace word={word} />
  )

  const revealed = flip.state === 'back'

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full">
        <Flashcard
          flipHook={flip}
          className="!w-full"
          style={{ width: '100%', height: '16rem' }}
          front={{
            html: (
              <div className="bg-card text-card-foreground flex h-full w-full items-center justify-center rounded-xl border">
                {frontFace}
              </div>
            ),
          }}
          back={{
            html: (
              <div className="bg-card text-card-foreground flex h-full w-full items-center justify-center rounded-xl border">
                {backFace}
              </div>
            ),
          }}
        />
      </div>

      {!revealed ? (
        <Button
          variant="secondary"
          size="lg"
          className="w-full max-w-xs"
          onClick={() => flip.flip()}
        >
          <RotateCw className="size-4" />
          Voltear
        </Button>
      ) : (
        <div className="flex w-full max-w-md gap-3">
          <Button
            size="lg"
            variant="destructive"
            className="flex-1"
            onClick={() => onAnswer(false)}
          >
            <X className="size-4" />
            Fallé
          </Button>
          <Button
            size="lg"
            className="flex-1 bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
            onClick={() => onAnswer(true)}
          >
            <Check className="size-4" />
            Acerté
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        Toca la tarjeta o pulsa «Voltear» para ver la respuesta.
      </p>
    </div>
  )
}
