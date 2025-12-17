import { useEffect, useRef, useCallback } from 'react'

interface UseScanDetectionOptions {
  onScan: (barcode: string) => void
  enabled?: boolean
  minLength?: number
  maxLength?: number
  timeThreshold?: number // Time in ms to consider input as scanner input
}

/**
 * Hook to detect barcode scanner input
 * Scanners typically send characters rapidly followed by Enter
 */
export function useScanDetection({
  onScan,
  enabled = true,
  minLength = 3,
  maxLength = 50,
  timeThreshold = 100, // 100ms between characters indicates scanner
}: UseScanDetectionOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearBuffer = useCallback(() => {
    bufferRef.current = ''
    lastKeyTimeRef.current = 0
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleScan = useCallback(
    (barcode: string) => {
      if (barcode.length >= minLength && barcode.length <= maxLength) {
        onScan(barcode.trim())
      }
      clearBuffer()
    },
    [onScan, minLength, maxLength, clearBuffer]
  )

  useEffect(() => {
    if (!enabled) {
      clearBuffer()
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field, textarea, or contenteditable
      const target = event.target as HTMLElement
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[role="textbox"]') !== null ||
        target.closest('[contenteditable="true"]') !== null

      // Ignore if inside a modal/dialog
      const isInModal = target.closest('[role="dialog"]') !== null || target.closest('[data-state="open"]') !== null

      if (isInputField || isInModal) {
        clearBuffer()
        return
      }

      // Ignore modifier keys
      if (event.ctrlKey || event.metaKey || event.altKey) {
        clearBuffer()
        return
      }

      const currentTime = Date.now()
      const timeSinceLastKey = currentTime - lastKeyTimeRef.current

      // If Enter is pressed, treat as end of scan
      if (event.key === 'Enter') {
        event.preventDefault()
        if (bufferRef.current.length > 0) {
          handleScan(bufferRef.current)
        }
        return
      }

      // If too much time has passed since last key, reset buffer (user typing manually)
      if (timeSinceLastKey > timeThreshold && bufferRef.current.length > 0) {
        clearBuffer()
      }

      // Add character to buffer if it's a printable character
      if (event.key.length === 1 && !event.shiftKey) {
        // Regular character
        bufferRef.current += event.key
        lastKeyTimeRef.current = currentTime

        // Clear buffer after a delay if no more keys come (manual typing)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          clearBuffer()
        }, timeThreshold * 2)
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        // Allow backspace to correct scanner input
        bufferRef.current = bufferRef.current.slice(0, -1)
        lastKeyTimeRef.current = currentTime
      } else {
        // Other special keys reset buffer
        clearBuffer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearBuffer()
    }
  }, [enabled, timeThreshold, handleScan, clearBuffer])

  return {
    clearBuffer,
  }
}

