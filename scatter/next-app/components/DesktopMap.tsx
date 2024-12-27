import React, {useEffect, useRef, useState} from 'react'
import {useGesture} from '@use-gesture/react'

// Components
import ClusterDetails from '@/components/ClusterDetails'
import CustomTitle from '@/components/CustomTitle'
import {DesktopFullscreenFavorites} from '@/components/DesktopFullscreenFavorites'
import {DesktopFullscreenFilter} from '@/components/DesktopFullscreenFilter'
import {DesktopFullscreenTools} from '@/components/DesktopFullscreenTools'
import Tooltip from '@/components/DesktopTooltip'

// Hooks
import useAutoResize from '@/hooks/useAutoResize'
import {ColorFunc} from '@/hooks/useClusterColor'
import useFilter from '@/hooks/useFilter'
import useInferredFeatures from '@/hooks/useInferredFeatures'
import useRelativePositions from '@/hooks/useRelativePositions'
import {Translator} from '@/hooks/useTranslatorAndReplacements'
import useVoronoiFinder from '@/hooks/useVoronoiFinder'
import useZoom from '@/hooks/useZoom'

// Types
import {Argument, Cluster, FavoritePoint, Point, PropertyMap, Result} from '@/types'

type TooltipPosition = {
  x: number
  y: number
}

type MapProps = Result & {
  width?: number
  height?: number
  padding?: number
  className?: string
  fullScreen?: boolean
  back?: () => void
  onlyCluster?: string
  translator: Translator
  color: ColorFunc
  config: {
    name: string
    description?: string
    question?: string
  }
  propertyMap: PropertyMap
}

