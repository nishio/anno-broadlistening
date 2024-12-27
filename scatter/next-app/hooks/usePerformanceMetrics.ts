import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  initialLoadTime: number | null
  renderTime: number | null
}

export const usePerformanceMetrics = (enableMetrics = false) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    initialLoadTime: null,
    renderTime: null,
  })

  useEffect(() => {
    if (!enableMetrics) return

    const startTime = performance.now()

    // Use requestAnimationFrame to measure when the content is actually rendered
    requestAnimationFrame(() => {
      const endTime = performance.now()
      setMetrics({
        initialLoadTime: endTime - startTime,
        renderTime: performance.now() - endTime,
      })
    })
  }, [enableMetrics])

  return metrics
}
