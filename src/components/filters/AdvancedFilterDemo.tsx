import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Filter, Clock, Database, BarChart3 } from 'lucide-react'
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder'
import { DateRangeFilter } from './DateRangeFilter'
import { CategoricalFilter } from './CategoricalFilter'
import { useAdvancedFilter } from '@/hooks/useAdvancedFilter'
import { useAppSelector } from '@/stores/dashboardStore'
import { FieldDefinition } from '@/types'

export function AdvancedFilterDemo() {
  const { isFiltering, filteredDataCount, totalDataCount, getFilterStats, filterPerformance } = useAdvancedFilter()
  const rawData = useAppSelector((state) => state.data.rawData)
  
  // Define available fields for filtering
  const availableFields: FieldDefinition[] = useMemo(() => [
    { name: 'category', label: 'Category', type: 'category', options: ['cpu', 'memory', 'network', 'disk', 'database'] },
    { name: 'source', label: 'Source', type: 'category', options: ['server-1', 'server-2', 'server-3', 'server-4', 'server-5'] },
    { name: 'value', label: 'Value', type: 'number' },
    { name: 'timestamp', label: 'Timestamp', type: 'date' },
    { name: 'metadata.region', label: 'Region', type: 'category', options: ['us-east', 'us-west', 'eu-west', 'ap-south'] },
    { name: 'metadata.priority', label: 'Priority', type: 'category', options: ['low', 'normal', 'high', 'critical'] },
    { name: 'metadata.environment', label: 'Environment', type: 'category', options: ['development', 'staging', 'production'] }
  ], [])

  // Extract unique values for categorical filters
  const getUniqueValues = (field: string): string[] => {
    const values = new Set<string>()
    rawData.forEach(item => {
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], item as any)
        : (item as any)[field]
      
      if (value !== null && value !== undefined) {
        values.add(String(value))
      }
    })
    return Array.from(values).sort()
  }

  const filterStats = getFilterStats()

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Filter Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredDataCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Filtered Results</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalDataCount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filterPerformance.filterTime.toFixed(1)}ms
              </div>
              <div className="text-sm text-muted-foreground">Filter Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filterStats.cacheSize}
              </div>
              <div className="text-sm text-muted-foreground">Cached Queries</div>
            </div>
          </div>
          
          {isFiltering && (
            <div className="mt-4 flex items-center justify-center">
              <Badge variant="secondary" className="animate-pulse">
                <Filter className="h-3 w-3 mr-1" />
                Filtering...
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Interface */}
      <Tabs defaultValue="builder" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="builder">
            <Filter className="h-4 w-4 mr-2" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="date">
            <Clock className="h-4 w-4 mr-2" />
            Date Range
          </TabsTrigger>
          <TabsTrigger value="category">
            <Database className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4">
          <AdvancedFilterBuilder availableFields={availableFields} />
        </TabsContent>

        <TabsContent value="date" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateRangeFilter
              field="timestamp"
              label="Data Timestamp"
            />
          </div>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CategoricalFilter
              field={availableFields.find(f => f.name === 'category')!}
              availableValues={getUniqueValues('category')}
            />
            <CategoricalFilter
              field={availableFields.find(f => f.name === 'source')!}
              availableValues={getUniqueValues('source')}
            />
            <CategoricalFilter
              field={availableFields.find(f => f.name === 'metadata.region')!}
              availableValues={getUniqueValues('metadata.region')}
            />
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Index Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Data Size:</span>
                  <Badge variant="outline">{filterStats.dataSize.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Indexed Fields:</span>
                  <Badge variant="outline">{filterStats.indexSize}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache Size:</span>
                  <Badge variant="outline">{filterStats.cacheSize}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Indexed Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filterStats.indexedFields.map(field => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Last Filter Time:</span>
                  <span className="font-mono">{filterPerformance.filterTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Result Count:</span>
                  <span className="font-mono">{filterPerformance.resultCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Count:</span>
                  <span className="font-mono">{filterPerformance.totalCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Filter Efficiency:</span>
                  <span className="font-mono">
                    {filterPerformance.totalCount > 0 
                      ? ((filterPerformance.resultCount / filterPerformance.totalCount) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}