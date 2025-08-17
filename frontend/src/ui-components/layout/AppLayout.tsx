import type { ReactNode } from 'react'
import { Header } from './Header'
import { NavigationSidebar } from './NavigationSidebar'
import { useTheme } from '../../stores'

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
    </div>
  )
}