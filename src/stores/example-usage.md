# Redux Store Usage Examples

## Setup

First, wrap your app with the StoreProvider:

```tsx
// app/layout.tsx or pages/_app.tsx
import { StoreProvider } from '@/stores'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
```

## Using the Store in Components

### Option 1: Using the compatibility hook (same API as Zustand)

```tsx
import { useDashboardStore } from '@/stores'

function DataComponent() {
  const store = useDashboardStore()
  
  // Access state
  const rawData = store.rawData
  const isLoading = store.isLoading
  
  // Use actions
  const handleAddData = () => {
    store.addDataPoints([
      {
        id: '1',
        timestamp: new Date(),
        value: 100,
        category: 'cpu',
        source: 'server-1',
        metadata: {}
      }
    ])
  }
  
  return (
    <div>
      <p>Data points: {rawData.length}</p>
      <button onClick={handleAddData}>Add Data</button>
    </div>
  )
}
```

### Option 2: Using Redux hooks directly (recommended for new code)

```tsx
import { useAppSelector, useAppDispatch, addDataPoints, setLoading } from '@/stores'

function DataComponent() {
  const dispatch = useAppDispatch()
  
  // Access state with selectors
  const rawData = useAppSelector(state => state.data.rawData)
  const isLoading = useAppSelector(state => state.ui.isLoading)
  
  // Dispatch actions
  const handleAddData = () => {
    dispatch(addDataPoints([
      {
        id: '1',
        timestamp: new Date(),
        value: 100,
        category: 'cpu',
        source: 'server-1',
        metadata: {}
      }
    ]))
  }
  
  const handleSetLoading = (loading: boolean) => {
    dispatch(setLoading(loading))
  }
  
  return (
    <div>
      <p>Data points: {rawData.length}</p>
      <button onClick={handleAddData}>Add Data</button>
      <button onClick={() => handleSetLoading(!isLoading)}>
        Toggle Loading
      </button>
    </div>
  )
}
```

### Option 3: Using the provided selector hooks

```tsx
import { 
  useRawData, 
  useFilteredData, 
  useConnectionStatus,
  useAppDispatch,
  addDataPoints,
  setConnectionStatus
} from '@/stores'

function DashboardComponent() {
  const dispatch = useAppDispatch()
  const rawData = useRawData()
  const filteredData = useFilteredData()
  const connectionStatus = useConnectionStatus()
  
  const handleConnect = () => {
    dispatch(setConnectionStatus('connecting'))
    // Simulate connection
    setTimeout(() => {
      dispatch(setConnectionStatus('connected'))
    }, 1000)
  }
  
  return (
    <div>
      <p>Connection: {connectionStatus}</p>
      <p>Raw data: {rawData.length} points</p>
      <p>Filtered data: {filteredData.length} points</p>
      <button onClick={handleConnect}>Connect</button>
    </div>
  )
}
```

## Advanced Usage

### Filtering Data

```tsx
import { 
  useAppDispatch, 
  addFilterCondition, 
  updateFilterCriteria,
  useFilteredData 
} from '@/stores'

function FilterComponent() {
  const dispatch = useAppDispatch()
  const filteredData = useFilteredData()
  
  const addCpuFilter = () => {
    dispatch(addFilterCondition({
      id: 'cpu-filter',
      field: 'category',
      operator: 'eq',
      value: 'cpu'
    }))
  }
  
  const addSortByValue = () => {
    dispatch(updateFilterCriteria({
      conditions: [],
      grouping: [],
      sortBy: { field: 'value', direction: 'desc' }
    }))
  }
  
  return (
    <div>
      <p>Filtered results: {filteredData.length}</p>
      <button onClick={addCpuFilter}>Filter CPU only</button>
      <button onClick={addSortByValue}>Sort by value</button>
    </div>
  )
}
```

### Performance Monitoring

```tsx
import { usePerformanceMetrics, useAppDispatch, updateMetrics } from '@/stores'

function PerformanceMonitor() {
  const dispatch = useAppDispatch()
  const metrics = usePerformanceMetrics()
  
  const updateFPS = () => {
    dispatch(updateMetrics({ fps: 45 }))
  }
  
  return (
    <div>
      <p>FPS: {metrics.fps}</p>
      <p>Memory: {metrics.memoryUsage}MB</p>
      <p>Filter Time: {metrics.filterTime}ms</p>
      <button onClick={updateFPS}>Update FPS</button>
    </div>
  )
}
```

## Migration from Zustand

The compatibility layer ensures that existing code using the Zustand API will continue to work without changes. However, for new code, it's recommended to use the Redux hooks directly for better performance and debugging capabilities.

### Before (Zustand)
```tsx
const store = useDashboardStore()
store.addDataPoints(data)
```

### After (Redux - both work)
```tsx
// Option 1: Compatibility (no changes needed)
const store = useDashboardStore()
store.addDataPoints(data)

// Option 2: Redux way (recommended for new code)
const dispatch = useAppDispatch()
dispatch(addDataPoints(data))
```