import {MouseEvent, TouchEvent, useState} from 'react'

// Helper function to safely get coordinates from different event types
export const getEventCoordinates = (event: GestureEvent): { clientX: number; clientY: number } => {
  if ('touches' in event) {
    // Touch event
    const touch = event.touches[0] || event.changedTouches[0]
    return {
      clientX: touch.clientX,
      clientY: touch.clientY
    }
  }
  // Mouse event
  return {
    clientX: event.clientX,
    clientY: event.clientY
  }
}
import {Argument, Cluster, Dimensions, Point, Result} from '@/types'
import {ColorFunc} from '@/hooks/useClusterColor'
import useAutoResize from '@/hooks/useAutoResize'
import useFilter from '@/hooks/useFilter'
import useInferredFeatures from '@/hooks/useInferredFeatures'
import useRelativePositions from '@/hooks/useRelativePositions'
import useVoronoiFinder from '@/hooks/useVoronoiFinder'
import useZoom from '@/hooks/useZoom'
import {mean} from '@/utils'

export type GestureEvent = MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>

export interface ZoomEvents {
  onClick: (e: GestureEvent) => void
  onMove: (e: GestureEvent) => void
  onDrag: () => void
}

export type ScatterMapConfig = {
  width?: number
  height?: number
  padding?: number
  fullScreen?: boolean
  onlyCluster?: string
  color: ColorFunc
}

export type ScatterMapState = {
  tooltip: Point | null
  expanded: boolean
  showLabels: boolean
  minVotes: number
  minConsensus: number
  dimensions: Dimensions | undefined
  clusters: Cluster[]
  zoom: ReturnType<typeof useZoom>
  findPoint: ReturnType<typeof useVoronoiFinder>
}

export type ScatterMapActions = {
  setTooltip: React.Dispatch<React.SetStateAction<Point | null>>
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>
  setMinVotes: React.Dispatch<React.SetStateAction<number>>
  setMinConsensus: React.Dispatch<React.SetStateAction<number>>
}

export function useScatterMap(props: Result & ScatterMapConfig): [ScatterMapState, ScatterMapActions] {
  // Common state
  const [tooltip, setTooltip] = useState<Point | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [minVotes, setMinVotes] = useState(0)
  const [minConsensus, setMinConsensus] = useState(50)

  // Common hooks
  const {dataHasVotes} = useInferredFeatures(props)
  const dimensions = useAutoResize(props.width, props.height)
  const clusters = useRelativePositions(props.clusters)
  const zoom = useZoom(dimensions, props.fullScreen)
  const voteFilter = useFilter(clusters, props.comments, minVotes, minConsensus, dataHasVotes)

  // Point finding
  const findPoint = useVoronoiFinder(
    clusters,
    props.comments,
    props.color,
    zoom,
    dimensions,
    props.onlyCluster
  )

  const state: ScatterMapState = {
    tooltip,
    expanded,
    showLabels,
    minVotes,
    minConsensus,
    dimensions,
    clusters,
    zoom,
    findPoint,
  }

  const actions: ScatterMapActions = {
    setTooltip,
    setExpanded,
    setShowLabels,
    setMinVotes,
    setMinConsensus,
  }

  return [state, actions]
}

// Utility functions that can be shared between Desktop and Mobile
export const calculateDotRadius = (expanded: boolean, isCurrentTooltip: boolean) => {
  if (expanded && isCurrentTooltip) {
    return 8
  }
  return 4
}

export const calculateLabelOpacity = (
  expanded: boolean,
  isHighlightMode: boolean,
  tooltipClusterId: string | undefined,
  currentClusterId: string
) => {
  const DEFAULT_OPACITY = 0.85
  const LIGHT_OPACITY = 0.3
  const HIDDEN = 0

  if (isHighlightMode || expanded) {
    return LIGHT_OPACITY
  } else if (tooltipClusterId === currentClusterId) {
    return HIDDEN
  }
  return DEFAULT_OPACITY
}