function DesktopMap(props: MapProps) {
  const {
    fullScreen = false,
    back,
    onlyCluster,
    comments,
    translator,
    color,
    config,
    propertyMap
  } = props
  const {dataHasVotes} = useInferredFeatures(props)
  const dimensions = useAutoResize(props.width, props.height)
  const clusters = useRelativePositions(props.clusters)
  const zoom = useZoom(dimensions, fullScreen)

  // for vote filter
  const [minVotes, setMinVotes] = useState(0)
  const [minConsensus, setMinConsensus] = useState(50)
  const voteFilter = useFilter(clusters, comments, minVotes, minConsensus, dataHasVotes)

  // text and property filter
  const [highlightText, setHighlightText] = useState<string>('')
  const [propertyFilter, setPropertyFilter] = useState({} as { [key: string]: string })

  const isPropertyHighlightMode = Object.values(propertyFilter).some((val) => val !== '')
  const isTextHighlightMode = highlightText !== ''

  const filterFn = (arg: Argument) => {
    // return true if the point should be displayed
    if (!voteFilter.filter(arg)) return false

    if (isTextHighlightMode && !arg.argument.includes(highlightText)) {
      return false
    }

    if (isPropertyHighlightMode) {
      for (const [propKey, val] of Object.entries(propertyFilter)) {
        if (val === '') continue
        const argVal = propertyMap[propKey]?.[arg.arg_id]
        if (argVal !== val) {
          return false
        }
      }
    }
    return true
  }

  const findPoint = useVoronoiFinder(
    clusters,
    props.comments,
    color,
    zoom,
    dimensions,
    onlyCluster,
    undefined,
    filterFn
  )
  const [tooltip, setTooltip] = useState<Point | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
  })
  const [expanded, setExpanded] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showRatio, setShowRatio] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showTitle, setShowTitle] = useState(false)
  const [showFilterSettings, setShowFilterSettings] = useState(false)

  const totalArgs = clusters
    .map((c) => c.arguments.length)
    .reduce((a, b) => a + b, 0)

  const {scaleX, scaleY, width, height} = dimensions || {}
  const {t} = translator

  const favoritesKey = `favorites_${window.location.href}`

  const [favorites, setFavorites] = useState<FavoritePoint[]>(() => {
    try {
      const storedFavorites = localStorage.getItem(favoritesKey)
      console.log('読み込んだお気に入り:', storedFavorites)
      return storedFavorites ? JSON.parse(storedFavorites) : []
    } catch (error) {
      console.error('お気に入りの読み込みに失敗しました:', error)
      return []
    }
  })
  const [zoomState, setZoomState] = useState({scale: 1, x: 0, y: 0})
  const [isZoomEnabled] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(favoritesKey, JSON.stringify(favorites))
      console.log('保存したお気に入り:', favorites)
    } catch (error) {
      console.error('お気に入りの保存に失敗しました:', error)
    }
  }, [favorites])

  const containerRef = useRef<HTMLDivElement>(null)

  const bind = useGesture(
    {
      onDrag: ({movement: [mx, my], cancel, direction: [dx, dy], memo}) => {
        if (!isZoomEnabled) return memo
        if (Math.abs(dy) > Math.abs(dx)) {
          cancel() // ドラッグをキャンセルしてスクロールを許可
          return memo
        }
        // 水平方向のドラッグの場合、地図のパンを処理
        setZoomState((prev) => ({...prev, x: prev.x + mx, y: prev.y + my}))
        return memo
      },
      onPinch: ({offset: [d], memo}) => {
        const newScale = Math.min(Math.max(d, 0.5), 4)
        setZoomState((prev) => ({...prev, scale: newScale}))
        return memo
      },
      onClick: ({event}) => {
        handleTap(event)
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 5,
      },
      pinch: {
        scaleBounds: {min: 0.5, max: 4},
      },
    }
  )

  // Performance measurement setup
  useEffect(() => {
    // Clear existing performance marks and measures
    performance.clearMarks();
    performance.clearMeasures();

    // Mark the start of scatter plot rendering
    performance.mark('scatter-plot-start');
    console.log('%cScatter plot rendering started', 'color: #2196F3; font-weight: bold');
    
    // Create performance observer for paint metrics
    const paintObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.name === 'first-paint') {
          console.log('%cFirst Paint:', 'color: #4CAF50; font-weight: bold', 
            Math.round(entry.startTime), 'ms');
        }
        if (entry.name === 'first-contentful-paint') {
          console.log('%cFirst Contentful Paint:', 'color: #4CAF50; font-weight: bold', 
            Math.round(entry.startTime), 'ms');
        }
      });
    });

    // Create observer for Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('%cLargest Contentful Paint:', 'color: #4CAF50; font-weight: bold', 
        Math.round(lastEntry.startTime), 'ms');
      
      // Mark the end of scatter plot rendering
      performance.mark('scatter-plot-end');
      performance.measure('scatter-plot-render-time', 'scatter-plot-start', 'scatter-plot-end');
      const measures = performance.getEntriesByName('scatter-plot-render-time');
      console.log('%cScatter plot render time:', 'color: #2196F3; font-weight: bold', 
        Math.round(measures[0].duration), 'ms');
    });

    // Observe paint and LCP metrics
    paintObserver.observe({ entryTypes: ['paint'] });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cleanup
    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (clusters.length === 0) return

    // 全てのデータ点のXとYの最小値と最大値を計算
    const allX = clusters.flatMap(cluster => cluster.arguments.map(arg => arg.x))
    const allY = clusters.flatMap(cluster => cluster.arguments.map(arg => arg.y))
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY)

    const dataWidth = maxX - minX
    const dataHeight = maxY - minY

    if (!dimensions) return

    const {width: dimensionsWidth, height: containerHeight} = dimensions
    const containerWidth = fullScreen ? dimensionsWidth * 0.75 : dimensionsWidth

    const margin = fullScreen ? 0.6 : 0.8
    const scaleX = (containerWidth * margin) / dataWidth
    const scaleY = (containerHeight * margin) / dataHeight
    let scale = Math.min(scaleX, scaleY)

    // フルスクリーン時のスケールを調整
    if (fullScreen) {
      scale *= 0.8
    }
    const x = (containerWidth - (dataWidth * scale)) / 2 - (minX * scale)
    const y = (containerHeight - (dataHeight * scale)) / 2 - (minY * scale)

    // zoomState が変更される場合のみ setZoomState を呼び出す
    if (zoomState.scale !== scale || zoomState.x !== x || zoomState.y !== y) {
      setZoomState({scale, x, y})
    }

  }, [clusters, dimensions, fullScreen])

  const TOOLTIP_WIDTH = 300
  const TOOLTIP_HEIGHT = 100
  const TOOLTIP_MARGIN = 15

  const calculateTooltipPosition = (clientX: number, clientY: number) => {

    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      let x = clientX - containerRect.left
      let y = clientY - containerRect.top

      // コンテナのサイズを取得
      const containerWidth = containerRect.width
      const containerHeight = containerRect.height
      // right
      if (x + TOOLTIP_WIDTH > containerWidth) {
        x = containerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN
      }
      // left
      if (x < TOOLTIP_MARGIN) {
        x = TOOLTIP_MARGIN
      }
      // bottom
      if (y + TOOLTIP_HEIGHT > containerHeight) {
        y = containerHeight - TOOLTIP_HEIGHT - TOOLTIP_MARGIN
      }
      return {x, y}
    }

    console.warn('containerRef.current is undefined')
    return {x: 0, y: 0}
  }

  if (!dimensions) {
    console.log('NO DIMENSIONS???')
    return (
      <div
        className="m-auto bg-blue-50"
        style={{width: props.width, height: props.height}}
      />
    )
  }

  const handleClick = (e: any) => {
    if (tooltip && !expanded) {
      setExpanded(true)
    } else if (expanded) {
      setExpanded(false)
      setTooltip(null)
    } else {
      const clickedPoint = findPoint(e)
      if (clickedPoint) {
        const newPosition = calculateTooltipPosition(e.clientX, e.clientY)
        setTooltip(clickedPoint.data)
        setTooltipPosition(newPosition)
      } else {
        setTooltip(null)
      }
    }
  }

  let animationFrameId: number | null = null

  const handleMove = (e: any) => {
    if (expanded) return
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    animationFrameId = requestAnimationFrame(() => {
      const movedPoint = findPoint(e)
      if (movedPoint) {
        // 既に表示されている tooltip と選択された tooltip が同じ場合はスキップ
        if (tooltip?.arg_id !== movedPoint.data.arg_id) {
          setTooltip(movedPoint.data)
          setTooltipPosition(calculateTooltipPosition(e.clientX, e.clientY))
        }
      } else {
        setTooltip(null)
      }
      animationFrameId = null
    })
  }

  const toggleFavorite = (fav: FavoritePoint) => {
    setFavorites((prevFavorites) => {
      const isAlreadyFavorite = prevFavorites.some(
        (item) => item.arg_id === fav.arg_id
      )
      if (isAlreadyFavorite) {
        return prevFavorites.filter((item) => item.arg_id !== fav.arg_id)
      } else {
        return [...prevFavorites, fav]
      }
    })
  }

  const handleTap = (event: any) => {
    console.log('handleTap called')
    const clientX = event.clientX
    const clientY = event.clientY

    console.log(`Tap event at (${clientX}, ${clientY})`)

    const clickedPoint = findPoint({clientX, clientY})
    if (clickedPoint) {
      const newPosition = calculateTooltipPosition(clientX, clientY)
      console.log('Tapped point found:', clickedPoint.data)
      setTooltip(clickedPoint.data)
      setTooltipPosition(newPosition)
    } else {
      // ツールチップが開いている場合は閉じる
      if (tooltip) {
        setTooltip(null)
        console.log('Tooltip closed due to tap with no point')
      }
    }
  }

  function extractFirstBracketContent(name: string): string | null {
    const match = name.match(/＜([^＞]+)＞(?:.*?＜([^＞]+)＞)?/)
    if (match) {
      const firstMatch = match[1]
      let secondMatch = ''

      if (match[2]) {
        const innerMatch = match[2].match(/（([^）]+)）/)
        secondMatch = innerMatch ? `（${innerMatch[1]}）` : `（${match[2]}）`
      }

      return `＜${firstMatch}に関する分析結果${secondMatch}＞`
    }
    return null
  }

  const map_title = extractFirstBracketContent(config.name)

  return (
    <>
      <CustomTitle config={config}/>
      <div className="flex flex-1 relative">
        {/* 地図コンテナ */}
        <div
          ref={containerRef}
          className="relative flex-grow"
          style={{
            height: fullScreen ? '100vh' : `${height}px`,
            overflow: fullScreen ? 'hidden' : 'visible',
            backgroundColor: '#dcdcdc',
          }}
          onMouseLeave={() => {
            if (!expanded) setTooltip(null)
          }}
        >
          {/* 地図タイトル */}
          {showTitle && fullScreen && (
            <div
              className="absolute top-12 left-1/2 transform -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-lg shadow-md"
              style={{
                opacity: expanded ? 0.3 : 0.85,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              <h2 className="text-3xl font-bold">{map_title}</h2>
            </div>
          )}

          <svg
            width={width!}
            height={height!}
            {...bind()}
            {...zoom.events({
              onClick: handleClick,
              onMove: handleMove,
              onDrag: () => {
                setTooltip(null)
              },
            })}
          >
            {/* CLUSTER DETAILS */}
            <ClusterDetails
              clusters={clusters}
              fullScreen={fullScreen}
              expanded={expanded}
              tooltip={tooltip}
              zoom={zoom}
              scaleX={scaleX}
              scaleY={scaleY}
              color={color}
              onlyCluster={onlyCluster}
              voteFilter={voteFilter}
              filterFn={filterFn}
              showLabels={showLabels}
              showRatio={showRatio}
              t={t}
              highlightText={highlightText}
              totalArgs={totalArgs}
              enableLazyLoading={true}
              lazyLoadDelay={500}
            />
            {/* お気に入りの表示 */}
            {showFavorites && (
              favorites.map((fav) => (
                <circle
                  key={fav.arg_id}
                  cx={zoom.zoomX(scaleX(fav.x))}
                  cy={zoom.zoomY(scaleY(fav.y))}
                  fill="gold"
                  r={6}
                />
              ))
            )}
          </svg>

          {/* TOOLTIP */}
          {tooltip && (
            <Tooltip
              point={tooltip}
              dimensions={dimensions}
              zoom={zoom}
              expanded={expanded}
              fullScreen={fullScreen}
              translator={translator}
              isFavorite={favorites.some(
                (fav) => fav.arg_id === tooltip.arg_id
              )}
              onToggleFavorite={() =>
                toggleFavorite({
                  arg_id: tooltip.arg_id,
                  argument: tooltip.argument,
                  comment_id: tooltip.comment_id,
                  x: tooltip.x,
                  y: tooltip.y,
                  p: tooltip.p,
                  cluster_id: tooltip.cluster_id,
                })
              }
              colorFunc={color}
              position={tooltipPosition}
              onClose={() => {
                setTooltip(null)
                setExpanded(false)
              }}
            />
          )}
        </div>
        {/* 全画面メニュー */}
        {fullScreen && (
          <DesktopFullscreenTools
            canFilter={!!propertyMap}
            zoomReset={zoom.reset}
            translator={translator}
            exitFullScreen={back!}
            showSettings={showFilterSettings}
            setShowSettings={setShowFilterSettings}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            showTitle={showTitle}
            setShowTitle={setShowTitle}
            showRatio={showRatio}
            setShowRatio={setShowRatio}
            showFavorites={showFavorites}
            setShowFavorites={setShowFavorites}
          />
        )}
        {/* フィルター一覧 */}
        {(fullScreen && propertyMap && showFilterSettings) && (
          <DesktopFullscreenFilter
            translator={translator}
            onClose={() => setShowFilterSettings(false)}
            highlightText={highlightText}
            setHighlightText={setHighlightText}
            propertyMap={propertyMap}
            propertyFilter={propertyFilter}
            setPropertyFilter={setPropertyFilter}
            dataHasVotes={dataHasVotes}
            minVotes={minVotes}
            setMinVotes={setMinVotes}
            minConsensus={minConsensus}
            setMinConsensus={setMinConsensus}
            voteFilter={voteFilter}
          />
        )}
        {/* お気に入り一覧 */}
        {(fullScreen && showFavorites) && (
          <DesktopFullscreenFavorites
            favorites={favorites}
            clusters={clusters}
            translator={translator}
            color={color}
            onlyCluster={onlyCluster}
            removeFavorite={(fav) => {
              setFavorites((prev) => prev.filter((item) => item.arg_id !== fav.arg_id))
            }}
            onClose={() => setShowFavorites(false)}
          />
        )}
      </div>
    </>
  )
}

export default DesktopMap
