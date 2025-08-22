export type ChartType = 'line' | 'area' | 'scatter' | 'bar'

export interface ChartConfiguration {
  type: ChartType
  colors: {
    primary: string
    secondary?: string
    fill?: string
    stroke?: string
  }
  style: {
    lineWidth?: number
    pointRadius?: number
    fillOpacity?: number
    strokeOpacity?: number
  }
  aggregation?: {
    enabled: boolean
    method: 'average' | 'sum' | 'min' | 'max' | 'count'
    interval: number // in milliseconds
  }
  downsampling?: {
    enabled: boolean
    maxPoints: number
    algorithm: 'lttb' | 'average' | 'min-max'
  }
}

export interface ChartSyncConfiguration {
  enabled: boolean
  syncZoom: boolean
  syncPan: boolean
  syncCrosshair: boolean
  syncSelection: boolean
  groupId?: string
}

export const DEFAULT_CHART_CONFIG: ChartConfiguration = {
  type: 'line',
  colors: {
    primary: '#3b82f6',
    secondary: '#60a5fa',
    fill: '#3b82f620',
    stroke: '#3b82f6'
  },
  style: {
    lineWidth: 2,
    pointRadius: 3,
    fillOpacity: 0.3,
    strokeOpacity: 1
  },
  aggregation: {
    enabled: false,
    method: 'average',
    interval: 60000 // 1 minute
  },
  downsampling: {
    enabled: true,
    maxPoints: 1000,
    algorithm: 'lttb'
  }
}

export const DEFAULT_SYNC_CONFIG: ChartSyncConfiguration = {
  enabled: false,
  syncZoom: true,
  syncPan: true,
  syncCrosshair: true,
  syncSelection: false
}