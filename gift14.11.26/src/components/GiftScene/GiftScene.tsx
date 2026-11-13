import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './GiftScene.css'
import { Background, type FloatingHeart, type RunningCat } from './Background/Background'
import { GiftBox, type ConfettiParticle } from './Gift/GiftBox'
import { FallingGame } from './FallingGame/FallingGame'
import { publicAsset } from '../../utils/publicAsset'

const BookScene = lazy(() => import('./BookScene').then(({ BookScene }) => ({ default: BookScene })))

const birthdayHeader = ''
const OPENING_TRANSITION_DURATION = 2200
const MUSIC_TRACKS = [
  publicAsset('audio/background.mp3'),
  publicAsset('audio/I-Love-you-so.mp3'),
] as const
const BOOK_SONG_VOLUME = 1

const buildHearts = (): FloatingHeart[] =>
  Array.from({ length: 25 }, (_, i) => {
    const duration = Math.random() * 8 + 6
    return {
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 20 + 14,
      duration,
      delay: -(Math.random() * duration),
    }
  })

const buildCats = (): RunningCat[] =>
  Array.from({ length: 4 }, (_, i) => {
    const speed = Math.random() * 6 + 10
    return {
      id: i,
      yPercent: 15 + i * 22 + Math.random() * 10,
      speed,
      delay: -(Math.random() * speed),
      scale: 0.8 + Math.random() * 0.4,
      direction: i % 2 === 0 ? 'left-to-right' : 'right-to-left',
      type: i % 3,
    }
  })

