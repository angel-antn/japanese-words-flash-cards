export type Word = {
  id: number
  word: string
  kanji: string | null
  meaning: string
}

export type TopicMeta = {
  id: string
  name: string
  description: string
  url: string
}
