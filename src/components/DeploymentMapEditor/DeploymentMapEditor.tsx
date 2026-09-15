import { useRef, useState } from 'react'
import type { DeploymentMapData, MapObject } from '../../types/campaign'
import { nanoid } from '../../services/nanoid'
import {
  DEFAULT_BOARD_WIDTH_IN,
  DEFAULT_BOARD_HEIGHT_IN,
  MIN_BOARD_SIZE_IN,
  MAX_BOARD_SIZE_IN,
  BOARD_SIZE_PRESETS,
  TERRAIN_COLORS,
  TERRAIN_LABELS,
  DEPLOYMENT_ZONE_COLOR,
  OBJECTIVE_COLOR,
  LABEL_COLOR,
  DEFAULT_OBJECTIVE_RADIUS_IN,
  DEFAULT_ZONE_SIZE_IN,
  DEFAULT_TERRAIN_SIZE_IN,
} from './mapObjectDefaults'
import { getDefaultMapBackground } from './defaultBackground'
import { flattenSvgToPng, downscaleImage } from './flattenToImage'

type Tool = 'select' | 'deploymentZone' | 'ruins' | 'scatter' | 'objective' | 'label'
type DragMode = 'draw' | 'move' | 'resize'

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

/** 4 corners + 4 edge midpoints, in clockwise order starting top-left — gives 8 handles to freely reshape a zone. */
function polygonFromRect(rect: Rect): Point[] {
  const { x, y, width, height } = rect
  const midX = x + width / 2
  const midY = y + height / 2
  return [
    { x, y },
    { x: midX, y },
    { x: x + width, y },
    { x: x + width, y: midY },
    { x: x + width, y: y + height },
    { x: midX, y: y + height },
    { x, y: y + height },
    { x, y: midY },
  ]
}

const GRID_STEP_IN = 6
const RULER_STEP_IN = 12

interface Props {
  initialData?: DeploymentMapData
  onSave: (result: { image: string; data: DeploymentMapData }) => void
  onClose: () => void
}

