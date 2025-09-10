import React from 'react'
import { CallOpportunitySection } from './CallOpportunitySection'
import type { CallOpportunity, CallRecommendation } from '../../../services/call-opportunity-analyzer'

interface CallOpportunityOverlayProps {
  opportunity: CallOpportunity
  recommendation?: CallRecommendation | null
  onAction: (action: string, data: Record<string, unknown>) => void
}

export const CallOpportunityOverlay: React.FC<CallOpportunityOverlayProps> = ({
  opportunity,
  recommendation,
  onAction
}) => {
  if (!recommendation) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`
        call-opportunity-overlay 
        bg-white rounded-2xl shadow-2xl p-6 border-4 max-w-md w-full mx-4
        animate-in fade-in duration-200
        ${recommendation.shouldCall ? 'border-green-400' : 'border-red-400'}
      `}>
        <CallOpportunitySection
          opportunity={opportunity}
          recommendation={recommendation}
          onCallAction={onAction}
        />
      </div>
    </div>
  )
}