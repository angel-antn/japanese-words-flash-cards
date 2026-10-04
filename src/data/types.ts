export type Word = {
  id: number
  word: string
  kanji: string | null
  meaning: string
  category: string
}

export type LevelMeta = {
  id: string
  name: string
  description: string
  url: string
}