export default function DeploymentMapEditor({ initialData, onSave, onClose }: Props) {
  const [boardWidthIn, setBoardWidthIn] = useState(initialData?.boardWidthIn ?? DEFAULT_BOARD_WIDTH_IN)
  const [boardHeightIn, setBoardHeightIn] = useState(initialData?.boardHeightIn ?? DEFAULT_BOARD_HEIGHT_IN)
  // Existing maps keep whatever background they were saved with when resized; only a freshly-generated
  // default background is kept in sync with the board size as the user dials it in.
  const [customBackground, setCustomBackground] = useState(!!initialData?.backgroundImage)
  const [backgroundImage, setBackgroundImage] = useState(
    initialData?.backgroundImage ?? getDefaultMapBackground(boardWidthIn, boardHeightIn)
  )
  const [objects, setObjects] = useState<MapObject[]>(initialData?.objects ?? [])
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ghostRect, setGhostRect] = useState<Rect | null>(null)
  const [saving, setSaving] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; objectStart?: MapObject; vertexIndex?: number } | null>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const selected = objects.find((o) => o.id === selectedId) ?? null

  /** Double-clicking a shape selects it and jumps straight to the Label field for quick renaming. */
  function focusLabelInput() {
    requestAnimationFrame(() => {
      labelInputRef.current?.focus()
      labelInputRef.current?.select()
    })
  }

  function applyBoardSize(width: number, height: number) {
    const w = Number.isFinite(width) ? Math.max(MIN_BOARD_SIZE_IN, Math.min(MAX_BOARD_SIZE_IN, Math.round(width))) : boardWidthIn
    const h = Number.isFinite(height) ? Math.max(MIN_BOARD_SIZE_IN, Math.min(MAX_BOARD_SIZE_IN, Math.round(height))) : boardHeightIn
    setBoardWidthIn(w)
    setBoardHeightIn(h)
    if (!customBackground) setBackgroundImage(getDefaultMapBackground(w, h))
  }

  const gridLinesX: number[] = []
  for (let x = GRID_STEP_IN; x < boardWidthIn; x += GRID_STEP_IN) gridLinesX.push(x)
  const gridLinesY: number[] = []
  for (let y = GRID_STEP_IN; y < boardHeightIn; y += GRID_STEP_IN) gridLinesY.push(y)
  const rulerTicksX: number[] = []
  for (let x = RULER_STEP_IN; x < boardWidthIn; x += RULER_STEP_IN) rulerTicksX.push(x)
  const rulerTicksY: number[] = []
  for (let y = RULER_STEP_IN; y < boardHeightIn; y += RULER_STEP_IN) rulerTicksY.push(y)

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * boardWidthIn
    const y = ((clientY - rect.top) / rect.height) * boardHeightIn
    return { x: Math.max(0, Math.min(boardWidthIn, x)), y: Math.max(0, Math.min(boardHeightIn, y)) }
  }

  function addRectObject(kind: 'ruins' | 'scatter', rect: Rect) {
    const obj: MapObject = {
      id: nanoid(),
      kind: 'terrain',
      shape: 'rect',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: TERRAIN_COLORS[kind],
      label: TERRAIN_LABELS[kind],
      terrainKind: kind,
    }
    setObjects((prev) => [...prev, obj])
    setSelectedId(obj.id)
  }

  /** Deployment zones start as an 8-point polygon (rect corners + edge midpoints) so each point can be dragged independently. */
  function addZoneObject(rect: Rect) {
    const obj: MapObject = {
      id: nanoid(),
      kind: 'deploymentZone',
      shape: 'polygon',
      x: rect.x,
      y: rect.y,
      points: polygonFromRect(rect),
      color: DEPLOYMENT_ZONE_COLOR,
      label: 'Zone',
    }
    setObjects((prev) => [...prev, obj])
    setSelectedId(obj.id)
  }

  function addPointObject(kind: 'objective' | 'label', x: number, y: number) {
    const obj: MapObject =
      kind === 'objective'
        ? {
            id: nanoid(),
            kind: 'objective',
            shape: 'circle',
            x,
            y,
            radius: DEFAULT_OBJECTIVE_RADIUS_IN,
            color: OBJECTIVE_COLOR,
            label: String(objects.filter((o) => o.kind === 'objective').length + 1),
          }
        : {
            id: nanoid(),
            kind: 'label',
            shape: 'rect',
            x,
            y,
            color: LABEL_COLOR,
            label: 'Label',
          }
    setObjects((prev) => [...prev, obj])
    setSelectedId(obj.id)
  }

  function handleBoardPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // Object shapes stopPropagation() on their own pointerdown, so anything that reaches
    // here (including clicks that land on the background image) is a board-level click.
    if (tool === 'select') {
      setSelectedId(null)
      return
    }
    const { x, y } = svgPoint(e.clientX, e.clientY)
    if (tool === 'objective' || tool === 'label') {
      addPointObject(tool, x, y)
      setTool('select')
      return
    }
    dragRef.current = { mode: 'draw', startX: x, startY: y }
    setGhostRect({ x, y, width: 0, height: 0 })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleBoardPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag) return
    const { x, y } = svgPoint(e.clientX, e.clientY)

    if (drag.mode === 'draw') {
      setGhostRect({
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        width: Math.abs(x - drag.startX),
        height: Math.abs(y - drag.startY),
      })
      return
    }

    const start = drag.objectStart
    if (!start || !selectedId) return
    const dx = x - drag.startX
    const dy = y - drag.startY

    setObjects((prev) =>
      prev.map((o) => {
        if (o.id !== selectedId) return o
        if (drag.mode === 'move') {
          if (o.shape === 'polygon' && start.points) {
            const clampedDx = Math.max(-Math.min(...start.points.map((p) => p.x)), Math.min(boardWidthIn - Math.max(...start.points.map((p) => p.x)), dx))
            const clampedDy = Math.max(-Math.min(...start.points.map((p) => p.y)), Math.min(boardHeightIn - Math.max(...start.points.map((p) => p.y)), dy))
            return { ...o, x: start.x + clampedDx, y: start.y + clampedDy, points: start.points.map((p) => ({ x: p.x + clampedDx, y: p.y + clampedDy })) }
          }
          return { ...o, x: start.x + dx, y: start.y + dy }
        }
        if (drag.mode === 'resize') {
          if (o.shape === 'polygon' && start.points && drag.vertexIndex !== undefined) {
            const points = start.points.map((p, i) =>
              i === drag.vertexIndex
                ? { x: Math.max(0, Math.min(boardWidthIn, p.x + dx)), y: Math.max(0, Math.min(boardHeightIn, p.y + dy)) }
                : p
            )
            return { ...o, points }
          }
          if (o.shape === 'circle') {
            const radius = Math.max(0.5, (start.radius ?? DEFAULT_OBJECTIVE_RADIUS_IN) + dx)
            return { ...o, radius }
          }
          const width = Math.max(0.5, (start.width ?? 1) + dx)
          const height = Math.max(0.5, (start.height ?? 1) + dy)
          return { ...o, width, height }
        }
        return o
      })
    )
  }

  function handleBoardPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (drag?.mode === 'draw' && ghostRect && (tool === 'deploymentZone' || tool === 'ruins' || tool === 'scatter')) {
      let rect: Rect
      if (ghostRect.width > 0.5 && ghostRect.height > 0.5) {
        // Real drag — use the drawn rectangle.
        rect = ghostRect
      } else {
        // A plain click (no drag) — place a default-sized shape centered on the click, like the point tools.
        const size = tool === 'deploymentZone' ? DEFAULT_ZONE_SIZE_IN : DEFAULT_TERRAIN_SIZE_IN
        rect = {
          x: Math.max(0, Math.min(boardWidthIn - size.width, drag.startX - size.width / 2)),
          y: Math.max(0, Math.min(boardHeightIn - size.height, drag.startY - size.height / 2)),
          width: size.width,
          height: size.height,
        }
      }
      if (tool === 'deploymentZone') {
        addZoneObject(rect)
      } else {
        addRectObject(tool, rect)
      }
      setTool('select')
    }
    dragRef.current = null
    setGhostRect(null)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function startObjectDrag(e: React.PointerEvent, obj: MapObject, mode: DragMode) {
    e.stopPropagation()
    if (tool !== 'select') return
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setSelectedId(obj.id)
    dragRef.current = { mode, startX: x, startY: y, objectStart: obj }
  }

  function startVertexDrag(e: React.PointerEvent, obj: MapObject, vertexIndex: number) {
    e.stopPropagation()
    if (tool !== 'select') return
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setSelectedId(obj.id)
    dragRef.current = { mode: 'resize', startX: x, startY: y, objectStart: obj, vertexIndex }
  }

  function updateSelected(patch: Partial<MapObject>) {
    if (!selectedId) return
    setObjects((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)))
  }

  function deleteSelected() {
    if (!selectedId) return
    setObjects((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
  }

  async function handleBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const downscaled = await downscaleImage(reader.result as string)
      setBackgroundImage(downscaled)
      setCustomBackground(true)
    }
    reader.readAsDataURL(file)
  }

  function resetBackground() {
    setBackgroundImage(getDefaultMapBackground(boardWidthIn, boardHeightIn))
    setCustomBackground(false)
  }

  async function handleSave() {
    if (!svgRef.current) return
    setSaving(true)
    try {
      const image = await flattenSvgToPng(svgRef.current, boardWidthIn, boardHeightIn)
      onSave({
        image,
        data: { boardWidthIn, boardHeightIn, backgroundImage, objects },
      })
    } finally {
      setSaving(false)
    }
  }

  const tools: { id: Tool; label: string }[] = [
    { id: 'select', label: 'Select' },
    { id: 'deploymentZone', label: 'Deployment Zone' },
    { id: 'ruins', label: 'Ruins' },
    { id: 'scatter', label: 'Scatter' },
    { id: 'objective', label: 'Objective' },
    { id: 'label', label: 'Text Label' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-void-950/95 flex flex-col p-3 sm:p-6 overflow-y-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-display text-xl text-gold tracking-wider">Deployment Map Editor</h2>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost text-xs" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-xs" disabled={saving}>
            {saving ? 'Saving…' : 'Save Map'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-heading tracking-widest uppercase text-parchment-faint">Board Size</span>
        {BOARD_SIZE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyBoardSize(p.width, p.height)}
            className={`text-xs font-heading tracking-widest uppercase px-2.5 py-1 border ${
              boardWidthIn === p.width && boardHeightIn === p.height
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-gold-muted/30 text-parchment-muted'
            }`}
          >
            {p.label}
          </button>
        ))}
        <label className="flex items-center gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
          W
          <input
            type="number"
            min={MIN_BOARD_SIZE_IN}
            max={MAX_BOARD_SIZE_IN}
            value={boardWidthIn}
            onChange={(e) => applyBoardSize(e.target.valueAsNumber, boardHeightIn)}
            className="w-16 bg-void-900 border border-gold-muted/30 text-parchment text-sm px-1.5 py-1 font-body"
          />
        </label>
        <label className="flex items-center gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
          H
          <input
            type="number"
            min={MIN_BOARD_SIZE_IN}
            max={MAX_BOARD_SIZE_IN}
            value={boardHeightIn}
            onChange={(e) => applyBoardSize(boardWidthIn, e.target.valueAsNumber)}
            className="w-16 bg-void-900 border border-gold-muted/30 text-parchment text-sm px-1.5 py-1 font-body"
          />
        </label>
        <span className="text-[10px] text-parchment-faint">inches</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`text-xs font-heading tracking-widest uppercase px-3 py-1.5 border ${
              tool === t.id ? 'border-gold bg-gold/10 text-gold' : 'border-gold-muted/30 text-parchment-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
        <label className="text-xs font-heading tracking-widest uppercase px-3 py-1.5 border border-gold-muted/30 text-parchment-muted cursor-pointer">
          Upload Background
          <input type="file" accept="image/*" onChange={handleBackgroundUpload} className="hidden" />
        </label>
        <button onClick={resetBackground} className="text-xs font-heading tracking-widest uppercase px-3 py-1.5 border border-gold-muted/30 text-parchment-muted">
          Reset Background
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="flex-1 flex items-start justify-center overflow-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${boardWidthIn} ${boardHeightIn}`}
            className="border border-gold-muted/40 bg-void-900 touch-none select-none"
            style={{ width: `min(100%, ${(boardWidthIn / boardHeightIn) * 70}vh)`, height: 'auto', aspectRatio: `${boardWidthIn} / ${boardHeightIn}` }}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
          >
            <image href={backgroundImage} x={0} y={0} width={boardWidthIn} height={boardHeightIn} preserveAspectRatio="none" />

            {objects.map((o) => {
              const isSelected = o.id === selectedId
              if (o.shape === 'circle') {
                return (
                  <g key={o.id} onPointerDown={(e) => startObjectDrag(e, o, 'move')} onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(o.id); focusLabelInput() }}>
                    <circle cx={o.x} cy={o.y} r={o.radius ?? 1} fill={o.color} fillOpacity={0.75} stroke={isSelected ? '#e8c97a' : o.color} strokeWidth={isSelected ? 0.15 : 0.05} />
                    {o.label && (
                      <text x={o.x} y={o.y} textAnchor="middle" dominantBaseline="middle" fontSize={o.radius ? o.radius * 0.9 : 1} fill="#05050a" fontWeight="bold">
                        {o.label}
                      </text>
                    )}
                    {isSelected && (
                      <circle
                        cx={o.x + (o.radius ?? 1)}
                        cy={o.y}
                        r={0.6}
                        fill="#e8c97a"
                        onPointerDown={(e) => startObjectDrag(e, o, 'resize')}
                        style={{ cursor: 'ew-resize' }}
                      />
                    )}
                  </g>
                )
              }

              if (o.shape === 'polygon') {
                const points = o.points ?? []
                const xs = points.map((p) => p.x)
                const ys = points.map((p) => p.y)
                const cx = xs.reduce((s, x) => s + x, 0) / (xs.length || 1)
                const cy = ys.reduce((s, y) => s + y, 0) / (ys.length || 1)
                const boundW = xs.length ? Math.max(...xs) - Math.min(...xs) : 1
                const boundH = ys.length ? Math.max(...ys) - Math.min(...ys) : 1
                const fontSize = Math.max(1.6, Math.min(boundW, boundH) * 0.18 + 0.6)
                const text = o.label || ''
                const chipWidth = text.length * fontSize * 0.62 + 1
                const chipHeight = fontSize + 0.8
                return (
                  <g key={o.id}>
                    <polygon
                      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill={o.color}
                      fillOpacity={0.25}
                      stroke={isSelected ? '#e8c97a' : o.color}
                      strokeWidth={isSelected ? 0.15 : 0.05}
                      onPointerDown={(e) => startObjectDrag(e, o, 'move')}
                      onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(o.id); focusLabelInput() }}
                      style={{ cursor: 'move' }}
                    />
                    {text && (
                      <g pointerEvents="none">
                        <rect x={cx - chipWidth / 2} y={cy - chipHeight / 2} width={chipWidth} height={chipHeight} fill="#05050a" fillOpacity={0.55} />
                        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fill="#e8e0d0">
                          {text}
                        </text>
                      </g>
                    )}
                    {isSelected &&
                      points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={0.6}
                          fill="#e8c97a"
                          onPointerDown={(e) => startVertexDrag(e, o, i)}
                          style={{ cursor: 'move' }}
                        />
                      ))}
                  </g>
                )
              }

              if (o.kind === 'label') {
                const text = o.label || 'Label'
                const fontSize = 2.6
                const chipWidth = text.length * fontSize * 0.62 + 1
                const chipHeight = fontSize + 0.8
                return (
                  <g key={o.id} onPointerDown={(e) => startObjectDrag(e, o, 'move')} onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(o.id); focusLabelInput() }} style={{ cursor: 'move' }}>
                    <rect
                      x={o.x - 0.5}
                      y={o.y - chipHeight + 0.6}
                      width={chipWidth}
                      height={chipHeight}
                      fill="#05050a"
                      fillOpacity={0.65}
                      stroke={isSelected ? '#e8c97a' : 'none'}
                      strokeWidth={isSelected ? 0.15 : 0}
                    />
                    <text x={o.x} y={o.y} fontSize={fontSize} fill={o.color} fontFamily="Cinzel, serif">
                      {text}
                    </text>
                  </g>
                )
              }

              const width = o.width ?? 1
              const height = o.height ?? 1
              return (
                <g key={o.id}>
                  <rect
                    x={o.x}
                    y={o.y}
                    width={width}
                    height={height}
                    fill={o.color}
                    fillOpacity={o.kind === 'deploymentZone' ? 0.25 : 0.6}
                    stroke={isSelected ? '#e8c97a' : o.color}
                    strokeWidth={isSelected ? 0.15 : 0.05}
                    onPointerDown={(e) => startObjectDrag(e, o, 'move')}
                    onDoubleClick={(e) => { e.stopPropagation(); setSelectedId(o.id); focusLabelInput() }}
                    style={{ cursor: 'move' }}
                  />
                  {o.label && (
                    <text x={o.x + width / 2} y={o.y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={Math.min(width, height) * 0.18 + 0.6} fill="#e8e0d0">
                      {o.label}
                    </text>
                  )}
                  {isSelected && (
                    <rect
                      x={o.x + width - 0.6}
                      y={o.y + height - 0.6}
                      width={1.2}
                      height={1.2}
                      fill="#e8c97a"
                      onPointerDown={(e) => startObjectDrag(e, o, 'resize')}
                      style={{ cursor: 'nwse-resize' }}
                    />
                  )}
                </g>
              )
            })}

            {ghostRect && (tool === 'deploymentZone' || tool === 'ruins' || tool === 'scatter') && (
              <rect
                x={ghostRect.x}
                y={ghostRect.y}
                width={ghostRect.width}
                height={ghostRect.height}
                fill="none"
                stroke="#e8c97a"
                strokeDasharray="0.4"
                strokeWidth={0.15}
              />
            )}

            {/* Measurement overlay: 6in grid + 12in ruler ticks along the top/left edges, so scale is visible on-board and in the exported image. */}
            <g pointerEvents="none">
              {gridLinesX.map((x) => (
                <line key={`gx-${x}`} x1={x} y1={0} x2={x} y2={boardHeightIn} stroke="#e8c97a" strokeOpacity={0.12} strokeWidth={0.06} />
              ))}
              {gridLinesY.map((y) => (
                <line key={`gy-${y}`} x1={0} y1={y} x2={boardWidthIn} y2={y} stroke="#e8c97a" strokeOpacity={0.12} strokeWidth={0.06} />
              ))}
              {rulerTicksX.map((x) => (
                <g key={`tx-${x}`}>
                  <line x1={x} y1={0} x2={x} y2={1.2} stroke="#e8c97a" strokeOpacity={0.6} strokeWidth={0.1} />
                  <rect x={x - 1.8} y={1.3} width={3.6} height={1.8} fill="#05050a" fillOpacity={0.55} />
                  <text x={x} y={2.65} fontSize={1.5} fill="#e8c97a" textAnchor="middle">{x}&quot;</text>
                </g>
              ))}
              {rulerTicksY.map((y) => (
                <g key={`ty-${y}`}>
                  <line x1={0} y1={y} x2={1.2} y2={y} stroke="#e8c97a" strokeOpacity={0.6} strokeWidth={0.1} />
                  <rect x={1.3} y={y - 0.9} width={3.4} height={1.8} fill="#05050a" fillOpacity={0.55} />
                  <text x={1.5} y={y + 0.55} fontSize={1.5} fill="#e8c97a">{y}&quot;</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        <div className="w-full lg:w-64 shrink-0 card">
          <p className="card-header">Properties</p>
          {!selected && <p className="font-body text-xs text-parchment-faint">Select an object to edit it, or pick a tool above and draw/click on the board.</p>}
          {selected && (
            <div className="flex flex-col gap-3 pt-2">
              <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
                Label
                <input
                  ref={labelInputRef}
                  type="text"
                  value={selected.label ?? ''}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                  className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
                Color
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="bg-void-900 border border-gold-muted/30 h-9 w-full cursor-pointer"
                />
              </label>
              <button onClick={deleteSelected} className="btn-ghost text-xs text-blood-light border-blood/40">
                Delete Object
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
