import type { ReactNode } from 'react'
import { Header } from './Header'
import { NavigationSidebar } from './NavigationSidebar'
import { useTheme } from '../../stores'
import { ConnectionStatusIndicator } from '../ConnectionStatusIndicator'

interface AppLayoutProps {
  children: ReactNode
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const theme = useTheme()
  
  return (
    <div className={`min-h-screen bg-white ${theme === 'dark' ? 'dark' : ''}`}>
      <Header />
      
      
      <div className="relative flex">
        <main className="flex-1">
          {children}
        </main>
        <NavigationSidebar />
      </div>
      
      {/* Connection status indicator (less intrusive positioning) */}
      <ConnectionStatusIndicator 
        position="bottom-right" 
        compact={true}
        className="z-40" 
      />
    </div>
  )
}