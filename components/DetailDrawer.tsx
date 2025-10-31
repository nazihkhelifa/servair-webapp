'use client'

import { FiX } from 'react-icons/fi'
import { useEffect } from 'react'

interface DetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function DetailDrawer({ 
  isOpen, 
  onClose, 
  title, 
  children,
  width = 'lg'
}: DetailDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-md z-40 transition-all duration-300 ease-out"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full bg-gradient-to-b from-white via-white to-[#F9FAFB] apple-shadow-lg z-50 transform transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } w-full ${widthClasses[width]}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-6 glass-effect border-b border-gray-200/50">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100/80 active:bg-gray-200/80 rounded-xl apple-transition text-gray-500 hover:text-gray-900 active:scale-95"
            aria-label="Close drawer"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-89px)] p-8">
          {children}
        </div>
      </div>
    </>
  )
}

