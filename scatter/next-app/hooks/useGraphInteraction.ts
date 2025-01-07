import { useState, useCallback, useRef, useEffect } from 'react'

interface Point {
  x: number
  y: number
}

interface Transform {
  x: number
  y: number
  scale: number
}

interface UseGraphInteractionProps {
  minScale?: number
  maxScale?: number
  initialScale?: number
}

export const useGraphInteraction = ({
  minScale = 0.1,
  maxScale = 4,
  initialScale = 1
}: UseGraphInteractionProps = {}) => {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: initialScale })
  const [isDragging, setIsDragging] = useState(false)
  const lastPointRef = useRef<Point | null>(null)
  const containerRef = useRef<SVGSVGElement>(null)

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()
    const { deltaY } = event
    const scaleFactor = 1 - deltaY * 0.001

    setTransform(prev => {
      const newScale = Math.min(maxScale, Math.max(minScale, prev.scale * scaleFactor))
      const scaleDiff = newScale - prev.scale

      // Calculate zoom point in SVG coordinates
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return prev

      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // Adjust position to zoom towards mouse pointer
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale)
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale)

      return {
        x: newX,
        y: newY,
        scale: newScale
      }
    })
  }, [minScale, maxScale])

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault()
    setIsDragging(true)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    lastPointRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }, [])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !lastPointRef.current) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const currentPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }

    const dx = (currentPoint.x - lastPointRef.current.x) / transform.scale
    const dy = (currentPoint.y - lastPointRef.current.y) / transform.scale

    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }))

    lastPointRef.current = currentPoint
  }, [isDragging, transform.scale])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    lastPointRef.current = null
  }, [])

  useEffect(() => {
    const svg = containerRef.current
    if (!svg) return

    svg.addEventListener('wheel', handleWheel, { passive: false })
    svg.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      svg.removeEventListener('wheel', handleWheel)
      svg.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp])

  return {
    transform,
    containerRef,
    isDragging
  }
}
