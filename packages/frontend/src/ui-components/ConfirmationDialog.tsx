import React from 'react'
import { Button } from './Button'
import { Card } from './Card'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary'
}) => {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="p-6 max-w-md w-full">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-sm text-gray-600">{message}</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant === 'danger' ? 'outline' : 'primary'}
            className={`flex-1 ${confirmVariant === 'danger' ? 'border-red-500 text-red-600 hover:bg-red-50' : ''}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  )
}