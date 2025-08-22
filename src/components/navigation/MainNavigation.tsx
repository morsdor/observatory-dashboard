'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  BarChart3, 
  Database, 
  Filter, 
  Network,
  Settings,
  Monitor,
  Activity,
  Layers
} from 'lucide-react'

const navigationItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: Home,
    description: 'Main real-time dashboard'
  },
  {
    href: '/features',
    label: 'Features',
    icon: Layers,
    description: 'Feature showcase',
    badge: 'New'
  },
  {
    href: '/advanced-charts',
    label: 'Advanced Charts',
    icon: BarChart3,
    description: 'Chart demonstrations'
  }
]

const featureItems = [
  {
    href: '/features/real-time-dashboard',
    label: 'Real-Time Dashboard',
    icon: Activity
  },
  {
    href: '/features/advanced-charts',
    label: 'Advanced Charts',
    icon: BarChart3
  },
  {
    href: '/features/virtualized-data-grid',
    label: 'Data Grid',
    icon: Database
  },
  {
    href: '/features/advanced-filtering',
    label: 'Advanced Filtering',
    icon: Filter
  },
  {
    href: '/features/websocket-integration',
    label: 'WebSocket Integration',
    icon: Network
  },
  {
    href: '/features/mock-data-system',
    label: 'Mock Data System',
    icon: Settings
  },
  {
    href: '/features/system-overview',
    label: 'System Overview',
    icon: Monitor
  }
]

export function MainNavigation() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const isFeaturePage = pathname.startsWith('/features/')

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Monitor className="h-6 w-6" />
              <span className="font-bold text-xl">Observatory</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {navigationItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive(item.href) ? 'default' : 'ghost'}
                      className="flex items-center gap-2"
                    >
                      <IconComponent className="h-4 w-4" />
                      {item.label}
                      {item.badge && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="hidden sm:flex">
              v1.0.0
            </Badge>
          </div>
        </div>

        {/* Feature Sub-navigation */}
        {isFeaturePage && (
          <div className="border-t">
            <div className="flex items-center space-x-1 py-2 overflow-x-auto">
              {featureItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={pathname === item.href ? 'default' : 'ghost'}
                      size="sm"
                      className="flex items-center gap-2 whitespace-nowrap"
                    >
                      <IconComponent className="h-3 w-3" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}