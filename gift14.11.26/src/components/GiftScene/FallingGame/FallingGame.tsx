import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './FallingGame.css'
import { publicAsset } from '../../../utils/publicAsset'

const GOAL = 25
const NORMAL_SPAWN_INTERVAL = 950
const FAST_SPAWN_INTERVAL = 650

type ItemKind = 'heart' | 'gift' | 'cat' | 'bomb'

interface FallingItem {
  id: number
  kind: ItemKind
  x: number
  duration: number
  rotation: number
}

const itemDetails: Record<ItemKind, { emoji: string; label: string }> = {
  heart: { emoji: '💖', label: 'Сердечко' },
  gift: { emoji: '🎁', label: 'Подарунок' },
  cat: { emoji: '🐱', label: 'Котик' },
  bomb: { emoji: '💣', label: 'Бомба — не торкайся' },
}

function createItem(id: number, collected: number, forceBomb: boolean): FallingItem {
  const isBomb = forceBomb || Math.random() < (collected >= 10 ? 0.2 : 0.12)
  const kind: ItemKind = isBomb
    ? 'bomb'
    : (['heart', 'gift', 'cat'] as const)[Math.floor(Math.random() * 3)]
  const speedMultiplier = collected >= 10 ? 0.75 : 1
  const baseDuration = (4.7 + Math.random() * 1.3) * speedMultiplier

  return {
    id,
    kind,
    x: 7 + Math.random() * 86,
    duration: baseDuration * (isBomb ? 1.5 : 1),
    rotation: Math.random() * 30 - 15,
  }
}

interface FallingGameProps {
  onBookOpen: () => void
}