export function GiftScene() {
  const [stage, setStage] = useState<'dropping' | 'ready' | 'holding' | 'opened'>('dropping')
  const [holdProgress, setHoldProgress] = useState(0)
  const [hearts] = useState<FloatingHeart[]>(buildHearts)
  const [cats] = useState<RunningCat[]>(buildCats)
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([])
  const [showGame, setShowGame] = useState(false)
  const [showBook, setShowBook] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null)
  const musicTrackIndexRef = useRef(0)
  const musicStartedRef = useRef(false)
  const holdSoundRef = useRef<HTMLAudioElement | null>(null)
  const confettiSoundRef = useRef<HTMLAudioElement | null>(null)
  const bookSongRef = useRef<HTMLAudioElement | null>(null)
  const holdFrameRef = useRef<number | null>(null)
  const backgroundMusicVolume = 0.06
  const holdSoundVolume = 0.08
  const confettiSoundVolume = 0.12

  useEffect(() => {
    if (bookSongRef.current) bookSongRef.current.volume = BOOK_SONG_VOLUME
  }, [])

  useEffect(() => {
    const audio = backgroundMusicRef.current
    if (!audio) return

    audio.volume = backgroundMusicVolume

    const playCurrentTrack = () => {
      if (isMuted) return
      void audio.play().catch((error: unknown) => {
        console.error(`Не вдалося відтворити ${MUSIC_TRACKS[musicTrackIndexRef.current]}.`, error)
      })
    }

    const startPlayback = () => {
      if (isMuted || musicStartedRef.current) return
      void audio.play().then(
        () => {
          musicStartedRef.current = true
          document.removeEventListener('pointerdown', startPlayback)
          document.removeEventListener('keydown', startPlayback)
        },
        (error: unknown) => {
          if (error instanceof DOMException && error.name === 'NotAllowedError') return
          console.error(`Не вдалося відтворити ${MUSIC_TRACKS[musicTrackIndexRef.current]}.`, error)
        },
      )
    }

    const handleTrackEnded = () => {
      musicTrackIndexRef.current = (musicTrackIndexRef.current + 1) % MUSIC_TRACKS.length
      audio.src = MUSIC_TRACKS[musicTrackIndexRef.current]
      playCurrentTrack()
    }

    audio.addEventListener('ended', handleTrackEnded)
    document.addEventListener('pointerdown', startPlayback)
    document.addEventListener('keydown', startPlayback)
    startPlayback()

    return () => {
      audio.removeEventListener('ended', handleTrackEnded)
      document.removeEventListener('pointerdown', startPlayback)
      document.removeEventListener('keydown', startPlayback)
    }
  }, [isMuted])

  useEffect(() => {
    if (!showBook) return

    if (holdSoundRef.current) {
      holdSoundRef.current.pause()
      holdSoundRef.current.currentTime = 0
    }
  }, [showBook])

  const playBackgroundMusic = () => {
    const audio = backgroundMusicRef.current
    if (!audio || !audio.paused) return

    void audio.play().catch((error: unknown) => {
      console.error(`Не вдалося відтворити ${MUSIC_TRACKS[musicTrackIndexRef.current]}.`, error)
    })
  }

  const playEffectSound = (audio: HTMLAudioElement | null, volume = 1) => {
    if (isMuted) return
    if (!audio) return

    audio.currentTime = 0
    audio.volume = volume
    void audio.play().catch((error: unknown) => {
      console.error('Не вдалося відтворити звуковий ефект.', error)
    })
  }

  const playHoldSound = () => {
    const audio = holdSoundRef.current
    if (isMuted || !audio || !audio.paused) return

    audio.volume = holdSoundVolume
    audio.currentTime = 0
    void audio.play().catch((error: unknown) => {
      console.error('Не вдалося відтворити звук затискання подарунка.', error)
    })
  }

  const stopHoldSound = () => {
    const audio = holdSoundRef.current
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
  }

  useEffect(() => {
    if (confetti.length === 0) return

    const timeout = window.setTimeout(() => setConfetti([]), OPENING_TRANSITION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [confetti])

  useEffect(() => {
    if (stage !== 'opened') return

    const timeout = window.setTimeout(() => setShowGame(true), OPENING_TRANSITION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [stage])

  useEffect(
    () => () => {
      if (holdFrameRef.current !== null) {
        window.cancelAnimationFrame(holdFrameRef.current)
      }
    },
    [],
  )

  const triggerConfetti = () => {
    stopHoldSound()
    playEffectSound(confettiSoundRef.current, confettiSoundVolume)
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF85A1', '#A8E6CF', '#FFD700', '#FF1493', '#9370DB']
    const particles: ConfettiParticle[] = []
    const originX = window.innerWidth / 2
    const originY = window.innerHeight - Math.max(60, Math.min(window.innerHeight * 0.15, 144)) - 85

    for (let i = 0; i < 72; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * 190 + 90
      const driftX = Math.cos(angle) * distance
      const driftY = Math.sin(angle) * distance + 100
      particles.push({
        id: Math.random(),
        x: originX,
        y: originY,
        driftX,
        midpointY: driftY / 2 - 45,
        driftY,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 12 + 6,
        rotation: Math.random() * 360,
        duration: Math.random() * 0.6 + 1.4,
      })
    }

    setStage('opened')
    setConfetti(particles)
  }

  const handleHoldStart = () => {
    if (stage !== 'ready' || holdFrameRef.current !== null) return

    if (!isMuted) playBackgroundMusic()
    playHoldSound()
    setStage('holding')
    setHoldProgress(0)

    const startTime = performance.now()
    const duration = 1500

    const updateProgress = (time: number) => {
      const elapsed = time - startTime
      const progress = Math.min((elapsed / duration) * 100, 100)
      setHoldProgress(progress)

      if (progress >= 100) {
        holdFrameRef.current = null
        triggerConfetti()
        return
      }

      holdFrameRef.current = window.requestAnimationFrame(updateProgress)
    }

    holdFrameRef.current = window.requestAnimationFrame(updateProgress)
  }

  const handleHoldEnd = () => {
    stopHoldSound()
    if (holdFrameRef.current === null) return

    window.cancelAnimationFrame(holdFrameRef.current)
    holdFrameRef.current = null
    setHoldProgress(0)
    setStage('ready')
  }

  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)

    if (nextMuted) {
      backgroundMusicRef.current?.pause()
      stopHoldSound()
    } else {
      playBackgroundMusic()
      if (backgroundMusicRef.current?.paused) {
        musicStartedRef.current = false
      }
      if (stage === 'holding') playHoldSound()
    }
  }

  return (
    <div className="gift-scene">
      <Background hearts={hearts} cats={cats} />
      <audio ref={backgroundMusicRef} src={MUSIC_TRACKS[0]} preload="none" />
      <audio
        ref={bookSongRef}
        src={publicAsset('audio/strikalovods.mp4')}
        preload="auto"
        muted={isMuted}
      />
      <audio ref={holdSoundRef} src={publicAsset('audio/Open-effect.mp3')} loop preload="auto" />
      <audio ref={confettiSoundRef} src={publicAsset('audio/Confetti.mp3')} preload="auto" />

      <GiftBox
        stage={stage}
        holdProgress={holdProgress}
        confetti={confetti}
        isMuted={isMuted}
        birthdayHeader={birthdayHeader}
        onToggleMute={handleToggleMute}
        onDropComplete={() => {
          if (stage === 'dropping') setStage('ready')
        }}
        onHoldStart={handleHoldStart}
        onHoldEnd={handleHoldEnd}
      />
      {showGame && !showBook && <FallingGame onBookOpen={() => setShowBook(true)} />}
      {showBook && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[60] grid place-items-center bg-[#f8e9ed] text-lg font-semibold text-[#7b3853]">
              Готуємо сюрприз…
            </div>
          }
        >
          <BookScene songRef={bookSongRef} />
        </Suspense>
      )}
    </div>
  )
}