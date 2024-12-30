import { polygonHull } from 'd3-polygon'
import React from 'react'
import { Cluster } from '../types'

interface ClusterHullsProps {
  clusters: Cluster[]
  zoom: {
    zoomX: (x: number) => number
    zoomY: (y: number) => number
    events: (handlers: any) => any
    panx: number
    pany: number
    dragging?: boolean
  }
  scaleX: (x: number) => number
  scaleY: (y: number) => number
  color: (id: string, onlyCluster?: string) => string
  onlyCluster: string | undefined
  voteFilter: (arg: any) => boolean
  filterFn: (arg: any) => boolean
}

const ClusterHulls: React.FC<ClusterHullsProps> = ({
  clusters,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  voteFilter,
  filterFn,
}) => {
  return (
    <g className="cluster-hulls">
      {clusters.map((cluster) => {
        // Filter points based on current view settings
        const points = cluster.arguments
          .filter(filterFn)
          .filter(voteFilter)
          .map((arg) => [zoom.zoomX(scaleX(arg.x)), zoom.zoomY(scaleY(arg.y))] as [number, number])

        if (points.length === 0) return null
        
        // Only show selected cluster if one is selected
        if (onlyCluster !== null && cluster.cluster_id !== onlyCluster) return null

        // Handle different cases based on number of points
        if (points.length === 1) {
          // For single point, draw a circle
          const [x, y] = points[0]
          return (
            <circle
              key={`hull-${cluster.cluster_id}`}
              cx={x}
              cy={y}
              r={10}
              fill={color(cluster.cluster_id, onlyCluster)}
              fillOpacity={0.2}
              stroke={color(cluster.cluster_id, onlyCluster)}
              strokeWidth={2}
              strokeOpacity={0.5}
            />
          )
        } else if (points.length === 2) {
          // For two points, draw a thick line
          const [[x1, y1], [x2, y2]] = points
          return (
            <line
              key={`hull-${cluster.cluster_id}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color(cluster.cluster_id, onlyCluster)}
              strokeWidth={4}
              strokeOpacity={0.5}
            />
          )
        } else {
          // For three or more points, compute and draw convex hull
          const hull = polygonHull(points as Array<[number, number]>)
          if (!hull) return null

          return (
            <path
              key={`hull-${cluster.cluster_id}`}
              d={`M${hull.join('L')}Z`}
              fill={color(cluster.cluster_id, onlyCluster)}
              fillOpacity={0.2}
              stroke={color(cluster.cluster_id, onlyCluster)}
              strokeWidth={2}
              strokeOpacity={0.5}
            />
          )
        }
      })}
    </g>
  )
}

export default ClusterHulls
