import {BookmarkCheckIcon, BookmarkIcon} from 'lucide-react'
import React, {type CSSProperties as _CSSProperties} from 'react'
import {ColorFunc} from '@/hooks/useClusterColor'
import {Translator} from '@/hooks/useTranslatorAndReplacements'
import {Dimensions, Point} from '@/types'

// Define component types
type _TooltipStyle = React.CSSProperties & {
  position: 'absolute';
  left?: string | number;
  top?: string | number;
  transform?: string;
  background: string;
  padding: string;
  borderRadius: string;
  maxWidth: string;
  zIndex: number;
  pointerEvents?: 'none';
}

type TooltipProps = {
  point: Point
  dimensions: Dimensions
  zoom: any
  expanded: boolean
  fullScreen: boolean
  translator: Translator
  isFavorite: boolean
  onToggleFavorite: () => void
  colorFunc: ColorFunc
  position: { x: number; y: number }
  onClose: () => void
}

function Tooltip(props: TooltipProps) {
  const {
    point,
    expanded,
    position,
    onClose,
    isFavorite,
    onToggleFavorite,
    colorFunc,
    translator,
  } = props

  const {t} = translator

  const tooltipStyle: React.CSSProperties = expanded
    ? {
      // ツールチップが展開されている場合のスタイル
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '600px',
      zIndex: 1000,
    }
    : {
      // ホバリング時のツールチップスタイル
      position: 'absolute',
      left: position.x,
      top: position.y,
      transform: 'translate(15px, -15px)', // カーソルから少し離して表示
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '10px',
      borderRadius: '4px',
      maxWidth: '300px',
      zIndex: 1000,
      pointerEvents: 'none', // ホバリング時はマウスイベントを無視
    }


  return (
    <>
      {(expanded) && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}
      <div style={tooltipStyle}>
        {expanded && (
          <button onClick={onClose} style={{float: 'right'}}>
            {t('Close')}
          </button>
        )}
        {/* ツールチップの内容 */}
        <div style={{display: 'flex', alignItems: 'center'}}>
          <h3 style={{color: colorFunc(point.cluster_id), margin: 0}}
            className="text-base sm:text-base md:text-base font-bold">
            {/* ラベルを大きくする */}
            {translator.t(point.cluster)}
          </h3>
          {/* お気に入りボタン */}
          <button
            onClick={() => onToggleFavorite()}
            className="text-gray-300 text-lg focus:outline-none ml-2"
            aria-label={
              isFavorite ? t('お気に入りから削除') : t('お気に入りに追加')
            }
            style={{marginLeft: '8px'}}
          >
            {isFavorite ? <BookmarkCheckIcon className={'text-amber-500'}/> : <BookmarkIcon/>}
          </button>
        </div>
        <p className="text-sm sm:text-sm md:text-md mt-2">{point.argument}</p>
        {expanded && point.comment && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm sm:text-sm md:text-sm">要約元のコメント</p>
            <p className="text-xs sm:text-xs md:text-xs">{point.comment}</p>
          </div>
        )}
      </div>
    </>
  )
}

export default Tooltip
