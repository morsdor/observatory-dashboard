import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, X } from 'lucide-react'
import { FilterCondition } from '@/types'
import { useDateRangeFilter } from '@/hooks/useAdvancedFilter'
import { useAppDispatch } from '@/stores/dashboardStore'
import { addFilterCondition } from '@/stores/slices/filterSlice'

interface DateRangeFilterProps {
  field: string
  label: string
  onFilterChange?: (condition: FilterCondition) => void
  className?: string
}

type RelativeDateOption = 'last_hour' | 'last_day' | 'last_week' | 'last_month' | 'custom'

export function DateRangeFilter({ field, label, onFilterChange, className }: DateRangeFilterProps) {
  const dispatch = useAppDispatch()
  const { createDateRangeFilter, createRelativeDateFilter } = useDateRangeFilter()
  
  const [selectedOption, setSelectedOption] = useState<RelativeDateOption>('last_day')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const handleApplyFilter = useCallback(() => {
    let condition: FilterCondition

    if (selectedOption === 'custom') {
      if (!startDate || !endDate) return

      const start = new Date(`${startDate}${startTime ? `T${startTime}` : 'T00:00:00'}`)
      const end = new Date(`${endDate}${endTime ? `T${endTime}` : 'T23:59:59'}`)
      
      condition = createDateRangeFilter(field, start, end)
    } else {
      condition = createRelativeDateFilter(field, selectedOption)
    }

    if (onFilterChange) {
      onFilterChange(condition)
    } else {
      dispatch(addFilterCondition(condition))
    }
  }, [selectedOption, startDate, endDate, startTime, endTime, field, createDateRangeFilter, createRelativeDateFilter, onFilterChange, dispatch])

  const handleQuickSelect = useCallback((option: RelativeDateOption) => {
    setSelectedOption(option)
    if (option !== 'custom') {
      // Auto-apply for relative dates
      setTimeout(() => {
        const condition = createRelativeDateFilter(field, option)
        if (onFilterChange) {
          onFilterChange(condition)
        } else {
          dispatch(addFilterCondition(condition))
        }
      }, 0)
    }
  }, [field, createRelativeDateFilter, onFilterChange, dispatch])

  const relativeOptions = [
    { value: 'last_hour', label: 'Last Hour' },
    { value: 'last_day', label: 'Last 24 Hours' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Custom Range' }
  ]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick select options */}
        <div className="flex flex-wrap gap-2">
          {relativeOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedOption === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickSelect(option.value as RelativeDateOption)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Custom date range inputs */}
        {selectedOption === 'custom' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-xs">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-time" className="text-xs">Start Time (Optional)</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-xs">End Time (Optional)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleApplyFilter}
              disabled={!startDate || !endDate}
              className="w-full"
            >
              Apply Date Range
            </Button>
          </div>
        )}

        {/* Current selection display */}
        {selectedOption !== 'custom' && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeOptions.find(opt => opt.value === selectedOption)?.label}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact date range picker for inline use
 */
export function CompactDateRangeFilter({ field, onFilterChange }: { field: string; onFilterChange: (condition: FilterCondition) => void }) {
  const { createRelativeDateFilter } = useDateRangeFilter()
  
  const handleQuickFilter = (option: RelativeDateOption) => {
    if (option !== 'custom') {
      const condition = createRelativeDateFilter(field, option)
      onFilterChange(condition)
    }
  }

  return (
    <Select onValueChange={(value) => handleQuickFilter(value as RelativeDateOption)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Time range..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="last_hour">Last Hour</SelectItem>
        <SelectItem value="last_day">Last 24 Hours</SelectItem>
        <SelectItem value="last_week">Last Week</SelectItem>
        <SelectItem value="last_month">Last Month</SelectItem>
      </SelectContent>
    </Select>
  )
}