'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ChartConfiguration, ChartSyncConfiguration, ChartType, DEFAULT_CHART_CONFIG, DEFAULT_SYNC_CONFIG } from './ChartTypes'

export interface ChartConfigPanelProps {
  config: ChartConfiguration
  syncConfig: ChartSyncConfiguration
  onConfigChange: (config: ChartConfiguration) => void
  onSyncConfigChange: (syncConfig: ChartSyncConfiguration) => void
  className?: string
}

export const ChartConfigPanel: React.FC<ChartConfigPanelProps> = ({
  config,
  syncConfig,
  onConfigChange,
  onSyncConfigChange,
  className = ''
}) => {
  const [localConfig, setLocalConfig] = useState<ChartConfiguration>(config)
  const [localSyncConfig, setLocalSyncConfig] = useState<ChartSyncConfiguration>(syncConfig)

  const handleConfigUpdate = (updates: Partial<ChartConfiguration>) => {
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    onConfigChange(newConfig)
  }

  const handleSyncConfigUpdate = (updates: Partial<ChartSyncConfiguration>) => {
    const newSyncConfig = { ...localSyncConfig, ...updates }
    setLocalSyncConfig(newSyncConfig)
    onSyncConfigChange(newSyncConfig)
  }

  const handleStyleUpdate = (updates: Partial<ChartConfiguration['style']>) => {
    handleConfigUpdate({
      style: { ...localConfig.style, ...updates }
    })
  }

  const handleColorsUpdate = (updates: Partial<ChartConfiguration['colors']>) => {
    handleConfigUpdate({
      colors: { ...localConfig.colors, ...updates }
    })
  }

  const handleAggregationUpdate = (updates: Partial<ChartConfiguration['aggregation']>) => {
    handleConfigUpdate({
      aggregation: { ...localConfig.aggregation, ...updates }
    })
  }

  const handleDownsamplingUpdate = (updates: Partial<ChartConfiguration['downsampling']>) => {
    handleConfigUpdate({
      downsampling: { ...localConfig.downsampling, ...updates }
    })
  }

  const resetToDefaults = () => {
    setLocalConfig(DEFAULT_CHART_CONFIG)
    setLocalSyncConfig(DEFAULT_SYNC_CONFIG)
    onConfigChange(DEFAULT_CHART_CONFIG)
    onSyncConfigChange(DEFAULT_SYNC_CONFIG)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Chart Configuration
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Chart Type */}
        <div className="space-y-2">
          <Label htmlFor="chart-type">Chart Type</Label>
          <Select
            value={localConfig.type}
            onValueChange={(value: ChartType) => handleConfigUpdate({ type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="scatter">Scatter Plot</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Colors */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Colors</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-xs">Primary</Label>
              <Input
                id="primary-color"
                type="color"
                value={localConfig.colors.primary}
                onChange={(e) => handleColorsUpdate({ primary: e.target.value })}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-xs">Secondary</Label>
              <Input
                id="secondary-color"
                type="color"
                value={localConfig.colors.secondary || '#60a5fa'}
                onChange={(e) => handleColorsUpdate({ secondary: e.target.value })}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fill-color" className="text-xs">Fill</Label>
              <Input
                id="fill-color"
                type="color"
                value={localConfig.colors.fill?.replace(/[0-9a-f]{2}$/i, '') || '#3b82f6'}
                onChange={(e) => handleColorsUpdate({ fill: e.target.value + '40' })}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stroke-color" className="text-xs">Stroke</Label>
              <Input
                id="stroke-color"
                type="color"
                value={localConfig.colors.stroke || localConfig.colors.primary}
                onChange={(e) => handleColorsUpdate({ stroke: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Style Settings */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Style</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="line-width" className="text-xs">Line Width</Label>
              <Input
                id="line-width"
                type="number"
                min="1"
                max="10"
                value={localConfig.style.lineWidth || 2}
                onChange={(e) => handleStyleUpdate({ lineWidth: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="point-radius" className="text-xs">Point Radius</Label>
              <Input
                id="point-radius"
                type="number"
                min="1"
                max="10"
                value={localConfig.style.pointRadius || 3}
                onChange={(e) => handleStyleUpdate({ pointRadius: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fill-opacity" className="text-xs">Fill Opacity</Label>
              <Input
                id="fill-opacity"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localConfig.style.fillOpacity || 0.3}
                onChange={(e) => handleStyleUpdate({ fillOpacity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stroke-opacity" className="text-xs">Stroke Opacity</Label>
              <Input
                id="stroke-opacity"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={localConfig.style.strokeOpacity || 1}
                onChange={(e) => handleStyleUpdate({ strokeOpacity: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Processing */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Data Processing</Label>
          
          {/* Aggregation */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aggregation-enabled"
                checked={localConfig.aggregation?.enabled || false}
                onCheckedChange={(checked) => 
                  handleAggregationUpdate({ enabled: checked as boolean })
                }
              />
              <Label htmlFor="aggregation-enabled" className="text-sm">Enable Aggregation</Label>
            </div>
            
            {localConfig.aggregation?.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="aggregation-method" className="text-xs">Method</Label>
                  <Select
                    value={localConfig.aggregation.method}
                    onValueChange={(value: 'average' | 'sum' | 'min' | 'max' | 'count') => 
                      handleAggregationUpdate({ method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aggregation-interval" className="text-xs">Interval (ms)</Label>
                  <Input
                    id="aggregation-interval"
                    type="number"
                    min="1000"
                    step="1000"
                    value={localConfig.aggregation.interval}
                    onChange={(e) => handleAggregationUpdate({ interval: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Downsampling */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="downsampling-enabled"
                checked={localConfig.downsampling?.enabled || false}
                onCheckedChange={(checked) => 
                  handleDownsamplingUpdate({ enabled: checked as boolean })
                }
              />
              <Label htmlFor="downsampling-enabled" className="text-sm">Enable Downsampling</Label>
            </div>
            
            {localConfig.downsampling?.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="downsampling-algorithm" className="text-xs">Algorithm</Label>
                  <Select
                    value={localConfig.downsampling.algorithm}
                    onValueChange={(value: 'lttb' | 'average' | 'min-max') => 
                      handleDownsamplingUpdate({ algorithm: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lttb">LTTB (Recommended)</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="min-max">Min-Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-points" className="text-xs">Max Points</Label>
                  <Input
                    id="max-points"
                    type="number"
                    min="100"
                    step="100"
                    value={localConfig.downsampling.maxPoints}
                    onChange={(e) => handleDownsamplingUpdate({ maxPoints: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Synchronization */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Chart Synchronization</Label>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-enabled"
                checked={localSyncConfig.enabled}
                onCheckedChange={(checked) => 
                  handleSyncConfigUpdate({ enabled: checked as boolean })
                }
              />
              <Label htmlFor="sync-enabled" className="text-sm">Enable Synchronization</Label>
            </div>
            
            {localSyncConfig.enabled && (
              <div className="space-y-3 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="group-id" className="text-xs">Group ID</Label>
                  <Input
                    id="group-id"
                    placeholder="Enter group ID"
                    value={localSyncConfig.groupId || ''}
                    onChange={(e) => handleSyncConfigUpdate({ groupId: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-zoom"
                      checked={localSyncConfig.syncZoom}
                      onCheckedChange={(checked) => 
                        handleSyncConfigUpdate({ syncZoom: checked as boolean })
                      }
                    />
                    <Label htmlFor="sync-zoom" className="text-xs">Sync Zoom</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-pan"
                      checked={localSyncConfig.syncPan}
                      onCheckedChange={(checked) => 
                        handleSyncConfigUpdate({ syncPan: checked as boolean })
                      }
                    />
                    <Label htmlFor="sync-pan" className="text-xs">Sync Pan</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-crosshair"
                      checked={localSyncConfig.syncCrosshair}
                      onCheckedChange={(checked) => 
                        handleSyncConfigUpdate({ syncCrosshair: checked as boolean })
                      }
                    />
                    <Label htmlFor="sync-crosshair" className="text-xs">Sync Crosshair</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-selection"
                      checked={localSyncConfig.syncSelection}
                      onCheckedChange={(checked) => 
                        handleSyncConfigUpdate({ syncSelection: checked as boolean })
                      }
                    />
                    <Label htmlFor="sync-selection" className="text-xs">Sync Selection</Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChartConfigPanel