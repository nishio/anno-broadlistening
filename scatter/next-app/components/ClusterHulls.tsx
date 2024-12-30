import {polygonHull} from 'd3-polygon'
import React from 'react'
import {ColorFunc} from '@/hooks/useClusterColor'
import {Cluster} from '@/types'

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

        // Handle different cases based on number of points
        if (filteredPoints.length === 0) return null

        let pathData: string
        if (filteredPoints.length === 1) {
          // For single point, create a circle
          const [x, y] = filteredPoints[0]
          const radius = 10 // pixels in screen space
          const cx = zoom.zoomX(scaleX(x))
          const cy = zoom.zoomY(scaleY(y))
          pathData = `M ${cx-radius},${cy} a ${radius},${radius} 0 1,0 ${radius*2},0 a ${radius},${radius} 0 1,0 ${-radius*2},0`
        } else if (filteredPoints.length === 2) {
          // For two points, create a thick line with rounded ends
          const [[x1, y1], [x2, y2]] = filteredPoints
          const p1 = [zoom.zoomX(scaleX(x1)), zoom.zoomY(scaleY(y1))]
          const p2 = [zoom.zoomX(scaleX(x2)), zoom.zoomY(scaleY(y2))]
          pathData = `M ${p1[0]},${p1[1]} L ${p2[0]},${p2[1]}`
        } else {
          // For 3+ points, create convex hull
          const hullPoints = polygonHull(filteredPoints)
          if (!hullPoints) return null

          // Transform hull points to screen space
          const transformedHullPoints = hullPoints.map((point: [number, number]) => [
            zoom.zoomX(scaleX(point[0])),
            zoom.zoomY(scaleY(point[1]))
          ])
          pathData = `M ${transformedHullPoints.join(' L ')} Z`
        }

        return (
          <path
            key={cluster.cluster_id}
            d={pathData}
            fill={filteredPoints.length <= 2 ? 'none' : color(cluster.cluster_id, onlyCluster)}
            fillOpacity={expanded ? 0.05 : 0.1}
            stroke={color(cluster.cluster_id, onlyCluster)}
            strokeWidth={filteredPoints.length === 2 ? 4 : 2}
            strokeLinecap={filteredPoints.length === 2 ? 'round' : 'butt'}
            className="pointer-events-none"
          />
        )
      })}
    </>
  )
}

export default ClusterHulls
