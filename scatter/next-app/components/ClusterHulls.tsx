import React from 'react'
import {polygonHull} from 'd3-polygon'
import {Cluster} from '@/types'
import {ColorFunc} from '@/hooks/useClusterColor'

type ClusterHullsProps = {
  clusters: Cluster[]
  expanded: boolean
  zoom: any
  scaleX: any
  scaleY: any
  color: ColorFunc
  onlyCluster?: string
  voteFilter: any
  filterFn: (arg: any) => boolean
}

function ClusterHulls({
  clusters,
  expanded,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  voteFilter,
  filterFn
}: ClusterHullsProps) {
  return (
    <>
      {clusters.map((cluster) => {
        // Filter points and map to domain space coordinates
        const filteredPoints = cluster.arguments
          .filter(voteFilter.filter)
          .filter(filterFn)
          .map(arg => [arg.x, arg.y] as [number, number])

        // Skip clusters with less than 3 points (can't form a hull)
        if (filteredPoints.length < 3) return null

        // Calculate hull points in domain space
        const hullPoints = polygonHull(filteredPoints)
        if (!hullPoints) return null

        // Transform hull points to screen space
        const transformedHullPoints = hullPoints.map((point: [number, number]) => [
          zoom.zoomX(scaleX(point[0])),
          zoom.zoomY(scaleY(point[1]))
        ])

        // Create SVG path data
        const pathData = `M ${transformedHullPoints.join(' L ')} Z`

        return (
          <path
            key={cluster.cluster_id}
            d={pathData}
            fill={color(cluster.cluster_id, onlyCluster)}
            fillOpacity={expanded ? 0.05 : 0.1}
            stroke={color(cluster.cluster_id, onlyCluster)}
            strokeWidth={2}
            className="pointer-events-none"
          />
        )
      })}
    </>
  )
}

export default ClusterHulls
