'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  BarChart3, 
  Table, 
  Filter, 
  TrendingUp,
  Database,
  Settings,
  HelpCircle
} from 'lucide-react'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  active?: boolean
}

interface DashboardSidebarProps {
  activeView: string
  onViewChange: (viewId: string) => void
  className?: string
}

export function DashboardSidebar({ 
  activeView, 
  onViewChange, 
  className = '' 
}: DashboardSidebarProps) {
  const navigationItems: NavigationItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <TrendingUp className="h-4 w-4" />,
      active: activeView === 'overview'
    },
    {
      id: 'charts',
      label: 'Charts',
      icon: <BarChart3 className="h-4 w-4" />,
      active: activeView === 'charts'
    },
    {
      id: 'data-grid',
      label: 'Data Grid',
      icon: <Table className="h-4 w-4" />,
      active: activeView === 'data-grid'
    },
    {
      id: 'filters',
      label: 'Filters',
      icon: <Filter className="h-4 w-4" />,
      active: activeView === 'filters'
    }
  ]

  const utilityItems: NavigationItem[] = [
    {
      id: 'data-sources',
      label: 'Data Sources',
      icon: <Database className="h-4 w-4" />,
      active: activeView === 'data-sources'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      active: activeView === 'settings'
    },
    {
      id: 'help',
      label: 'Help',
      icon: <HelpCircle className="h-4 w-4" />,
      active: activeView === 'help'
    }
  ]

  return (
    <Card className={`h-full rounded-none border-r ${className}`}>
      <div className="p-4">
        <nav className="space-y-2">
          <div>
            <h3 className="mb-2 px-2 text-sm font-semibold text-gray-900">
              Views
            </h3>
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={item.active ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => onViewChange(item.id)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            ))}
          </div>
          
          <Separator className="my-4" />
          
          <div>
            <h3 className="mb-2 px-2 text-sm font-semibold text-gray-900">
              Tools
            </h3>
            {utilityItems.map((item) => (
              <Button
                key={item.id}
                variant={item.active ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => onViewChange(item.id)}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Button>
            ))}
          </div>
        </nav>
      </div>
    </Card>
  )
}