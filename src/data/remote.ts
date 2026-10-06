import type { LevelMeta, Word } from './types'
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

/** Removes every cached manifest/word list. Progress and stats are untouched. */
export function clearCache() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('jf.cache:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
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

function validateManifest(data: unknown): LevelMeta[] {
  if (!Array.isArray(data)) return []
  return data.filter(
    (t): t is LevelMeta =>
      !!t &&
      typeof t === 'object' &&
      typeof (t as LevelMeta).id === 'string' &&
      typeof (t as LevelMeta).name === 'string' &&
      typeof (t as LevelMeta).url === 'string'
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
    const category =
      typeof w.category === 'string' && w.category.trim()
        ? w.category.trim()
        : 'variados'
    out.push({
      id,
      word,
      meaning,
      kanji: kanjiRaw === '' ? null : kanjiRaw,
      category,
    })
  }
  return out
}

export async function loadLevels(): Promise<LevelMeta[]> {
  try {
    const levels = validateManifest(await fetchJson(MANIFEST_URL))
    if (levels.length === 0) throw new Error('Empty manifest')
    writeCache(MANIFEST_URL, levels)
    return levels
  } catch {
    return readCache<LevelMeta[]>(MANIFEST_URL) ?? []
  }
}

/**
 * Loads the words for a level. Cache key is the normalized raw URL.
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
    const cached = readCachedWords(url)
    if (cached && cached.length > 0) return cached
    throw err
  }
}

/**
 * Cached entries may predate the current Word shape (e.g. no `category`),
 * so they go through the same validation as a fresh download.
 */
export function readCachedWords(url: string): Word[] | null {
  const cached = readCache<unknown>(toRawGistUrl(url))
  return cached === null ? null : validateWords(cached)
}

export function readCachedLevels(): LevelMeta[] | null {
  return readCache<LevelMeta[]>(MANIFEST_URL)
}
