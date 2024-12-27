import React, { useState, useEffect } from 'react'
import { ColorFunc } from '../hooks/useClusterColor'
import { usePerformanceMetrics } from '../hooks/usePerformanceMetrics'
import { Argument, Cluster, Point } from '../types'
import { mean } from '../utils'

interface Props {
  enableLazyLoading?: boolean
  lazyLoadDelay?: number
  enableMetrics?: boolean
  clusters: Cluster[]
  fullScreen?: boolean
  expanded: boolean
  tooltip: Point | null
  zoom: any
  scaleX: any
  scaleY: any
  color: ColorFunc
  onlyCluster?: string
  voteFilter?: { filter: (arg: Argument) => boolean }
  filterFn?: (arg: Argument) => boolean
  showLabels?: boolean
  showRatio?: boolean
  t?: (txt?: string) => string | undefined
  highlightText?: string
  totalArgs?: number
}

const DotCircles: React.FC<Props> = ({
  clusters,
  expanded,
  tooltip,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  voteFilter = { filter: () => true },
  filterFn = () => true,
}) => {
  return (
    <>
      {clusters.map((cluster) =>
        cluster.arguments.filter(voteFilter.filter).map((arg) => {
          const {arg_id, x, y} = arg
          const isCurrentTooltip = tooltip?.arg_id === arg_id

          let dotClass = 'default'
          if (expanded) {
            if (!isCurrentTooltip) {
              dotClass = 'obscure'
            }
          } else if (!filterFn(arg)) {
            dotClass = 'obscure'
          }

          let calculatedRadius
          if (expanded && isCurrentTooltip) {
            calculatedRadius = 8
          } else {
            calculatedRadius = 4
          }

          return (
            <circle
              className={`pointer-events-none ${dotClass}`}
              key={arg_id}
              id={arg_id}
              cx={zoom.zoomX(scaleX(x))}
              cy={zoom.zoomY(scaleY(y))}
              fill={color(cluster.cluster_id, onlyCluster)}
              r={calculatedRadius}
            />
          )
        })
      )}
    </>
  )
}

const ClusterLabels: React.FC<Props> = ({
  clusters,
  fullScreen,
  expanded,
  highlightText = '',
  tooltip,
  zoom,
  scaleX,
  scaleY,
  color,
  t,
  onlyCluster,
  showLabels = true,
  showRatio = false,
  totalArgs = 0,
}) => {
  if (!fullScreen || !showLabels || zoom.dragging) {
    return null
  }

  return (
    <div>
      {clusters.map((cluster) => {
        const isHighlightMode = highlightText !== ''

        let calculatedOpacity
        const DEFAULT_OPACITY = 0.85
        const LIGHT_OPACITY = 0.3
        const HIDDEN = 0

        if (isHighlightMode) {
          calculatedOpacity = LIGHT_OPACITY
        } else if (expanded) {
          calculatedOpacity = LIGHT_OPACITY
        } else if (tooltip?.cluster_id === cluster.cluster_id) {
          calculatedOpacity = HIDDEN
        } else {
          calculatedOpacity = DEFAULT_OPACITY
        }

        return (
          <div
            className={'absolute opacity-90 bg-white p-2 max-w-lg rounded-lg pointer-events-none select-none transition-opacity duration-300 font-bold text-md'}
            key={cluster.cluster_id}
            style={{
              transform: 'translate(-50%, -50%)',
              left: zoom.zoomX(scaleX(mean(cluster.arguments.map(({x}) => x)))),
              top: zoom.zoomY(scaleY(mean(cluster.arguments.map(({y}) => y)))),
              color: color(cluster.cluster_id, onlyCluster),
              opacity: calculatedOpacity,
            }}
          >
            {t ? t(cluster.cluster) : cluster.cluster}
            {showRatio && (
              <span>({Math.round((100 * cluster.arguments.length) / totalArgs)}%)</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

const ClusterDetails: React.FC<Props> = ({
  enableLazyLoading = false,
  lazyLoadDelay = 500,
  enableMetrics = false,
  ...props
}) => {
  const [showDetails, setShowDetails] = useState(!enableLazyLoading)
  const metrics = usePerformanceMetrics(enableMetrics)

  useEffect(() => {
    if (enableMetrics && metrics.initialLoadTime) {
      console.debug('Performance Metrics:', metrics)
    }
  }, [enableMetrics, metrics])

  useEffect(() => {
    if (!enableLazyLoading) {
      setShowDetails(true)
      return
    }

    const timer = setTimeout(() => {
      setShowDetails(true)
    }, lazyLoadDelay)

    return () => clearTimeout(timer)
  }, [enableLazyLoading, lazyLoadDelay])

  if (!showDetails) {
    return null
  }

  return (
    <>
      <DotCircles {...props} />
      <ClusterLabels {...props} />
    </>
  )
}

export default ClusterDetails
