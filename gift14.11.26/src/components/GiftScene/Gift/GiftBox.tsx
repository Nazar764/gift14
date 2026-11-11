import type { CSSProperties } from 'react'
import './GiftBox.css';

export interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  driftX: number;
  midpointY: number;
  driftY: number;
  color: string;
  size: number;
  rotation: number;
  duration: number;
}

type ConfettiStyle = CSSProperties & {
  '--confetti-x': string;
  '--confetti-mid-x': string;
  '--confetti-mid-y': string;
  '--confetti-y': string;
  '--confetti-rotation': string;
}

interface GiftBoxProps {
  stage: 'dropping' | 'ready' | 'holding' | 'opened';
  holdProgress: number;
  confetti: ConfettiParticle[];
  isMuted: boolean;
  birthdayHeader: string;
  onToggleMute: () => void;
  onDropComplete: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}

export function GiftBox({
  stage,
  holdProgress,
  confetti,
  isMuted,
  birthdayHeader,
  onToggleMute,
  onDropComplete,
  onHoldStart,
  onHoldEnd,
}: GiftBoxProps) {
  const shouldShowTitle = stage !== 'opened';

  return (
    <div className="gift-scene__gift">
      <button
        type="button"
        className="sound-toggle"
        aria-label={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
        onClick={onToggleMute}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {shouldShowTitle && (
        <header className="title-wrap title-visible">
          <h1>{birthdayHeader}</h1>
        </header>
      )}

      {/* Білий спалах розширюється від центру екрана */}
      <div className={`white-flash-overlay ${stage === 'opened' ? 'white-flash-active' : ''}`} />

      {confetti.length > 0 && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.x}px`,
                top: `${piece.y}px`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                background: piece.color,
                animationDuration: `${piece.duration}s`,
                '--confetti-x': `${piece.driftX}px`,
                '--confetti-mid-x': `${piece.driftX * 0.55}px`,
                '--confetti-mid-y': `${piece.midpointY}px`,
                '--confetti-y': `${piece.driftY}px`,
                '--confetti-rotation': `${piece.rotation}deg`,
              } as ConfettiStyle}
            />
          ))}
        </div>
      )}

      {(stage === 'dropping' || stage === 'ready' || stage === 'holding' || stage === 'opened') && (
        <div className="gift-stage">
          {(stage === 'ready' || stage === 'holding') && (
            <div className="instruction-banner">
              <p>
                <span className="sparkle">✨</span>
                {stage === 'holding' ? 'Відкриваємо...' : 'Затисни подарунок, щоб відкрити'}
                <span className="sparkle">✨</span>
              </p>
              <div
                className="progress-bar"
                role="progressbar"
                aria-label="Прогрес відкриття подарунка"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={holdProgress}
              >
                <div
                  className="progress-bar__fill"
                  style={{ transform: `scaleX(${holdProgress / 100})` }}
                />
              </div>
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            aria-label="Затисніть подарунок, щоб відкрити"
            className={`gift-box-wrapper ${stage === 'dropping' ? 'animate-drop-down' : ''} ${stage === 'holding' ? 'animate-shake-box' : ''}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && stage === 'dropping') {
                onDropComplete()
              }
            }}
            onPointerDown={(event) => {
              if (stage !== 'ready') return
              event.currentTarget.setPointerCapture(event.pointerId)
              onHoldStart()
            }}
            onPointerUp={onHoldEnd}
            onPointerCancel={onHoldEnd}
            onLostPointerCapture={onHoldEnd}
            onKeyDown={(event) => {
              if ((event.key === ' ' || event.key === 'Enter') && stage === 'ready') {
                event.preventDefault()
                onHoldStart()
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') onHoldEnd()
            }}
          >
            <div className="gift-shadow" aria-hidden="true" />

            <div className={`gift-box ${stage === 'opened' ? 'gift-box--opened' : ''}`}>
              {/* Кришка коробки з бантом (вилітає вгору) */}
              <div className={`gift-box__lid ${stage === 'opened' ? 'animate-lid-fly' : ''}`}>
                <span className="gift-ribbon gift-ribbon--lid-vertical" />
                <div className="gift-bow">
                  <div className="gift-bow__left" />
                  <div className="gift-bow__right" />
                  <div className="gift-bow__center" />
                </div>
              </div>
              
              {/* Нижня основа коробки зі стрічками */}
              <div className="gift-box__base">
                <span className="gift-ribbon gift-ribbon--vertical" />
                <span className="gift-ribbon gift-ribbon--horizontal" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}