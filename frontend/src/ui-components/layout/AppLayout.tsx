import type { ReactNode } from 'react'
import { Header } from './Header'
import { NavigationSidebar } from './NavigationSidebar'
import { useTheme } from '../../stores'
import { ConnectionStatusIndicator, ConnectionStatusBar } from '../ConnectionStatusIndicator'
import { useConnectionResilience } from '../../hooks/useConnectionResilience'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const theme = useTheme()
  const { config: connectionConfig, isConnected, connectionHealth } = useConnectionResilience()
  
  return (
    <div className={`min-h-screen bg-white ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />
      
      {/* Connection status bar for critical issues */}
      {(!isConnected || connectionHealth === 'poor') && <ConnectionStatusBar />}
      
      <div className="relative flex">
        <main className="flex-1">
          {children}
        </main>
        <NavigationSidebar />
      </div>
      
      {/* Connection status indicator (always visible in corner) */}
      {connectionConfig.showConnectionIndicator && (
        <ConnectionStatusIndicator 
          position="top-right" 
          compact={true}
          className="z-50" 
        />
      )}
    </div>
  )
}