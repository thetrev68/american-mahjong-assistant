interface TileLockBadgeProps {
  isLocked: boolean
}

export const TileLockBadge = ({ isLocked }: TileLockBadgeProps) => {
  if (!isLocked) return null

  return (
    <>
      {/* Padlock Badge - Transparent background, always on top */}
      <div className="absolute -top-1 -right-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-white/50 z-50">
        🔒
      </div>
      {/* Lock/Unlock Helper on Hover */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
        Right-click to unlock
      </div>
    </>
  )
}