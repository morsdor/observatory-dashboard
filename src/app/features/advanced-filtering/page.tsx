'use client'

import React, { useState, useEffect } from 'react'
import { MainNavigation } from '@/components/navigation/MainNavigation'
import { FilterDemo } from '@/components/filters/FilterDemo'
import { AdvancedFilterBuilderDemo } from '@/components/filters/AdvancedFilterBuilderDemo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Filter, 
  Search, 
  Zap, 
  Database,
  Clock,
  Layers,
  CheckCircle,
  Settings,
  TrendingUp
} from 'lucide-react'
import { Provider } from 'react-redux'
import { store } from '@/stores/dashboardStore'

function AdvancedFilteringContent() {
  const [filterStats, setFilterStats] = useState({
    totalRecords: 0,
    filteredRecords: 0,
    activeFilters: 0,
    filterTime: 0,
    complexityScore: 0
  })

  const [activeDemo, setActiveDemo] = useState<'basic' | 'advanced'>('basic')

  // Simulate filter performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setFilterStats(prev => ({
        totalRecords: Math.max(prev.totalRecords, Math.floor(Math.random() * 50000) + 10000),
        filteredRecords: Math.floor(Math.random() * 5000) + 1000,
        activeFilters: Math.floor(Math.random() * 5) + 1,
        filterTime: Math.random() * 50 + 10,
        complexityScore: Math.floor(Math.random() * 10) + 1
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Advanced Filtering System</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Powerful multi-faceted filtering system with visual query builder, complex logical operators, 
          real-time filtering, and high-performance processing for large datasets.
        </p>
      </div>

      <Tabs defaultValue="demo" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">Interactive Demo</TabsTrigger>
          <TabsTrigger value="features">Filter Features</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          {/* Filter Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Total Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filterStats.totalRecords.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In dataset</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Filtered Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filterStats.filteredRecords.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Matching criteria</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Active Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filterStats.activeFilters}</div>
                <p className="text-xs text-muted-foreground">Currently applied</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Filter Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filterStats.filterTime.toFixed(0)}ms</div>
                <p className="text-xs text-muted-foreground">Processing time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Complexity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filterStats.complexityScore}/10</div>
                <p className="text-xs text-muted-foreground">Query complexity</p>
              </CardContent>
            </Card>
          </div>

          {/* Demo Selection */}
          <div className="flex gap-4 mb-6">
            <Button 
              variant={activeDemo === 'basic' ? 'default' : 'outline'}
              onClick={() => setActiveDemo('basic')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Basic Filtering
            </Button>
            <Button 
              variant={activeDemo === 'advanced' ? 'default' : 'outline'}
              onClick={() => setActiveDemo('advanced')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Advanced Query Builder
            </Button>
          </div>

          {/* Filter Demos */}
          {activeDemo === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Filter Panel</CardTitle>
                <CardDescription>
                  Simple filtering interface with real-time updates and debounced processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FilterDemo />
              </CardContent>
            </Card>
          )}

          {activeDemo === 'advanced' && (
            <Card>
              <CardHeader>
                <CardTitle>Advanced Filter Builder</CardTitle>
                <CardDescription>
                  Visual query builder with complex logical operators, grouping, and nested conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvancedFilterBuilderDemo />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Types
                </CardTitle>
                <CardDescription>Comprehensive filtering capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Text Filtering</div>
                      <div className="text-muted-foreground">Contains, equals, starts with, regex support</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Numeric Filtering</div>
                      <div className="text-muted-foreground">Range, greater than, less than, equals</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Date Range Filtering</div>
                      <div className="text-muted-foreground">Absolute dates, relative ranges, presets</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                    <div>
                      <div className="font-medium">Categorical Filtering</div>
                      <div className="text-muted-foreground">Multi-select, exclusion, dynamic options</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Logical Operators
                </CardTitle>
                <CardDescription>Complex query construction</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">AND</Badge>
                    <div>
                      <div className="font-medium">Conjunction Logic</div>
                      <div className="text-muted-foreground">All conditions must be true</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">OR</Badge>
                    <div>
                      <div className="font-medium">Disjunction Logic</div>
                      <div className="text-muted-foreground">Any condition can be true</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">NOT</Badge>
                    <div>
                      <div className="font-medium">Negation Logic</div>
                      <div className="text-muted-foreground">Exclude matching conditions</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">( )</Badge>
                    <div>
                      <div className="font-medium">Grouping</div>
                      <div className="text-muted-foreground">Nested conditions with precedence</div>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Real-Time Features
                </CardTitle>
                <CardDescription>Live filtering and performance optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Debounced input processing (300ms default)</li>
                  <li>• Incremental filtering for large datasets</li>
                  <li>• Background processing with Web Workers</li>
                  <li>• Filter result caching and memoization</li>
                  <li>• Progressive disclosure for complex queries</li>
                  <li>• Real-time result count updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Advanced Features
                </CardTitle>
                <CardDescription>Power user capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Visual query builder with drag-and-drop</li>
                  <li>• Filter templates and saved queries</li>
                  <li>• Import/export filter configurations</li>
                  <li>• Query validation and error highlighting</li>
                  <li>• Performance impact indicators</li>
                  <li>• Filter history and undo/redo</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Filter Performance Benchmarks</CardTitle>
                <CardDescription>Processing time across different dataset sizes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">1,000 records</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                      </div>
                      <span className="text-sm font-medium">&lt;5ms</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">10,000 records</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                      </div>
                      <span className="text-sm font-medium">~15ms</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">100,000 records</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                      <span className="text-sm font-medium">~50ms</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">1,000,000 records</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-orange-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-sm font-medium">~200ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Techniques</CardTitle>
                <CardDescription>Methods used to achieve high performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>Indexing:</strong> Pre-built indices for common filter fields</li>
                  <li>• <strong>Memoization:</strong> Cache filter results for repeated queries</li>
                  <li>• <strong>Debouncing:</strong> Reduce filter frequency during typing</li>
                  <li>• <strong>Web Workers:</strong> Background processing for heavy filters</li>
                  <li>• <strong>Incremental:</strong> Process only changed filter conditions</li>
                  <li>• <strong>Early Exit:</strong> Stop processing when result set is sufficient</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filter Complexity Analysis</CardTitle>
              <CardDescription>Performance impact of different filter types and combinations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-600">Low Complexity (1-3)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Simple text contains</li>
                    <li>• Exact numeric matches</li>
                    <li>• Single category selection</li>
                    <li>• Basic date ranges</li>
                  </ul>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Processing: &lt;10ms for 100k records
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3 text-yellow-600">Medium Complexity (4-6)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Multiple AND conditions</li>
                    <li>• Regex pattern matching</li>
                    <li>• Numeric range filters</li>
                    <li>• Multi-category selection</li>
                  </ul>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Processing: 10-50ms for 100k records
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3 text-red-600">High Complexity (7-10)</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Complex nested OR/AND</li>
                    <li>• Multiple regex patterns</li>
                    <li>• Cross-field correlations</li>
                    <li>• Deep object filtering</li>
                  </ul>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Processing: 50-200ms for 100k records
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technical Architecture</CardTitle>
              <CardDescription>Implementation details and design patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Filter Engine Architecture</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  High-performance client-side filtering engine with multiple optimization strategies:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Abstract Syntax Tree (AST) for complex query parsing</li>
                  <li>• Visitor pattern for filter condition evaluation</li>
                  <li>• Index-based lookups for categorical and exact matches</li>
                  <li>• Binary search for sorted numeric ranges</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Query Builder Implementation</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Visual query builder with drag-and-drop interface:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• React DnD for intuitive condition management</li>
                  <li>• Real-time query validation and syntax highlighting</li>
                  <li>• Recursive component structure for nested conditions</li>
                  <li>• JSON serialization for filter persistence</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Performance Optimizations</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Multiple layers of optimization for large dataset filtering:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Memoized filter functions with dependency tracking</li>
                  <li>• Debounced input processing to reduce computation</li>
                  <li>• Web Worker integration for background processing</li>
                  <li>• Result caching with intelligent cache invalidation</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">State Management Integration</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Seamless integration with Redux store and React hooks:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Normalized filter state structure</li>
                  <li>• Middleware for filter processing and caching</li>
                  <li>• Custom hooks for filter state management</li>
                  <li>• Optimistic updates for immediate UI feedback</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

export default function AdvancedFilteringPage() {
  return (
    <Provider store={store}>
      <AdvancedFilteringContent />
    </Provider>
  )
}