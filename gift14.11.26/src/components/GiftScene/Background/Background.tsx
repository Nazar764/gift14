import './Background.css'

export interface FloatingHeart {
  id: number
  x: number
  size: number
  duration: number
  delay: number
}

export interface RunningCat {
  id: number
  yPercent: number
  speed: number
  delay: number
  scale: number
  direction: 'left-to-right' | 'right-to-left'
  type: number
}

interface BackgroundProps {
  hearts: FloatingHeart[]
  cats: RunningCat[]
}

export function Background({ hearts, cats }: BackgroundProps) {
  return (
    <div className="background-scene" aria-hidden="true">
      <div className="floating-hearts">
        {hearts.map((heart) => (
          <span
            key={heart.id}
            className="floating-heart"
            style={{
              left: `${heart.x}%`,
              fontSize: `${heart.size}px`,
              animationDuration: `${heart.duration}s`,
              animationDelay: `${heart.delay}s`,
            }}
          >
            ❤
          </span>
        ))}
      </div>

      <div className="cat-track">
        {cats.map((cat) => (
          <div
            key={cat.id}
            className={`cat-runner cat-runner--${cat.direction}`}
            style={{
              top: `${cat.yPercent}%`,
              animationDuration: `${cat.speed}s`,
              animationDelay: `${cat.delay}s`,
              scale: cat.scale,
            }}
          >
            <span className="cat-emoji">
              {cat.type === 0 ? '🐱' : cat.type === 1 ? '😸' : '😻'}
            </span>
            <span className="cat-badge">
              {cat.type === 0 ? 'Мяв! 💕' : cat.type === 1 ? 'Пурр-пурр ✨' : 'Cute🎉'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}