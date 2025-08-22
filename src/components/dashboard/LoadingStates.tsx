'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw } from 'lucide-react'

export function DashboardSkeleton() {
  return (
    <div className="h-screen flex flex-col">
      {/* Header Skeleton */}
      <Card className="border-b rounded-none">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-px" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </Card>

      <div className="flex flex-1">
        {/* Sidebar Skeleton */}
        <Card className="w-64 rounded-none border-r">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </Card>

        {/* Main Content Skeleton */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="min-h-[300px]">
                <div className="p-4 border-b">
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="p-4 space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChartLoadingSkeleton() {
  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="flex-1 w-full min-h-[200px]" />
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

export function DataGridLoadingSkeleton() {
  return (
    <div className="w-full h-full space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      
      {/* Table Header */}
      <div className="grid grid-cols-5 gap-4 p-4 border-b">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  )
}

interface LoadingSpinnerProps {
  message?: string
  className?: string
}

export function LoadingSpinner({ message = 'Loading...', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}