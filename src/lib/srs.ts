import type { WordStat } from '@/context/FlashcardsContext'

const DAY = 86_400_000
/** Leitner review intervals indexed by box. */
export const BOX_INTERVALS = [0, 1 * DAY, 3 * DAY, 7 * DAY, 21 * DAY]

export function isDue(stat: WordStat, now = Date.now()) {
  return (stat.due ?? 0) <= now
}
