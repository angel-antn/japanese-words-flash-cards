import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { LevelMeta, Word } from '@/data/types'
import { BOX_INTERVALS } from '@/lib/srs'
import {
  loadLevels,
  loadWords,
  readCachedLevels,
  readCachedWords,
} from '@/data/remote'

export type Orientation = 'jp-meaning' | 'meaning-jp'
export type StudyMode = 'flashcard' | 'choice' | 'typing'
export type SessionSize = number | 'all'
export type WordsStatus = 'idle' | 'loading' | 'error' | 'ready'

/** Leitner box (0-4) and next review time. Missing on legacy stats = box 0, due now. */
export type WordStat = { seen: number; wrong: number; box?: number; due?: number }
type Stats = Record<string, WordStat>
type Selection = Record<string, number[]>

export type Session = {
  levelId: string
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
  levelId: string
  size: SessionSize
  orientation: Orientation
  mode: StudyMode
  /** Explicit word ids to play instead of the persisted selection. */
  wordIds?: number[]
}

const STATS_KEY = 'jf.stats'
const SELECTION_KEY = 'jf.selection'
const DAYS_KEY = 'jf.days'

const today = () => new Date().toISOString().slice(0, 10)

/** Consecutive practice days ending today or yesterday. */
function streakOf(days: string[]) {
  const set = new Set(days)
  const d = new Date()
  if (!set.has(today())) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(d.toISOString().slice(0, 10))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

function statKey(levelId: string, wordId: number) {
  return `${levelId}:${wordId}`
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
  // levels / words (remote)
  levels: LevelMeta[]
  levelsLoading: boolean
  reloadLevels: () => void
  getLevelMeta: (levelId: string) => LevelMeta | undefined
  getWords: (levelId: string) => Word[]
  wordsStatusOf: (levelId: string) => WordsStatus
  ensureWords: (levelId: string) => void
  retryWords: (levelId: string) => void
  // selection
  isSelected: (levelId: string, wordId: number) => boolean
  getSelectedIds: (levelId: string) => number[]
  toggleWord: (levelId: string, wordId: number) => void
  selectAll: (levelId: string, wordIds: number[]) => void
  deselectAll: (levelId: string, wordIds: number[]) => void
  // stats
  statOf: (levelId: string, wordId: number) => WordStat
  /** Words in Leitner box 3 or higher. */
  masteredCount: (levelId: string) => number
  streak: number
  // session
  session: Session | null
  startSession: (opts: StartSessionOptions) => void
  recordAnswer: (correct: boolean) => void
  /** Reverts the last answer (one step). */
  undoAnswer: () => void
  canUndo: boolean
  restartSession: () => void
  /** New session with only the words failed in the current one. */
  retryWrong: () => void
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
  const [days, setDays] = useState<string[]>(() => loadJSON(DAYS_KEY, []))
  const [session, setSession] = useState<Session | null>(null)
  const [lastOptions, setLastOptions] = useState<StartSessionOptions | null>(
    null
  )
  const [history, setHistory] = useState<{
    session: Session
    stats: Stats
  } | null>(null)

  const [levels, setLevels] = useState<LevelMeta[]>(
    () => readCachedLevels() ?? []
  )
  const [levelsLoading, setLevelsLoading] = useState(true)
  // Prime word lists from cache so counts render instantly offline; each level
  // is still revalidated by ensureWords when opened.
  const [wordsByLevel, setWordsByLevel] = useState<Record<string, Word[]>>(
    () => {
      const init: Record<string, Word[]> = {}
      for (const level of readCachedLevels() ?? []) {
        const cached = readCachedWords(level.url)
        if (cached) init[level.id] = cached
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

  useEffect(() => {
    try {
      localStorage.setItem(DAYS_KEY, JSON.stringify(days))
    } catch {
      /* ignore quota errors */
    }
  }, [days])

  // Retry entry point for the UI (event handler — safe to set state here).
  const reloadLevels = useCallback(() => {
    setLevelsLoading(true)
    return loadLevels()
      .then((t) => setLevels(t))
      .finally(() => setLevelsLoading(false))
  }, [])

  // Load the level manifest on mount (stale-while-revalidate). levelsLoading
  // already starts true, so we don't set it synchronously in the effect.
  useEffect(() => {
    let alive = true
    loadLevels()
      .then((t) => {
        if (alive) setLevels(t)
      })
      .finally(() => {
        if (alive) setLevelsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const getLevelMeta = useCallback(
    (levelId: string) => levels.find((t) => t.id === levelId),
    [levels]
  )

  const getWords = useCallback(
    (levelId: string) => wordsByLevel[levelId] ?? [],
    [wordsByLevel]
  )

  const wordsStatusOf = useCallback(
    (levelId: string): WordsStatus => wordsStatus[levelId] ?? 'idle',
    [wordsStatus]
  )

  const fetchWords = useCallback(
    (levelId: string) => {
      const level = levels.find((t) => t.id === levelId)
      if (!level) return
      setWordsStatus((s) => ({ ...s, [levelId]: 'loading' }))
      loadWords(level.url)
        .then((words) => {
          setWordsByLevel((w) => ({ ...w, [levelId]: words }))
          setWordsStatus((s) => ({ ...s, [levelId]: 'ready' }))
        })
        .catch(() => {
          setWordsStatus((s) => ({
            ...s,
            // keep usable if we already have (cached) words
            [levelId]: (wordsByLevel[levelId]?.length ?? 0) > 0
              ? 'ready'
              : 'error',
          }))
        })
    },
    [levels, wordsByLevel]
  )

  const ensureWords = useCallback(
    (levelId: string) => {
      const status = wordsStatus[levelId] ?? 'idle'
      if (status === 'loading' || status === 'ready') return
      fetchWords(levelId)
    },
    [wordsStatus, fetchWords]
  )

  const retryWords = useCallback(
    (levelId: string) => fetchWords(levelId),
    [fetchWords]
  )

  const isSelected = useCallback(
    (levelId: string, wordId: number) =>
      (selection[levelId] ?? []).includes(wordId),
    [selection]
  )

  const getSelectedIds = useCallback(
    (levelId: string) => selection[levelId] ?? [],
    [selection]
  )

  const toggleWord = useCallback((levelId: string, wordId: number) => {
    setSelection((prev) => {
      const current = prev[levelId] ?? []
      const next = current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId]
      return { ...prev, [levelId]: next }
    })
  }, [])

  const selectAll = useCallback((levelId: string, wordIds: number[]) => {
    setSelection((prev) => ({
      ...prev,
      [levelId]: [...new Set([...(prev[levelId] ?? []), ...wordIds])],
    }))
  }, [])

  const deselectAll = useCallback((levelId: string, wordIds: number[]) => {
    const drop = new Set(wordIds)
    setSelection((prev) => ({
      ...prev,
      [levelId]: (prev[levelId] ?? []).filter((id) => !drop.has(id)),
    }))
  }, [])

  const statOf = useCallback(
    (levelId: string, wordId: number): WordStat =>
      stats[statKey(levelId, wordId)] ?? EMPTY_STAT,
    [stats]
  )

  const masteredCount = useCallback(
    (levelId: string) =>
      Object.entries(stats).filter(
        ([k, st]) => k.startsWith(`${levelId}:`) && (st.box ?? 0) >= 3
      ).length,
    [stats]
  )
  const streak = useMemo(() => streakOf(days), [days])

  const startSession = useCallback(
    (opts: StartSessionOptions) => {
      const words = wordsByLevel[opts.levelId] ?? []
      if (words.length === 0) return
      const pool = new Set(opts.wordIds ?? selection[opts.levelId] ?? [])
      const selected = shuffle(
        words.filter((w) => pool.has(w.id)).map((w) => w.id)
      )
      const queue =
        opts.size === 'all' ? selected : selected.slice(0, opts.size)
      if (queue.length === 0) return
      setLastOptions(opts)
      setHistory(null)
      setSession({
        levelId: opts.levelId,
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
    [wordsByLevel, selection]
  )

  const recordAnswer = useCallback(
    (correct: boolean) => {
      if (!session || session.finished) return
      const wordId = session.queue[session.index]
      const key = statKey(session.levelId, wordId)
      setHistory({ session, stats })

      const cur = stats[key] ?? EMPTY_STAT
      const box = correct ? Math.min((cur.box ?? 0) + 1, 4) : 0
      setStats({
        ...stats,
        [key]: {
          seen: cur.seen + 1,
          wrong: cur.wrong + (correct ? 0 : 1),
          box,
          due: Date.now() + BOX_INTERVALS[box],
        },
      })
      setDays((d) => (d.includes(today()) ? d : [...d, today()]))

      const queue = correct ? session.queue : [...session.queue, wordId]
      const wrongIds =
        correct || session.wrongIds.includes(wordId)
          ? session.wrongIds
          : [...session.wrongIds, wordId]
      const nextIndex = session.index + 1
      setSession({
        ...session,
        queue,
        wrongIds,
        correct: session.correct + (correct ? 1 : 0),
        wrong: session.wrong + (correct ? 0 : 1),
        index: nextIndex,
        finished: nextIndex >= queue.length,
      })
    },
    [session, stats]
  )

  const undoAnswer = useCallback(() => {
    if (!history) return
    setSession(history.session)
    setStats(history.stats)
    setHistory(null)
  }, [history])

  const restartSession = useCallback(() => {
    if (lastOptions) startSession(lastOptions)
  }, [lastOptions, startSession])

  const retryWrong = useCallback(() => {
    if (lastOptions && session && session.wrongIds.length > 0)
      startSession({ ...lastOptions, size: 'all', wordIds: session.wrongIds })
  }, [lastOptions, session, startSession])

  const endSession = useCallback(() => setSession(null), [])

  const clearLocalData = useCallback(() => {
    try {
      localStorage.removeItem(STATS_KEY)
      localStorage.removeItem(SELECTION_KEY)
      localStorage.removeItem(DAYS_KEY)
    } catch {
      /* ignore */
    }
    setStats({})
    setSelection({})
    setDays([])
    setSession(null)
  }, [])

  const value = useMemo<FlashcardsContextValue>(
    () => ({
      levels,
      levelsLoading,
      reloadLevels,
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
      masteredCount,
      streak,
      session,
      startSession,
      recordAnswer,
      undoAnswer,
      canUndo: history !== null,
      restartSession,
      retryWrong,
      endSession,
      clearLocalData,
    }),
    [
      levels,
      levelsLoading,
      reloadLevels,
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
      masteredCount,
      streak,
      session,
      startSession,
      recordAnswer,
      undoAnswer,
      history,
      restartSession,
      retryWrong,
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
