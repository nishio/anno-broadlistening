import {voronoi} from '@visx/voronoi'
import {useMemo} from 'react'
import {Zoom} from './useZoom'
import {Argument, Cluster, CommentsMap, Dimensions, Point} from '@/types'

type FilterFn = (arg: Argument) => boolean

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
    if (!dimensions) return () => null as any
    const {width, height, scaleX, scaleY} = dimensions

    let points: Point[] = clusters.flatMap((cluster) =>
      cluster.arguments.map((arg) => ({
        ...arg,
        ...cluster,
        ...comments[arg.comment_id],
        color: color(cluster.cluster_id),
      }))
    )

    // filterFnがあればpointをフィルタ
    if (filterFn) {
      points = points.filter(filterFn)
    }

    const layout = voronoi<Point>({
      x: (d) => scaleX(d.x),
      y: (d) => scaleY(d.y),
      width,
      height,
    })(points)

    return (mouseEvent: any) => {
      // FIXME mouseEvent 以外が渡されることがある
      const rect = mouseEvent.target?.getBoundingClientRect!() || {left: 0, top: 0} // FIXME
      const x = zoom.unZoomX(mouseEvent.clientX - rect.left)
      const y = zoom.unZoomY(mouseEvent.clientY - rect.top)
      const adjustedRadius = baseRadius / zoom.scale
      const found = layout.find(x, y, adjustedRadius)

      // DEBUG 当たり判定の円を表示
      // const svg = document.querySelector('svg')
      // if (svg) {
      //   const existingCircle = svg.querySelector('#adjusted-radius-circle')
      //   if (existingCircle) {
      //     existingCircle.setAttribute('cx', String(mouseEvent.clientX))
      //     existingCircle.setAttribute('cy', String(mouseEvent.clientY))
      //     existingCircle.setAttribute('r', String(adjustedRadius * zoom.scale))
      //   } else {
      //     const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      //     circle.setAttribute('id', 'adjusted-radius-circle')
      //     circle.setAttribute('cx', String(mouseEvent.clientX))
      //     circle.setAttribute('cy', String(mouseEvent.clientY))
      //     circle.setAttribute('r', String(adjustedRadius * zoom.scale))
      //     circle.setAttribute('fill', 'none')
      //     circle.setAttribute('stroke', 'red')
      //     circle.setAttribute('stroke-width', '1')
      //     svg.appendChild(circle)
      //   }
      // }

      if (onlyCluster && found && found.data.cluster_id !== onlyCluster)
        return null
      return found
    }
  }, [clusters, dimensions, filterFn, zoom])
}

export default useVoronoiFinder
