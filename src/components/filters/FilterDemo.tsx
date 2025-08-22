import React, { useEffect } from 'react'
import { FilterPanel } from './FilterPanel'
import { useDebouncedFilter } from '@/hooks/useDebouncedFilter'
import { useAppDispatch } from '@/stores/dashboardStore'
import { setRawData } from '@/stores/slices/dataSlice'
import { FieldDefinition, DataPoint } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Sample field definitions for the demo
const sampleFields: FieldDefinition[] = [
  {
    name: 'value',
    label: 'Value',
    type: 'number'
  },
  {
    name: 'category',
    label: 'Category',
    type: 'category',
    options: ['cpu', 'memory', 'network', 'disk', 'temperature']
  },
  {
    name: 'source',
    label: 'Source',
    type: 'category',
    options: ['server-1', 'server-2', 'server-3', 'database', 'cache']
  },
  {
    name: 'timestamp',
    label: 'Timestamp',
    type: 'date'
  },
  {
    name: 'metadata.status',
    label: 'Status',
    type: 'category',
    options: ['active', 'inactive', 'warning', 'error']
  }
]

// Generate sample data for testing
const generateSampleData = (count: number): DataPoint[] => {
  const categories = ['cpu', 'memory', 'network', 'disk', 'temperature']
  const sources = ['server-1', 'server-2', 'server-3', 'database', 'cache']
  const statuses = ['active', 'inactive', 'warning', 'error']
  
  return Array.from({ length: count }, (_, i) => ({
    id: `data-${i}`,
    timestamp: new Date(Date.now() - (count - i) * 60000), // 1 minute intervals
    value: Math.random() * 100,
    category: categories[Math.floor(Math.random() * categories.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    metadata: {
      status: statuses[Math.floor(Math.random() * statuses.length)],
      region: 'us-east-1'
    }
  }))
}

export function FilterDemo() {
  const dispatch = useAppDispatch()
  const { isFiltering, filteredDataCount, totalDataCount } = useDebouncedFilter(300)

  // Initialize with sample data
  useEffect(() => {
    const sampleData = generateSampleData(1000)
    dispatch(setRawData(sampleData))
  }, [dispatch])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Filter System Demo</h2>
        <div className="flex items-center gap-2">
          {isFiltering && (
            <Badge variant="outline" className="animate-pulse">
              Filtering...
            </Badge>
          )}
          <Badge variant="secondary">
            {filteredDataCount} / {totalDataCount} records
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filter Panel */}
        <div className="lg:col-span-1">
          <FilterPanel availableFields={sampleFields} />
        </div>

        {/* Results Display */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {filteredDataCount} of {totalDataCount} records</span>
                  {isFiltering && <span>Applying filters...</span>}
                </div>
                
                {filteredDataCount === 0 && !isFiltering && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No records match the current filters</p>
                    <p className="text-xs mt-1">Try adjusting your filter criteria</p>
                  </div>
                )}
                
                {filteredDataCount > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <p>✓ Filters applied successfully</p>
                    <p className="text-xs">
                      Performance: {filteredDataCount < 1000 ? 'Excellent' : 
                                   filteredDataCount < 5000 ? 'Good' : 'Fair'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}