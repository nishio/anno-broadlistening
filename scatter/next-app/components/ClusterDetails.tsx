import React, { useState, useEffect } from 'react'
import type {Argument, Cluster, Point} from '@/types'
import type {VoteFilter} from '@/src/types/VoteFilter'
import {mean} from '@/utils'

export interface Props {
  clusters: Cluster[]
  fullScreen?: boolean
  expanded: boolean
  tooltip: Point | null
  zoom: {
    zoomX: (x: number) => number
    zoomY: (y: number) => number
    dragging?: boolean
  }
  scaleX: (x: number) => number
  scaleY: (y: number) => number
  color: (clusterId: string, onlyCluster: string | undefined) => string
  onlyCluster?: string
  voteFilter?: VoteFilter
  filterFn?: (arg: Argument) => boolean
  showLabels?: boolean
  showRatio?: boolean
  t?: ((text?: string) => string | undefined) | undefined
  highlightText?: string
  totalArgs?: number
  /** クラスタ詳細ビューの遅延ロードを有効にするかどうか */
  enableLazyLoading?: boolean
  /** 遅延ロードする場合の遅延時間（ミリ秒） */
  lazyLoadDelay?: number
}

interface DotCirclesProps extends Props {
  voteFilter: VoteFilter
  filterFn: (arg: Argument) => boolean
  clusters: Cluster[]
  expanded: boolean
  tooltip: Point | null
  zoom: Props['zoom']
  scaleX: Props['scaleX']
  scaleY: Props['scaleY']
  color: Props['color']
  onlyCluster?: string
}

const DotCircles: React.FC<DotCirclesProps> = ({
  clusters,
  expanded,
  tooltip,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  voteFilter,
  filterFn,
}: DotCirclesProps) => {
  return clusters.map((cluster) =>
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
  )
}

interface ClusterLabelsProps extends Props {
  clusters: Cluster[]
  fullScreen: boolean
  expanded: boolean
  tooltip: Point | null
  zoom: Props['zoom']
  scaleX: Props['scaleX']
  scaleY: Props['scaleY']
  color: Props['color']
  onlyCluster?: string
  showLabels?: boolean
  showRatio?: boolean
  t?: ((text?: string) => string | undefined) | undefined
  highlightText?: string
  totalArgs?: number
}

const ClusterLabels: React.FC<ClusterLabelsProps> = ({
  clusters,
  fullScreen,
  expanded,
  tooltip,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  showLabels = true,
  showRatio = false,
  t,
  highlightText = '',
  totalArgs = 0,
}: ClusterLabelsProps) => {

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
          // nishio: ハイライトモードではラベルが濃いと点が見づらいため、透明度を下げる
          // 将来的にはハイライトされた点を含むクラスタのみラベルを表示するように変更するといいかも
        } else if (expanded) {
          calculatedOpacity = LIGHT_OPACITY
        } else if (tooltip?.cluster_id === cluster.cluster_id) {
          // tooltipが表示されているクラスタのラベルは非表示
          // tooltipが表示されているときは、その点がどのクラスタか表示されているため
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

export const DotCirclesComponent = React.memo(DotCircles);
export const ClusterLabelsComponent = React.memo(ClusterLabels);

const ClusterDetails: React.FC<Props> = ({
  clusters,
  fullScreen = false,
  expanded,
  tooltip,
  zoom,
  scaleX,
  scaleY,
  color,
  onlyCluster,
  voteFilter = { filter: () => true },
  filterFn = () => true,
  showLabels = true,
  showRatio = false,
  t,
  highlightText = '',
  totalArgs = 0,
  enableLazyLoading = false,
  lazyLoadDelay = 500,
}: Props) => {
  const [showDetails, setShowDetails] = useState(!enableLazyLoading);

  useEffect(() => {
    if (!enableLazyLoading) {
      return;
    }

    const timer = setTimeout(() => {
      setShowDetails(true);
    }, lazyLoadDelay);
    
    return () => clearTimeout(timer);
  }, [enableLazyLoading, lazyLoadDelay]);

  if (!showDetails) {
    return null;
  }

  return (
    <>
      <DotCircles
        clusters={clusters}
        expanded={expanded}
        tooltip={tooltip}
        zoom={zoom}
        scaleX={scaleX}
        scaleY={scaleY}
        color={color}
        onlyCluster={onlyCluster}
        voteFilter={voteFilter}
        filterFn={filterFn}
      />
      <ClusterLabels
        clusters={clusters}
        fullScreen={fullScreen}
        expanded={expanded}
        tooltip={tooltip}
        zoom={zoom}
        scaleX={scaleX}
        scaleY={scaleY}
        color={color}
        onlyCluster={onlyCluster}
        showLabels={showLabels}
        showRatio={showRatio}
        t={t}
        highlightText={highlightText}
        totalArgs={totalArgs}
      />
    </>
  );
};

export default ClusterDetails;
