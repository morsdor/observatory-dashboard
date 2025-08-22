import React from 'react'
import { AdvancedFilterBuilder } from './AdvancedFilterBuilder'
import { FieldDefinition } from '@/types'

const mockFields: FieldDefinition[] = [
  { name: 'category', label: 'Category', type: 'category', options: ['A', 'B', 'C'] },
  { name: 'value', label: 'Value', type: 'number' },
  { name: 'timestamp', label: 'Timestamp', type: 'date' },
  { name: 'source', label: 'Source', type: 'string' },
  { name: 'active', label: 'Active', type: 'boolean' },
  { name: 'priority', label: 'Priority', type: 'category', options: ['high', 'medium', 'low'] },
  { name: 'region', label: 'Region', type: 'category', options: ['us-east', 'us-west', 'eu-west'] }
]

export function AdvancedFilterBuilderDemo() {
  const handleValidationChange = (isValid: boolean, errors: string[]) => {
    console.log('Validation changed:', { isValid, errors })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Advanced Filter Builder Demo</h1>
      
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          This demo showcases the Visual Filter Builder Interface with:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Dynamic filter condition builder UI</li>
            <li>Drag-and-drop filter grouping functionality</li>
            <li>Filter condition validation and error handling</li>
            <li>Filter export/import functionality</li>
            <li>Support for complex logical operations (AND/OR)</li>
            <li>Multiple field types (string, number, date, boolean, category)</li>
          </ul>
        </div>
        
        <AdvancedFilterBuilder 
          availableFields={mockFields}
          onValidationChange={handleValidationChange}
        />
        
        <div className="text-xs text-muted-foreground mt-4">
          <strong>Instructions:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Select a field from the dropdown and click "Condition" to add a filter</li>
            <li>Click "Group" to create logical groupings</li>
            <li>Drag conditions between groups to reorganize</li>
            <li>Use Export/Import to save and load filter configurations</li>
            <li>Watch for validation errors in real-time</li>
          </ol>
        </div>
      </div>
    </div>
  )
}