export function FallingGame({ onBookOpen }: FallingGameProps) {
  const [items, setItems] = useState<FallingItem[]>([])
  const [collected, setCollected] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [message, setMessage] = useState('')
  const nextIdRef = useRef(0)
  const collectedRef = useRef(0)
  const completeRef = useRef(false)
  const handledItemsRef = useRef(new Set<number>())
  const messageTimeoutRef = useRef<number | null>(null)
  const bookTransitionTimeoutRef = useRef<number | null>(null)
  const activeAudioRef = useRef(new Set<HTMLAudioElement>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const isFastPhase = collected >= 10
  const isFinalPhase = collected >= 20

  useEffect(() => {
    if (isComplete) return

    let phaseSpawnCount = 0
    const spawn = () => {
      if (completeRef.current) return
      phaseSpawnCount += 1
      const forceBomb = isFinalPhase && phaseSpawnCount % 2 === 0
      const item = createItem(nextIdRef.current++, collectedRef.current, forceBomb)
      setItems((current) => [...current, item])
    }

    const initialSpawn = window.setTimeout(spawn, 250)
    const interval = window.setInterval(
      spawn,
      isFastPhase ? FAST_SPAWN_INTERVAL : NORMAL_SPAWN_INTERVAL,
    )

    return () => {
      window.clearTimeout(initialSpawn)
      window.clearInterval(interval)
    }
  }, [isComplete, isFastPhase, isFinalPhase])

  useEffect(
    () => () => {
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current)
      }
      if (bookTransitionTimeoutRef.current !== null) {
        window.clearTimeout(bookTransitionTimeoutRef.current)
      }
      for (const audio of activeAudioRef.current) {
        audio.pause()
      }
      activeAudioRef.current.clear()
      if (audioContextRef.current) {
        void audioContextRef.current.close()
      }
    },
    [],
  )

  const playSound = (source: string) => {
    const audio = new Audio(source)
    audio.preload = 'auto'
    audio.volume = 0.7
    activeAudioRef.current.add(audio)
    audio.addEventListener(
      'ended',
      () => activeAudioRef.current.delete(audio),
      { once: true },
    )
    void audio.play().catch((error: unknown) => {
      activeAudioRef.current.delete(audio)
      console.error(`Не вдалося відтворити звуковий ефект ${source}.`, error)
    })
  }

  const playCollectSound = () => {
    const context = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = context

    void context.resume().then(
      () => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const startTime = context.currentTime

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(660, startTime)
        oscillator.frequency.exponentialRampToValueAtTime(990, startTime + 0.12)
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(startTime)
        oscillator.stop(startTime + 0.23)
      },
      (error: unknown) => {
        console.error('Не вдалося відтворити звук зібраного предмета.', error)
      },
    )
  }

  const removeItem = (id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const handleItemTap = (item: FallingItem) => {
    if (handledItemsRef.current.has(item.id)) return
    handledItemsRef.current.add(item.id)
    removeItem(item.id)

    if (item.kind === 'bomb') {
      playSound(publicAsset('audio/granata.mp4'))
      setMessage('Бомба! Збирай усе крім бомб.')
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current)
      }
      messageTimeoutRef.current = window.setTimeout(() => setMessage(''), 1800)
      return
    }

    if (item.kind === 'cat') {
      playSound(publicAsset('audio/cat.mp4'))
    } else {
      playCollectSound()
    }

    const nextCount = collectedRef.current + 1
    collectedRef.current = nextCount
    setCollected(nextCount)

    if (nextCount === GOAL) {
      completeRef.current = true
      setIsComplete(true)
      setItems([])
      setMessage('')
    }
  }

  const handleBookContinue = () => {
    if (isLeaving) return
    playSound(publicAsset('audio/win.mp4'))
    setIsLeaving(true)
    bookTransitionTimeoutRef.current = window.setTimeout(onBookOpen, 450)
  }

  return (
    <main className="falling-game">
      <div className="falling-game__glow falling-game__glow--one" aria-hidden="true" />
      <div className="falling-game__glow falling-game__glow--two" aria-hidden="true" />

      <>
        <header className="falling-game__header">
            <p className="falling-game__eyebrow">Маленька гра для тебе</p>
            <h1>Збери усі подарунки</h1>
            <p className="falling-game__instruction">
              Тапай на сердечка, подарунки та котиків. Бомб не торкайся!
            </p>
          </header>

          <section className="falling-game__counter" aria-label="Прогрес гри">
            <span className="falling-game__counter-label">Зібрано</span>
            <p
              className="falling-game__counter-value"
              role="progressbar"
              aria-label="Зібрано сюрпризів"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={collected}
            >
              <span aria-live="polite">{collected}</span>
              <span className="falling-game__counter-divider">/</span>
              {GOAL}
            </p>
            <div className="falling-game__progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${collected / GOAL})` }} />
            </div>
          </section>

          <div className="falling-game__items" aria-label="Предмети, що падають">
            {items.map((item) => {
              const details = itemDetails[item.kind]
              const itemStyle = {
                left: `${item.x}%`,
                animationDuration: `${item.duration}s`,
                '--item-rotation': `${item.rotation}deg`,
              } as CSSProperties

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`falling-game__item falling-game__item--${item.kind}`}
                  style={itemStyle}
                  aria-label={details.label}
                  onClick={() => handleItemTap(item)}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) removeItem(item.id)
                  }}
                >
                  <span aria-hidden="true">{details.emoji}</span>
                </button>
              )
            })}
          </div>

          <p className="falling-game__message" role="status" aria-live="polite">
            {message}
          </p>

          <button
            type="button"
            className="falling-game__skip"
            onClick={handleBookContinue}
            disabled={isLeaving}
          >
            Пропустити гру
          </button>

          <footer className="falling-game__footer">
            <button
              type="button"
              className={`falling-game__button${isComplete ? ' falling-game__button--ready' : ''}${isLeaving ? ' falling-game__button--leaving' : ''}`}
              disabled={!isComplete}
              onClick={handleBookContinue}
            >
              Отримати подарунок
            </button>
        </footer>
      </>
    </main>
  )
}
