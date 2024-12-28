import {voronoi} from '@visx/voronoi'
import {useMemo} from 'react'
import {Zoom} from './useZoom'
import {Argument, Cluster, CommentsMap, Dimensions, Point} from '@/types'

type FilterFn = (arg: Argument) => boolean
type PointerEvent = React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>

const useVoronoiFinder = (
  clusters: Cluster[],
  comments: CommentsMap,
  color: (cluster_id: string) => string,
  zoom: Zoom,
  dimensions?: Dimensions,
  onlyCluster?: string,
  baseRadius = 20,
  filterFn?: FilterFn,
) => {
  return useMemo(() => {
    if (!dimensions) return () => null
    const {width, height, scaleX, scaleY} = dimensions

    let points: Point[] = clusters.flatMap((cluster) =>
      cluster.arguments.map((arg) => ({
        ...arg,
        ...cluster,
        ...comments[arg.comment_id],
        color: color(cluster.cluster_id),
      }))
    )

    if (filterFn) {
      points = points.filter(filterFn)
    }

    const layout = voronoi<Point>({
      x: (d: Point) => scaleX(d.x),
      y: (d: Point) => scaleY(d.y),
      width,
      height,
    })(points)

    return (event: PointerEvent | undefined) => {
      if (!event?.target) return null

      const target = event.target as SVGSVGElement
      const rect = target.getBoundingClientRect()
      if (!rect) return null

      const clientX = 'touches' in event 
        ? event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX
        : event.clientX
      const clientY = 'touches' in event
        ? event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY
        : event.clientY

      if (clientX === undefined || clientY === undefined) return null

      const x = zoom.unZoomX(clientX - rect.left)
      const y = zoom.unZoomY(clientY - rect.top)
      const adjustedRadius = baseRadius / zoom.scale
      const found = layout.find(x, y, adjustedRadius)

      if (onlyCluster && found && found.data.cluster_id !== onlyCluster) {
        return null
      }
      return found
    }
  }, [clusters, dimensions, filterFn, zoom, color, comments, onlyCluster, baseRadius])
}

export default useVoronoiFinder
