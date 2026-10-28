// Tarayıcının konuşma sentezi ile Rusça telaffuz (cihazda Rusça ses varsa internetsiz çalışır).

let ruVoice: SpeechSynthesisVoice | null | undefined

function pickVoice(): SpeechSynthesisVoice | null {
  if (ruVoice !== undefined && ruVoice !== null) return ruVoice
  const voices = window.speechSynthesis.getVoices()
  ruVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ru') && v.localService) ?? voices.find((v) => v.lang.toLowerCase().startsWith('ru')) ?? null
  return ruVoice
}

export const canSay = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export function say(text: string, rate = 0.85) {
  if (!canSay()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ', '))
  u.lang = 'ru-RU'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
}

/** Küçük hoparlör düğmesi */
export function Say({ text, label }: { text: string; label?: string }) {
  if (!canSay()) return null
  return (
    <button
      type="button"
      className="say"
      onClick={(e) => {
        e.stopPropagation()
        say(text)
      }}
      aria-label={label ?? `«${text}» telaffuzunu dinle`}
      title="Dinle"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  )
}
