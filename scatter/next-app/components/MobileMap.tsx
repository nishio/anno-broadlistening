// Third-party imports
import {useGesture} from '@use-gesture/react'

// React imports
import React, {useEffect, useState} from 'react'
// Local imports
import CustomTitle from '@/components/CustomTitle'
import Tooltip from '@/components/MobileTooltip'
import {ColorFunc} from '@/hooks/useClusterColor'
import useFilter from '@/hooks/useFilter'
import useInferredFeatures from '@/hooks/useInferredFeatures'
import {useScatterMap, GestureEvent} from '@/hooks/useScatterMap'
import {Translator} from '@/hooks/useTranslatorAndReplacements'
import type {Point, Result} from '@/types'
import {isTouchDevice, mean} from '@/utils'

// ZoomState type moved to useScatterMap
type MapProps = Result & {
  width?: number,
  height?: number,
  padding?: number,
  className?: string,
  fullScreen?: boolean,
  back?: () => void,
  onlyCluster?: string,
  translator: Translator,
  color: ColorFunc,
  config: {
    name: string,
    description?: string,
    question?: string,
  },
}

function MobileMap(props: MapProps) {
  const {fullScreen, back, onlyCluster, comments, translator, color, config} = props
  const [
    {tooltip, expanded, showLabels, minVotes, minConsensus, dimensions, clusters, zoom, findPoint},
    {setTooltip, setExpanded, setShowLabels, setMinVotes, setMinConsensus}
  ] = useScatterMap({...props, fullScreen, onlyCluster, color})
  const [showFilters, setShowFilters] = useState(false)
  const {dataHasVotes} = useInferredFeatures(props)
  const voteFilter = useFilter(clusters, comments, minVotes, minConsensus, dataHasVotes)

  const {scaleX, scaleY, width, height} = dimensions || {}
  if (!scaleX || !scaleY || !zoom) return null
  const {t} = translator
  const [isTouch, setIsTouch] = useState(false)
  const [_zoomState, setZoomState] = useState({scale: 1, x: 0, y: 0})

  useEffect(() => {
    setIsTouch(isTouchDevice())
  }, [])

  const bind = useGesture({
    onDrag: ({offset: [x, y]}) => {
      setZoomState((prev) => ({...prev, x, y}))
    },
    onPinch: ({offset: [d]}) => {
      setZoomState((prev) => ({...prev, scale: d}))
    },
  })

  if (!dimensions || !scaleX || !scaleY || !zoom) {
    console.log('NO DIMENSIONS???')
    return (
      <div
        className="m-auto bg-blue-50"
        style={{width: props.width, height: props.height}}
      />
    )
  }

  return (
    <>
      <CustomTitle config={config}/>

      <div
        className="m-auto relative"
        style={{
          width,
          height,
          overflow: fullScreen ? 'hidden' : 'visible',
          backgroundColor: '#dcdcdc',
        }}
        onMouseLeave={() => {
          if (!expanded) setTooltip(null)
        }}
      >
        <svg
          width={width!}
          height={height!}
          role="img"
          aria-label={t('Interactive scatter plot of arguments')}
          {...bind()}
          {...zoom.events({
            onClick: (e: GestureEvent) => {
              if (tooltip && !expanded) {
                setExpanded(true)
                zoom.disable()
              } else {
                setExpanded(false)
                setTooltip(findPoint(e)?.data || null)
                zoom.enable()
              }
            },
            onMove: (e: GestureEvent) => {
              if (!expanded) {
                setTooltip(findPoint(e)?.data || null)
              }
            },
            onDrag: () => {
              setTooltip(null)
            },
          })}
        >
          {/* DOT CIRCLES */}
          {clusters.map((cluster) =>
            cluster.arguments
              .filter(voteFilter.filter)
              .map(({arg_id, x, y}) => (
                <circle
                  className="pointer-events-none"
                  key={arg_id}
                  id={arg_id}
                  cx={zoom.zoomX(scaleX(x)) + 8}
                  cy={zoom.zoomY(scaleY(y))}
                  fill={color(cluster.cluster_id, onlyCluster)}
                  opacity={
                    expanded && tooltip?.arg_id !== arg_id ? 0.3 : 1
                  }
                  r={tooltip?.arg_id === arg_id ? 8 : 4}
                />
              ))
          )}
        </svg>
        {/* CLUSTER LABELS */}
        {fullScreen &&
          showLabels &&
          !zoom.dragging &&
          !isTouchDevice() && (
          <div>
            {clusters.map((cluster) => (
              <div
                className={`absolute opacity-90 bg-white p-2 max-w-lg rounded-lg pointer-events-none select-none transition-opacity duration-300 font-bold ${isTouch ? 'text-base' : 'text-2xl'}`}
                key={cluster.cluster_id}
                role="text"
                aria-label={t(`Cluster: ${cluster.cluster}`)}
                style={{
                  transform: 'translate(-50%, -50%)',
                  left: zoom.zoomX(
                    scaleX(
                      mean(cluster.arguments.map(({x}) => x))
                    )
                  ),
                  top: zoom.zoomY(
                    scaleY(
                      mean(cluster.arguments.map(({y}) => y))
                    )
                  ),
                  color: color(cluster.cluster_id, onlyCluster),
                  opacity:
                      expanded
                        ? 0.3
                        : tooltip?.cluster_id === cluster.cluster_id
                          ? 0
                          : 0.85,
                }}
              >
                {t(cluster.cluster)}
              </div>
            ))}
          </div>
        )}
        {/* TOOLTIP */}
        <div aria-live="polite" className="sr-only">
          {tooltip ? t(`Selected point from cluster: ${tooltip.cluster}`) : t('No point selected')}
        </div>
        {tooltip && (
          <Tooltip
            point={tooltip}
            dimensions={dimensions}
            zoom={zoom}
            expanded={expanded}
            fullScreen={fullScreen}
            translator={translator}
          />
        )}
        {/* BACK BUTTON */}
        {fullScreen && (
          <div className="absolute top-0 left-0">
            <button 
              className="m-2 underline" 
              onClick={back}
              aria-label={t('Back to report')}
            >
              {t('Back to report')}
            </button>
            <button
              className="m-2 underline"
              onClick={() => setShowLabels(prev => !prev)}
              aria-label={showLabels ? t('Hide labels') : t('Show labels')}
            >
              {showLabels ? t('Hide labels') : t('Show labels')}
            </button>
            {zoom.reset && (
              <button
                className="m-2 underline"
                onClick={zoom.reset as () => void}
                aria-label={t('Reset zoom')}
              >
                {t('Reset zoom')}
              </button>
            )}
            {dataHasVotes && (
              <button
                className="m-2 underline"
                onClick={() => {
                  setShowFilters((x) => !x)
                }}
                aria-label={showFilters ? t('Hide filters') : t('Show filters')}
              >
                {showFilters ? t('Hide filters') : t('Show filters')}
              </button>
            )}
            {/* FILTERS */}
            {showFilters && (
              <div 
                className="absolute w-[400px] top-12 left-2 p-2 border bg-white rounded leading-4"
                role="region"
                aria-label={t('Filter controls')}>
                <div className="flex justify-between">
                  <button className="inline-block m-2 text-left">
                    {t('Votes')} {'>'}{' '}
                    <span className="inline-block w-10">
                      {minVotes}
                    </span>
                  </button>
                  <input
                    className="inline-block w-[200px] mr-2"
                    id="min-votes-slider"
                    type="range"
                    min={0}
                    max={50}
                    value={minVotes}
                    aria-label={t('Minimum votes')}
                    aria-valuemin={0}
                    aria-valuemax={50}
                    aria-valuenow={minVotes}
                    onChange={(e) => {
                      setMinVotes(
                        parseInt(e.target.value)
                      )
                    }}
                  />
                </div>
                <div className="flex justify-between">
                  <button className="inline-block m-2 text-left">
                    {t('Consensus')} {'>'}{' '}
                    <span className="inline-block w-10">
                      {minConsensus}%
                    </span>
                  </button>
                  <input
                    className="inline-block w-[200px] mr-2"
                    id="min-consensus-slider"
                    type="range"
                    min={50}
                    max={100}
                    value={minConsensus}
                    aria-label={t('Minimum consensus percentage')}
                    aria-valuemin={50}
                    aria-valuemax={100}
                    aria-valuenow={minConsensus}
                    onChange={(e) => {
                      setMinConsensus(
                        parseInt(e.target.value)
                      )
                    }}
                  />
                </div>
                <div className="text-sm ml-2 mt-2 opacity-70">
                  {t('Showing')} {voteFilter.filtered}/
                  {voteFilter.total} {t('arguments')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default MobileMap
