import type { TerrainKind } from '../../types/campaign'

export const DEFAULT_BOARD_WIDTH_IN = 44
export const DEFAULT_BOARD_HEIGHT_IN = 90

export const TERRAIN_COLORS: Record<TerrainKind, string> = {
  ruins: '#6b6255',
  scatter: '#5a4a2f',
}

export const TERRAIN_LABELS: Record<TerrainKind, string> = {
  ruins: 'Ruins',
  scatter: 'Scatter',
}

export const DEPLOYMENT_ZONE_COLOR = '#c9a84c'
export const OBJECTIVE_COLOR = '#8b1a1a'
export const LABEL_COLOR = '#e8e0d0'

export const DEFAULT_OBJECTIVE_RADIUS_IN = 1.25
export const DEFAULT_ZONE_SIZE_IN = { width: 12, height: 20 }
export const DEFAULT_TERRAIN_SIZE_IN = { width: 6, height: 6 }

export const MIN_BOARD_SIZE_IN = 10
export const MAX_BOARD_SIZE_IN = 200

export const BOARD_SIZE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: '44×30"', width: 44, height: 30 },
  { label: '44×60"', width: 44, height: 60 },
  { label: '44×90"', width: 44, height: 90 },
  { label: '60×44"', width: 60, height: 44 },
  { label: '72×48"', width: 72, height: 48 },
]
