import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import confetti from 'canvas-confetti'
import { publicAsset } from '../../utils/publicAsset'

type BookPhase = 'falling' | 'landed' | 'opening' | 'opened' | 'turning' | 'closing'

const BOOK_WIDTH = 3.35
const BOOK_DEPTH = 4.25
const BOOK_LAND_Y = 0.13
const PAGE_SURFACE_Y = 0.16
const FALL_DURATION = 1450
const OPEN_DURATION = 1250
const COVER_OPEN_ANGLE = Math.PI
const PAGE_TURN_DURATION = 950
const CLOSE_DURATION = 700
const CLOSE_PAGE_DURATION = 400
const SECOND_VERSE_START_SECONDS = 7
const PAGE_COUNT = 14
const LEAF_COUNT = 6
const LEAF_THICKNESS = 0.02
const PAGE_TWO_EXTRA_THICKNESS = 0.014
const pageImageUrls = import.meta.glob('../../../page/st*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

interface PageLeaf {
  group: THREE.Group
  mesh: THREE.Mesh
}

function createPageTexture(
  renderer: THREE.WebGLRenderer,
  page: { number: number; text: string; image?: string },
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 1024
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не вдалося створити текстуру сторінки книги.')
  context.scale(canvas.width / 900, canvas.height / 1200)

  context.fillStyle = '#f7efdf'
  context.fillRect(0, 0, 900, 1200)

  if (page.image) {
    const illustration = new Image()
    illustration.onload = () => {
      context.drawImage(illustration, 0, 0, 900, 1200)
      texture.needsUpdate = true
      const backTextures = texture.userData.backTextures as THREE.Texture[]
      backTextures.forEach((backTexture) => {
        backTexture.needsUpdate = true
      })
    }
    illustration.src = page.image
  } else {
    context.strokeStyle = 'rgba(147, 103, 91, 0.17)'
    context.lineWidth = 2
    context.strokeRect(38, 38, 824, 1124)

    context.textAlign = 'right'
    context.textBaseline = 'top'
    context.fillStyle = 'rgba(112, 64, 82, 0.48)'
    context.font = '28px Georgia, serif'
    context.fillText(String(page.number), 830, 72)

    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#704052'
    if (page.text) {
      context.font = '600 62px Georgia, serif'
      context.fillText(page.text, 450, 600, 740)
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.userData.backTextures = []
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
  return texture
}

function createCoverTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1200
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не вдалося створити текстуру обкладинки книги.')

  const background = context.createLinearGradient(0, 0, 900, 1200)
  background.addColorStop(0, '#391923')
  background.addColorStop(0.52, '#60273d')
  background.addColorStop(1, '#28161f')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = '#e7c89e'
  context.lineWidth = 5
  context.strokeRect(38, 38, 824, 1124)
  context.strokeStyle = 'rgba(231, 200, 158, 0.42)'
  context.lineWidth = 2
  context.strokeRect(55, 55, 790, 1090)

  context.fillStyle = '#f2d9b2'
  context.textAlign = 'center'
  context.font = '700 32px Georgia, serif'
  context.letterSpacing = '12px'
  context.fillText('КНИГА', 450, 138)
  context.letterSpacing = '0px'

  context.fillStyle = '#fff5e8'
  context.font = '700 62px Georgia, serif'
  context.textBaseline = 'middle'
  context.fillText('20 років — це', 450, 232)
  context.fillText('не так багато', 450, 310)

  const frameX = 135
  const frameY = 405
  const frameWidth = 630
  const frameHeight = 510
  const imageX = frameX + 14
  const imageY = frameY + 14
  const imageWidth = frameWidth - 28
  const imageHeight = frameHeight - 28
  context.fillStyle = '#d7b795'
  context.fillRect(frameX - 12, frameY - 12, frameWidth + 24, frameHeight + 24)
  context.fillStyle = '#f5e9d8'
  context.fillRect(frameX, frameY, frameWidth, frameHeight)

  const placeholder = context.createLinearGradient(frameX, frameY, frameX + frameWidth, frameY + frameHeight)
  placeholder.addColorStop(0, '#d7b6a2')
  placeholder.addColorStop(0.5, '#ebd6c3')
  placeholder.addColorStop(1, '#c6a89b')
  context.fillStyle = placeholder
  context.fillRect(imageX, imageY, imageWidth, imageHeight)

  context.fillStyle = '#e9cda9'
  context.font = '500 24px Georgia, serif'
  context.fillText('ВАЛЕНТИН СТРИКАЛО  ·  2012', 450, 1010)
  context.fillStyle = '#d8b98f'
  context.font = 'italic 23px Georgia, serif'
  context.fillText('Особливе видання', 450, 1070)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const albumCover = new Image()
  albumCover.onload = () => {
    const scale = Math.max(imageWidth / albumCover.width, imageHeight / albumCover.height)
    const sourceWidth = imageWidth / scale
    const sourceHeight = imageHeight / scale
    const sourceX = (albumCover.width - sourceWidth) / 2
    const sourceY = (albumCover.height - sourceHeight) / 2
    context.drawImage(
      albumCover,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      imageX,
      imageY,
      imageWidth,
      imageHeight,
    )
    texture.needsUpdate = true
  }
  albumCover.src = publicAsset('audio/strikalo.jpg')

  return texture
}

function createRadialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Не вдалося створити текстуру м’якої тіні.')
  const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(38, 17, 26, 0.86)')
  gradient.addColorStop(0.4, 'rgba(38, 17, 26, 0.52)')
  gradient.addColorStop(1, 'rgba(52, 23, 35, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

function makeBoxMaterials(
  side: THREE.Material,
  top: THREE.Material,
  bottom: THREE.Material = side,
): THREE.Material[] {
  return [side, side, top, bottom, side, side]
}

export function BookScene({ songRef }: { songRef: RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseRef = useRef<BookPhase>('falling')
  const [phase, setPhase] = useState<BookPhase>('falling')
  const [activeSpread, setActiveSpread] = useState(0)
  const [sceneError, setSceneError] = useState('')

  const celebratePageTurn = () => {
    confetti({
      particleCount: 72,
      spread: 82,
      startVelocity: 36,
      gravity: 0.9,
      ticks: 150,
      origin: { x: 0.5, y: 0.46 },
      colors: ['#ff6b8a', '#ffd166', '#72d6bd', '#fff1df', '#c084fc'],
      disableForReducedMotion: true,
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    scene.background = null
    scene.fog = new THREE.Fog('#f9edf0', 18, 38)

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.set(0, 9.2, 11)
    camera.lookAt(0, 0, 0)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: window.matchMedia('(pointer: fine)').matches,
        powerPreference: 'high-performance',
      })
    } catch (error: unknown) {
      console.error('Не вдалося запустити 3D-сцену книги.', error)
      window.setTimeout(
        () => setSceneError('На цьому пристрої не вдалося запустити 3D-сцену. Спробуй інший браузер.'),
        0,
      )
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.1))
    renderer.shadowMap.enabled = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    scene.add(new THREE.HemisphereLight('#fff8f1', '#a97d82', 2.1))

    const keyLight = new THREE.DirectionalLight('#fff4e8', 3.3)
    keyLight.position.set(-5, 12, 7)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight('#e88cab', 1.4)
    rimLight.position.set(5, 5, -7)
    scene.add(rimLight)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: '#d8bec8', roughness: 0.94 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.015
    scene.add(floor)

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: createRadialTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
    const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial)
    floorShadow.rotation.x = -Math.PI / 2
    floorShadow.position.set(0, 0.035, 0)
    floorShadow.scale.set(0.8, 0.8, 1)
    floorShadow.renderOrder = 1
    scene.add(floorShadow)

    const book = new THREE.Group()
    book.position.set(0, 8.8, 0)
    book.rotation.set(-0.2, -0.1, 0.1)
    scene.add(book)

    const bookSide = new THREE.MeshStandardMaterial({ color: '#4c2633', roughness: 0.66 })
    const pageSide = new THREE.MeshStandardMaterial({ color: '#e8d9c6', roughness: 0.9 })
    const coverTexture = createCoverTexture(renderer)
    const pageTextures = Array.from({ length: PAGE_COUNT }, (_, index) =>
      createPageTexture(renderer, {
        number: index + 1,
        text: '',
        image: pageImageUrls[`../../../page/st${index + 1}.png`],
      }),
    )
    const getPageTexture = (pageNumber: number) => pageTextures[pageNumber - 1]
    const createBackPageTexture = (texture: THREE.Texture) => {
      const backTexture = texture.clone()
      backTexture.center.set(0.5, 0.5)
      backTexture.rotation = Math.PI
      backTexture.needsUpdate = true
      const backTextures = texture.userData.backTextures as THREE.Texture[]
      backTextures.push(backTexture)
      return backTexture
    }
    const createPageFaceMaterial = (texture: THREE.Texture) =>
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_WIDTH, 0.12, BOOK_DEPTH),
      makeBoxMaterials(bookSide, new THREE.MeshStandardMaterial({ color: '#6b3549' })),
    )
    backCover.position.y = -0.08
    backCover.castShadow = true
    backCover.receiveShadow = true
    book.add(backCover)

    const leafThicknesses = Array.from(
      { length: LEAF_COUNT },
      (_, index) => LEAF_THICKNESS + (index === 0 ? PAGE_TWO_EXTRA_THICKNESS : 0),
    )
    const leafThicknessBefore = (index: number) =>
      leafThicknesses.slice(0, index).reduce((total, thickness) => total + thickness, 0)
    const pageLeaves: PageLeaf[] = Array.from({ length: LEAF_COUNT }, (_, index) => {
      const thickness = leafThicknesses[index]
      const group = new THREE.Group()
      group.position.set(
        -BOOK_WIDTH / 2,
        PAGE_SURFACE_Y - leafThicknessBefore(index) - thickness / 2,
        0,
      )
      book.add(group)
      const geometry = new THREE.BoxGeometry(
        BOOK_WIDTH - 0.06,
        thickness,
        BOOK_DEPTH - 0.16,
      )
      const mesh = new THREE.Mesh(
        geometry,
        makeBoxMaterials(
          pageSide,
          createPageFaceMaterial(getPageTexture(2 + index * 2)),
          createPageFaceMaterial(
            createBackPageTexture(getPageTexture(3 + index * 2)),
          ),
        ),
      )
      mesh.position.x = BOOK_WIDTH / 2
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      group.add(mesh)
      return { group, mesh }
    })
    const phantomPage14Texture = getPageTexture(PAGE_COUNT)
    const phantomPage14 = new THREE.Mesh(
      new THREE.BoxGeometry(
        BOOK_WIDTH - 0.06,
        LEAF_THICKNESS,
        BOOK_DEPTH - 0.16,
      ),
      makeBoxMaterials(
        pageSide,
        createPageFaceMaterial(phantomPage14Texture),
        createPageFaceMaterial(createBackPageTexture(phantomPage14Texture)),
      ),
    )
    const totalLeafThickness = leafThicknessBefore(LEAF_COUNT)
    phantomPage14.position.set(
      0,
      PAGE_SURFACE_Y - totalLeafThickness - LEAF_THICKNESS / 2,
      0,
    )
    phantomPage14.castShadow = true
    phantomPage14.receiveShadow = true
    phantomPage14.frustumCulled = false
    book.add(phantomPage14)

    for (const texture of pageTextures) renderer.initTexture(texture)
    renderer.initTexture(coverTexture)

    const binding = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.31, BOOK_DEPTH + 0.06),
      new THREE.MeshStandardMaterial({ color: '#512333', roughness: 0.66 }),
    )
    binding.position.set(-BOOK_WIDTH / 2 + 0.035, 0.015, 0)
    binding.castShadow = true
    book.add(binding)

    const coverHinge = new THREE.Group()
    coverHinge.position.set(-BOOK_WIDTH / 2, 0.155, 0)
    book.add(coverHinge)

    const coverEdge = new THREE.MeshStandardMaterial({ color: '#552539', roughness: 0.58 })
    const coverTop = new THREE.MeshBasicMaterial({ map: coverTexture })
    const coverInside = new THREE.MeshBasicMaterial({ color: '#f7efdf' })
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_WIDTH, 0.11, BOOK_DEPTH),
      makeBoxMaterials(coverEdge, coverTop, coverInside),
    )
    cover.position.set(BOOK_WIDTH / 2, 0.055, 0)
    cover.castShadow = true
    cover.receiveShadow = true
    coverHinge.add(cover)

    const pageOneTexture = getPageTexture(1)
    const pageOneBackTexture = createBackPageTexture(pageOneTexture)
    const firstLeftPage = new THREE.Mesh(
      new THREE.BoxGeometry(BOOK_WIDTH - 0.06, LEAF_THICKNESS * 0.6, BOOK_DEPTH - 0.16),
      makeBoxMaterials(
        pageSide,
        createPageFaceMaterial(pageOneTexture),
        createPageFaceMaterial(pageOneBackTexture),
      ),
    )
    const firstPageMaterials = firstLeftPage.material
    if (Array.isArray(firstPageMaterials)) {
      firstLeftPage.material = [
        ...firstPageMaterials.slice(0, 2),
        firstPageMaterials[3],
        createPageFaceMaterial(createBackPageTexture(pageOneTexture)),
        ...firstPageMaterials.slice(4),
      ]
    }
    firstLeftPage.position.set(BOOK_WIDTH / 2, -LEAF_THICKNESS * 0.3, 0)
    coverHinge.add(firstLeftPage)

    const ringMaterialA = new THREE.MeshBasicMaterial({
      color: '#fff7f2',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ringMaterialB = new THREE.MeshBasicMaterial({
      color: '#e9a1b5',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const rings = [ringMaterialA, ringMaterialB].map((material, index) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.33, 0.42, 72), material)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.025 + index * 0.006
      ring.scale.setScalar(0.01)
      scene.add(ring)
      return ring
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const song = songRef.current
    let animationFrame = 0
    const fallStartedAt = performance.now()
    let impactAt = 0
    let openStartedAt = 0
    let turnStartedAt = 0
    let closeStartedAt = 0
    let closingLeafIndex = -1
    let activeSpreadIndex = 0
    let activeTurningPage: PageLeaf | null = null
    let baseFieldOfView = 36
    let openFieldOfView = 48
    let impactTriggered = false
    let disposed = false

    const updateCameraFov = (fieldOfView: number) => {
      if (Math.abs(camera.fov - fieldOfView) < 0.01) return
      camera.fov = fieldOfView
      camera.updateProjectionMatrix()
    }

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      const aspect = width / height
      camera.aspect = aspect
      baseFieldOfView = aspect < 0.7 ? 34 : aspect > 1.4 ? 28 : 32
      camera.fov = baseFieldOfView
      const cameraTarget = new THREE.Vector3(0, -0.45, 0)
      camera.position.set(0, aspect < 0.7 ? 10.5 : 9.5, aspect < 0.7 ? 8.7 : 9.5)
      camera.lookAt(cameraTarget)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      const scale = aspect < 0.64 ? 0.9 : aspect > 1.35 ? 1.12 : 1
      book.scale.setScalar(scale)
      const cameraDistance = camera.position.distanceTo(cameraTarget)
      const spreadWidth = BOOK_WIDTH * 2 * scale * 1.12
      const spreadHeight = spreadWidth / aspect
      openFieldOfView = THREE.MathUtils.clamp(
        THREE.MathUtils.radToDeg(2 * Math.atan(spreadHeight / (2 * cameraDistance))),
        24,
        72,
      )
    }

    const resetToClosedBook = (time: number) => {
      closeStartedAt = time
      closingLeafIndex = activeSpreadIndex - 1
      phaseRef.current = 'closing'
      setPhase('closing')
      song?.pause()
    }

    const startPageTurn = (time: number) => {
      if (phaseRef.current !== 'opened' || activeSpreadIndex >= LEAF_COUNT) return
      turnStartedAt = time
      activeTurningPage = pageLeaves[activeSpreadIndex]
      activeTurningPage.group.rotation.z = 0
      phaseRef.current = 'turning'
      setPhase('turning')
    }

    const resetPageLeaves = () => {
      pageLeaves.forEach(({ group }, index) => {
        group.visible = true
        group.rotation.z = 0
        group.position.y =
          PAGE_SURFACE_Y - leafThicknessBefore(index) - leafThicknesses[index] / 2
      })
    }

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      let interactive = false
      if (phaseRef.current === 'landed') {
        interactive = raycaster.intersectObjects(
          [cover, ...pageLeaves.map(({ mesh }) => mesh)],
          false,
        ).length > 0
      } else if (phaseRef.current === 'opened') {
        const target =
          activeSpreadIndex === LEAF_COUNT
            ? phantomPage14
            : pageLeaves[activeSpreadIndex].mesh
        interactive = raycaster.intersectObject(target, false).length > 0
      }
      canvas.style.cursor = interactive ? 'pointer' : 'default'
    }

    const handleBookClick = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)

      if (phaseRef.current === 'landed') {
        if (
          raycaster.intersectObjects(
            [cover, ...pageLeaves.map(({ mesh }) => mesh)],
            false,
          ).length === 0
        ) return
        activeSpreadIndex = 0
        setActiveSpread(0)
        resetPageLeaves()
        book.position.x = 0
        phaseRef.current = 'opening'
        openStartedAt = performance.now()
        setPhase('opening')

        if (song) {
          try {
            if (song.readyState >= HTMLMediaElement.HAVE_METADATA) {
              song.currentTime = Math.min(
                SECOND_VERSE_START_SECONDS,
                song.duration || SECOND_VERSE_START_SECONDS,
              )
            }
            void song.play().catch(() => {})
          } catch {
            // Audio is optional; the book interaction must still work.
          }
        }
        return
      }

      if (phaseRef.current !== 'opened') return
      if (activeSpreadIndex === LEAF_COUNT) {
        if (raycaster.intersectObject(phantomPage14, false).length > 0) {
          resetToClosedBook(performance.now())
        }
      } else if (
        raycaster.intersectObject(pageLeaves[activeSpreadIndex].mesh, false).length > 0
      ) {
        startPageTurn(performance.now())
      }
    }

    const animate = (time: number) => {
      if (disposed) return

      if (phaseRef.current === 'falling') {
        const progress = Math.min((time - fallStartedAt) / FALL_DURATION, 1)
        const eased = progress * progress
        book.position.y = 8.8 + (BOOK_LAND_Y - 8.8) * eased
        book.rotation.x = -0.2 * (1 - progress)
        book.rotation.y = -0.1 * (1 - progress)
        book.rotation.z = 0.1 * (1 - progress)
        floorShadow.scale.setScalar(0.8 + progress * 4.6)
        shadowMaterial.opacity = 0.34 + progress * 0.34

        if (progress === 1 && !impactTriggered) {
          impactTriggered = true
          impactAt = time
          book.position.y = BOOK_LAND_Y
          phaseRef.current = 'landed'
          setPhase('landed')
        }
      } else {
        const impactProgress = Math.min((time - impactAt) / 1050, 1)
        const bounce = Math.sin(impactProgress * Math.PI * 3) * Math.exp(-impactProgress * 5)
        book.position.y = BOOK_LAND_Y + Math.max(0, bounce) * 0.22
        floorShadow.scale.setScalar(5.4 + impactProgress * 0.7)
        shadowMaterial.opacity = 0.74 - impactProgress * 0.1

        rings.forEach((ring, index) => {
          const ringProgress = Math.max(0, Math.min((time - impactAt - index * 150) / 850, 1))
          ring.scale.setScalar(0.2 + ringProgress * 4.3)
          ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - ringProgress) * 0.72
        })

        if (phaseRef.current === 'opening') {
          const openProgress = Math.min((time - openStartedAt) / OPEN_DURATION, 1)
          const easedOpen = 1 - Math.pow(1 - openProgress, 4)
          coverHinge.rotation.z = easedOpen * COVER_OPEN_ANGLE
          book.position.x = (BOOK_WIDTH / 2) * easedOpen
          updateCameraFov(baseFieldOfView + (openFieldOfView - baseFieldOfView) * easedOpen)
          if (openProgress === 1) {
            phaseRef.current = 'opened'
            setPhase('opened')
            celebratePageTurn()
          }
        }

        if (phaseRef.current === 'opened' || phaseRef.current === 'turning') {
          book.position.y = BOOK_LAND_Y
          floorShadow.scale.setScalar(6.1)
          shadowMaterial.opacity = 0.64
          updateCameraFov(openFieldOfView)
          rings.forEach((ring) => {
            ;(ring.material as THREE.MeshBasicMaterial).opacity = 0
          })

          if (phaseRef.current === 'turning') {
            const progress = Math.min((time - turnStartedAt) / PAGE_TURN_DURATION, 1)
            const eased = 0.5 - Math.cos(progress * Math.PI) / 2
            const turningPage = activeTurningPage
            if (!turningPage) throw new Error('Не знайдено підготовлений аркуш для перегортання.')
            turningPage.group.rotation.z = Math.PI * eased
            const thickness = leafThicknesses[activeSpreadIndex]
            const depthBefore = leafThicknessBefore(activeSpreadIndex)
            const rightY = PAGE_SURFACE_Y - depthBefore - thickness / 2
            const leftY = PAGE_SURFACE_Y + depthBefore + thickness / 2
            turningPage.group.position.y =
              rightY + (leftY - rightY) * eased + Math.sin(progress * Math.PI) * 0.06
            if (progress === 1) {
              turningPage.group.position.y = leftY
              activeSpreadIndex += 1
              setActiveSpread(activeSpreadIndex)
              activeTurningPage = null
              phaseRef.current = 'opened'
              setPhase('opened')
              celebratePageTurn()
            }
          }
        } else if (phaseRef.current === 'closing') {
          if (closingLeafIndex >= 0) {
            const progress = Math.min((time - closeStartedAt) / CLOSE_PAGE_DURATION, 1)
            const eased = progress * progress * (3 - 2 * progress)
            const leaf = pageLeaves[closingLeafIndex]
            const thickness = leafThicknesses[closingLeafIndex]
            const depthBefore = leafThicknessBefore(closingLeafIndex)
            const leftY = PAGE_SURFACE_Y + depthBefore + thickness / 2
            const rightY = PAGE_SURFACE_Y - depthBefore - thickness / 2
            leaf.group.rotation.z = Math.PI * (1 - eased)
            leaf.group.position.y =
              leftY + (rightY - leftY) * eased + Math.sin(progress * Math.PI) * 0.045

            if (progress === 1) {
              leaf.group.rotation.z = 0
              leaf.group.position.y = rightY
              closingLeafIndex -= 1
              closeStartedAt = time
              if (closingLeafIndex < 0) {
                closeStartedAt = time
              }
            }
          } else {
            const progress = Math.min((time - closeStartedAt) / CLOSE_DURATION, 1)
            const eased = progress * progress * (3 - 2 * progress)
            coverHinge.rotation.z = COVER_OPEN_ANGLE * (1 - eased)
            book.position.x = (BOOK_WIDTH / 2) * (1 - eased)
            updateCameraFov(openFieldOfView + (baseFieldOfView - openFieldOfView) * eased)

            if (progress === 1) {
              resetPageLeaves()
              coverHinge.rotation.z = 0
              book.position.x = 0
              activeSpreadIndex = 0
              setActiveSpread(0)
              phaseRef.current = 'landed'
              setPhase('landed')
            }
          }
        }
      }

      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    renderer.render(scene, camera)
    canvas.addEventListener('pointermove', updatePointer)
    canvas.addEventListener('pointerdown', handleBookClick)
    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', updatePointer)
      canvas.removeEventListener('pointerdown', handleBookClick)
      song?.pause()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) value.dispose()
            }
            material.dispose()
          }
        }
      })
      renderer.dispose()
    }
  }, [songRef])

  return (
    <main className="fixed inset-0 z-[60] isolate h-[100dvh] min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_50%_25%,#f1e2e6_0%,#d8c0ca_54%,#b99aa9_100%)] text-[#562b3d]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="Інтерактивна 3D-книга"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-[max(28px,env(safe-area-inset-top))] text-center">
        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.32em] text-[#a06b7d] sm:text-xs">
          Особливий сюрприз
        </p>
        <h1 className="mx-auto mt-2 max-w-xl text-balance font-serif text-2xl font-semibold leading-tight text-[#572b3e] drop-shadow-sm sm:text-4xl">
          Для тебе — ціла історія
        </h1>
        {phase === 'landed' && (
          <p className="mt-2 text-sm text-[#916575] sm:text-base">Торкнись книги, щоб відкрити</p>
        )}
        {phase === 'opening' && (
          <p className="mt-2 text-sm text-[#916575] sm:text-base">Зазирни всередину…</p>
        )}
        {phase === 'turning' && (
          <p className="mt-2 text-sm text-[#916575] sm:text-base">Перегортаємо сторінку…</p>
        )}
        {phase === 'opened' && activeSpread < LEAF_COUNT && (
          <p className="mt-2 text-sm text-[#916575] sm:text-base">
            Торкнись правої сторінки, щоб перегорнути
          </p>
        )}
        {phase === 'opened' && activeSpread === LEAF_COUNT && (
          <p className="mt-2 text-sm text-[#916575] sm:text-base">
            Торкнись сторінки, щоб закрити книгу
          </p>
        )}
      </div>

      {sceneError && (
        <p
          role="alert"
          className="absolute bottom-8 left-1/2 z-30 w-[min(90%,32rem)] -translate-x-1/2 rounded-2xl bg-white/90 p-4 text-center text-sm text-[#7b3853] shadow-lg"
        >
          {sceneError}
        </p>
      )}

    </main>
  )
}
