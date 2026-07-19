import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { TopicMeta, Word } from '@/data/types'
import {
  loadTopics,
  loadWords,
  readCachedTopics,
  readCachedWords,
} from '@/data/remote'

export type Orientation = 'jp-meaning' | 'meaning-jp'
export type StudyMode = 'flashcard' | 'choice'
export type SessionSize = number | 'all'
export type WordsStatus = 'idle' | 'loading' | 'error' | 'ready'

export type WordStat = { seen: number; wrong: number }
type Stats = Record<string, WordStat>
type Selection = Record<string, number[]>

export type Session = {
  topicId: string
  mode: StudyMode
  orientation: Orientation
  queue: number[]
  index: number
  correct: number
  wrong: number
  wrongIds: number[]
  finished: boolean
}

export type StartSessionOptions = {
  topicId: string
  size: SessionSize
  orientation: Orientation
  mode: StudyMode
}

const STATS_KEY = 'jf.stats'
const SELECTION_KEY = 'jf.selection'

function statKey(topicId: string, wordId: number) {
  return `${topicId}:${wordId}`
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type FlashcardsContextValue = {
  // topics / words (remote)
  topics: TopicMeta[]
  topicsLoading: boolean
  reloadTopics: () => void
  getTopicMeta: (topicId: string) => TopicMeta | undefined
  getWords: (topicId: string) => Word[]
  wordsStatusOf: (topicId: string) => WordsStatus
  ensureWords: (topicId: string) => void
  retryWords: (topicId: string) => void
  // selection
  isSelected: (topicId: string, wordId: number) => boolean
  getSelectedIds: (topicId: string) => number[]
  toggleWord: (topicId: string, wordId: number) => void
  selectAll: (topicId: string) => void
  deselectAll: (topicId: string) => void
  // stats
  statOf: (topicId: string, wordId: number) => WordStat
  // session
  session: Session | null
  startSession: (opts: StartSessionOptions) => void
  recordAnswer: (correct: boolean) => void
  restartSession: () => void
  endSession: () => void
  // data
  clearLocalData: () => void
}

const FlashcardsContext = createContext<FlashcardsContextValue | null>(null)

const EMPTY_STAT: WordStat = { seen: 0, wrong: 0 }

export function FlashcardsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(() => loadJSON(STATS_KEY, {}))
  const [selection, setSelection] = useState<Selection>(() =>
    loadJSON(SELECTION_KEY, {})
  )
  const [session, setSession] = useState<Session | null>(null)
  const [lastOptions, setLastOptions] = useState<StartSessionOptions | null>(
    null
  )

  const [topics, setTopics] = useState<TopicMeta[]>(
    () => readCachedTopics() ?? []
  )
  const [topicsLoading, setTopicsLoading] = useState(true)
  // Prime word lists from cache so counts render instantly offline; each topic
  // is still revalidated by ensureWords when opened.
  const [wordsByTopic, setWordsByTopic] = useState<Record<string, Word[]>>(
    () => {
      const init: Record<string, Word[]> = {}
      for (const topic of readCachedTopics() ?? []) {
        const cached = readCachedWords(topic.url)
        if (cached) init[topic.id] = cached
      }
      return init
    }
  )
  const [wordsStatus, setWordsStatus] = useState<Record<string, WordsStatus>>(
    {}
  )

  // Persist stats / selection.
  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats))
    } catch {
      /* ignore quota errors */
    }
  }, [stats])

  useEffect(() => {
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(selection))
    } catch {
      /* ignore quota errors */
    }
  }, [selection])

  // Retry entry point for the UI (event handler — safe to set state here).
  const reloadTopics = useCallback(() => {
    setTopicsLoading(true)
    return loadTopics()
      .then((t) => setTopics(t))
      .finally(() => setTopicsLoading(false))
  }, [])

  // Load the topic manifest on mount (stale-while-revalidate). topicsLoading
  // already starts true, so we don't set it synchronously in the effect.
  useEffect(() => {
    let alive = true
    loadTopics()
      .then((t) => {
        if (alive) setTopics(t)
      })
      .finally(() => {
        if (alive) setTopicsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const getTopicMeta = useCallback(
    (topicId: string) => topics.find((t) => t.id === topicId),
    [topics]
  )

  const getWords = useCallback(
    (topicId: string) => wordsByTopic[topicId] ?? [],
    [wordsByTopic]
  )

  const wordsStatusOf = useCallback(
    (topicId: string): WordsStatus => wordsStatus[topicId] ?? 'idle',
    [wordsStatus]
  )

  const fetchWords = useCallback(
    (topicId: string) => {
      const topic = topics.find((t) => t.id === topicId)
      if (!topic) return
      setWordsStatus((s) => ({ ...s, [topicId]: 'loading' }))
      loadWords(topic.url)
        .then((words) => {
          setWordsByTopic((w) => ({ ...w, [topicId]: words }))
          setWordsStatus((s) => ({ ...s, [topicId]: 'ready' }))
        })
        .catch(() => {
          setWordsStatus((s) => ({
            ...s,
            // keep usable if we already have (cached) words
            [topicId]: (wordsByTopic[topicId]?.length ?? 0) > 0
              ? 'ready'
              : 'error',
          }))
        })
    },
    [topics, wordsByTopic]
  )

  const ensureWords = useCallback(
    (topicId: string) => {
      const status = wordsStatus[topicId] ?? 'idle'
      if (status === 'loading' || status === 'ready') return
      fetchWords(topicId)
    },
    [wordsStatus, fetchWords]
  )

  const retryWords = useCallback(
    (topicId: string) => fetchWords(topicId),
    [fetchWords]
  )

  const isSelected = useCallback(
    (topicId: string, wordId: number) =>
      (selection[topicId] ?? []).includes(wordId),
    [selection]
  )

  const getSelectedIds = useCallback(
    (topicId: string) => selection[topicId] ?? [],
    [selection]
  )

  const toggleWord = useCallback((topicId: string, wordId: number) => {
    setSelection((prev) => {
      const current = prev[topicId] ?? []
      const next = current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId]
      return { ...prev, [topicId]: next }
    })
  }, [])

  const selectAll = useCallback(
    (topicId: string) => {
      const words = wordsByTopic[topicId] ?? []
      if (words.length === 0) return
      setSelection((prev) => ({
        ...prev,
        [topicId]: words.map((w) => w.id),
      }))
    },
    [wordsByTopic]
  )

  const deselectAll = useCallback((topicId: string) => {
    setSelection((prev) => ({ ...prev, [topicId]: [] }))
  }, [])

  const statOf = useCallback(
    (topicId: string, wordId: number): WordStat =>
      stats[statKey(topicId, wordId)] ?? EMPTY_STAT,
    [stats]
  )

  const startSession = useCallback(
    (opts: StartSessionOptions) => {
      const words = wordsByTopic[opts.topicId] ?? []
      if (words.length === 0) return
      const selectedIds = new Set(selection[opts.topicId] ?? [])
      const selected = shuffle(
        words.filter((w) => selectedIds.has(w.id)).map((w) => w.id)
      )
      const queue =
        opts.size === 'all' ? selected : selected.slice(0, opts.size)
      if (queue.length === 0) return
      setLastOptions(opts)
      setSession({
        topicId: opts.topicId,
        mode: opts.mode,
        orientation: opts.orientation,
        queue,
        index: 0,
        correct: 0,
        wrong: 0,
        wrongIds: [],
        finished: false,
      })
    },
    [wordsByTopic, selection]
  )

  const recordAnswer = useCallback((correct: boolean) => {
    setSession((prev) => {
      if (!prev || prev.finished) return prev
      const wordId = prev.queue[prev.index]
      const key = statKey(prev.topicId, wordId)

      setStats((s) => {
        const cur = s[key] ?? EMPTY_STAT
        return {
          ...s,
          [key]: {
            seen: cur.seen + 1,
            wrong: cur.wrong + (correct ? 0 : 1),
          },
        }
      })

      const queue = correct ? prev.queue : [...prev.queue, wordId]
      const wrongIds =
        correct || prev.wrongIds.includes(wordId)
          ? prev.wrongIds
          : [...prev.wrongIds, wordId]
      const nextIndex = prev.index + 1
      return {
        ...prev,
        queue,
        wrongIds,
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
        index: nextIndex,
        finished: nextIndex >= queue.length,
      }
    })
  }, [])

  const restartSession = useCallback(() => {
    if (lastOptions) startSession(lastOptions)
  }, [lastOptions, startSession])

  const endSession = useCallback(() => setSession(null), [])

  const clearLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STATS_KEY)
      localStorage.removeItem(SELECTION_KEY)
    } catch {
      /* ignore */
    }
    setStats({})
    setSelection({})
    setSession(null)
  }, [])

  const value = useMemo<FlashcardsContextValue>(
    () => ({
      topics,
      topicsLoading,
      reloadTopics,
      getTopicMeta,
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
      session,
      startSession,
      recordAnswer,
      restartSession,
      endSession,
      clearLocalData,
    }),
    [
      topics,
      topicsLoading,
      reloadTopics,
      getTopicMeta,
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
      session,
      startSession,
      recordAnswer,
      restartSession,
      endSession,
      clearLocalData,
    ]
  )

  return (
    <FlashcardsContext.Provider value={value}>
      {children}
    </FlashcardsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFlashcards() {
  const ctx = useContext(FlashcardsContext)
  if (!ctx) {
    throw new Error('useFlashcards must be used within FlashcardsProvider')
  }
  return ctx
}
