import type { TopicMeta, Word } from './types'
import { MANIFEST_URL } from './manifest'

/**
 * Normalizes a gist URL to its raw form so it returns JSON instead of the
 * HTML gist page. Accepts either form:
 *   https://gist.github.com/<user>/<id>            -> .../raw
 *   https://gist.githubusercontent.com/.../raw     -> unchanged
 */
export function toRawGistUrl(url: string): string {
  const page = url.match(
    /^https?:\/\/gist\.github\.com\/([^/]+)\/([0-9a-f]+)\/?$/i
  )
  if (page) {
    return `https://gist.githubusercontent.com/${page[1]}/${page[2]}/raw`
  }
  return url
}

function cacheKey(url: string) {
  return `jf.cache:${url}`
}

export function readCache<T>(url: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(url))
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache(url: string, data: unknown) {
  try {
    localStorage.setItem(cacheKey(url), JSON.stringify(data))
  } catch {
    /* ignore quota errors */
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  // Gist raw is served as text/plain, so parse manually.
  const text = await res.text()
  return JSON.parse(text) as T
}

function validateManifest(data: unknown): TopicMeta[] {
  if (!Array.isArray(data)) return []
  return data.filter(
    (t): t is TopicMeta =>
      !!t &&
      typeof t === 'object' &&
      typeof (t as TopicMeta).id === 'string' &&
      typeof (t as TopicMeta).name === 'string' &&
      typeof (t as TopicMeta).url === 'string'
  )
}

function validateWords(data: unknown): Word[] {
  if (!Array.isArray(data)) return []
  const out: Word[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue
    const w = raw as Record<string, unknown>
    const word = typeof w.word === 'string' ? w.word.trim() : ''
    const meaning = typeof w.meaning === 'string' ? w.meaning.trim() : ''
    const id = typeof w.id === 'number' ? w.id : Number(w.id)
    if (!word || !meaning || Number.isNaN(id)) continue
    const kanjiRaw = typeof w.kanji === 'string' ? w.kanji.trim() : ''
    out.push({ id, word, meaning, kanji: kanjiRaw === '' ? null : kanjiRaw })
  }
  return out
}

export async function loadTopics(): Promise<TopicMeta[]> {
  try {
    const topics = validateManifest(await fetchJson(MANIFEST_URL))
    if (topics.length === 0) throw new Error('Empty manifest')
    writeCache(MANIFEST_URL, topics)
    return topics
  } catch {
    return readCache<TopicMeta[]>(MANIFEST_URL) ?? []
  }
}

/**
 * Loads the words for a topic. Cache key is the normalized raw URL.
 * On network failure falls back to cache; throws only if there is no cache.
 */
export async function loadWords(url: string): Promise<Word[]> {
  const rawUrl = toRawGistUrl(url)
  try {
    const words = validateWords(await fetchJson(rawUrl))
    if (words.length === 0) throw new Error('Empty word list')
    writeCache(rawUrl, words)
    return words
  } catch (err) {
    const cached = readCache<Word[]>(rawUrl)
    if (cached && cached.length > 0) return cached
    throw err
  }
}

export function readCachedWords(url: string): Word[] | null {
  return readCache<Word[]>(toRawGistUrl(url))
}

export function readCachedTopics(): TopicMeta[] | null {
  return readCache<TopicMeta[]>(MANIFEST_URL)
}
