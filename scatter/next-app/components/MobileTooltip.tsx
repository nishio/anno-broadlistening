import React, {CSSProperties} from 'react'
import VideoLink from './VideoLink'
import {Translator} from '@/hooks/useTranslatorAndReplacements'
import {Zoom} from '@/hooks/useZoom'
import {ThumbDown, ThumbUp} from '@/icons'
import {Dimensions, Point} from '@/types'

// Define component types
interface _IconProps {
  className?: string;
}

interface _TooltipStyle extends React.CSSProperties {
  position: 'absolute';
  left?: number;
  right?: number;
  top?: number | string;
  bottom?: number;
  maxWidth?: number;
  maxHeight?: number;
  overflowY: 'auto';
  zIndex: number;
  pointerEvents?: 'none';
}

type TooltipProps = {
  point: Point
  dimensions: Dimensions
  expanded: boolean
  zoom: Zoom
  fullScreen?: boolean
  translator: Translator
}

const Tooltip: React.FC<TooltipProps> = ({
  point,
  dimensions,
  expanded,
  zoom,
  fullScreen,
  translator,
}) => {
  const {scaleX, scaleY, width, height} = dimensions
  const {zoomX, zoomY} = zoom
  const {t} = translator

  // 地図上のポイントの位置を計算
  const x = zoomX(scaleX(point.x))
  const y = zoomY(scaleY(point.y))

  const tooltipWidth = 300  // ツールチップの幅（必要に応じて調整）
  const tooltipHeight = 200 // ツールチップの高さ（必要に応じて調整）

  let style: CSSProperties = {}

  if (!fullScreen) {
    // ツールチップをカーソルの下に表示
    let tooltipLeft = x - tooltipWidth / 2
    let tooltipTop = y + 25 // カーソルから適度な距離を確保

    // 左端からはみ出さないように調整
    if (tooltipLeft < 0) {
      tooltipLeft = 0
    }
    // 右端からはみ出さないように調整
    if (tooltipLeft + tooltipWidth > width) {
      tooltipLeft = width - tooltipWidth
    }
    // 下端からはみ出さないように調整
    if (tooltipTop + tooltipHeight > height) {
      tooltipTop = y - tooltipHeight - 25 // 上に表示し、カーソルとの距離を確保
    }

    style = {
      position: 'absolute',
      left: tooltipLeft,
      top: tooltipTop,
      width: `${tooltipWidth}px`,
      overflowY: 'auto',
      zIndex: 10,
    }
  } else if (expanded) {
    style = {
      position: 'absolute',
      left: x > width / 2 ? undefined : x,
      right: x > width / 2 ? width - x : undefined,
      top: 0,
      maxWidth: Math.min(400, width / 1.3),
      maxHeight: Math.min(500, height / 2),
      overflowY: 'auto',
      zIndex: 10,
    }
  } else {
    style = {
      position: 'absolute',
      left: x > width / 2 ? undefined : x,
      right: x > width / 2 ? width - x : undefined,
      top: y > height / 2 ? undefined : y,
      bottom: y > height / 2 ? height - y : undefined,
      maxWidth: Math.min(400, width / 1.3),
      maxHeight: Math.min(500, height / 2),
      overflowY: 'auto',
      pointerEvents: 'none',
      zIndex: 10,
    }
  }

  return (
    <div
      className="text-left p-4 shadow-sm transition-all duration-300 break-words overflow-y-auto bg-white rounded-md"
      style={{...style, backgroundColor: '#f0f0f0'}}
    >
      <div
        className="font-bold text-base md:text-lg"
        style={{color: point.color}}
      >
        {t(point.cluster)}
      </div>
      <div className="my-2 text-sm md:text-md">{t(point.argument)}</div>
      {(point.agrees || point.disagrees) && (
        <div className="text-xs opacity-80 mb-2 font-bold">
          <ThumbUp className="w-4 inline-block"/> {point.agrees}
          <ThumbDown className="w-4 inline-block ml-3"/> {point.disagrees}
        </div>
      )}
      <VideoLink
        {...point}
        showVideo={false}
        showThumbnail={!expanded}
      />
    </div>
  )
}

export default Tooltip
