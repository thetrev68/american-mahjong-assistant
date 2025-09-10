interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'accent' | 'white'
  message?: string
}

export const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  message
}: LoadingSpinnerProps) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  }
  
  const colors = {
    primary: 'border-primary border-t-transparent',
    secondary: 'border-secondary border-t-transparent',
    accent: 'border-accent border-t-transparent',
    white: 'border-white border-t-transparent'
  }
  
  const messageSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }
  
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-2 ${sizes[size]} ${colors[color]}`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className={`text-gray-600 font-medium ${messageSize[size]}`}>
          {message}
        </p>
      )}
    </div>
  )
}