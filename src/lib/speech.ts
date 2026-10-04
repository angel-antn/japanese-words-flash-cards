/** Reads Japanese text aloud with the browser's built-in voices. No-op if unsupported. */
export function speak(text: string) {
  if (typeof speechSynthesis === 'undefined') return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = 0.9
  const voice = speechSynthesis
    .getVoices()
    .find((v) => v.lang.replace('_', '-').startsWith('ja'))
  if (voice) u.voice = voice
  speechSynthesis.speak(u)
}

export const canSpeak = typeof speechSynthesis !== 'undefined'
