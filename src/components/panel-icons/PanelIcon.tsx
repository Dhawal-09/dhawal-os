import type { CSSProperties } from 'react'
import type { IconAsset } from '../../data/types'
import './PanelIcon.css'

interface PanelIconProps {
  icon: IconAsset
  /** Undefined until the panel's icon URL map has loaded. */
  src: string | undefined
  /** Empty when the icon only repeats the text next to it. */
  alt: string
}

/**
 * Positions the full image so that only its `visible` region fills the
 * slot. The transparent padding around the artwork falls outside the slot;
 * the artwork itself is untouched.
 */
function visibleRegionStyle(icon: IconAsset): CSSProperties | undefined {
  const { visible } = icon
  if (!visible) return undefined
  return {
    position: 'absolute',
    width: `${(icon.width / visible.width) * 100}%`,
    height: `${(icon.height / visible.height) * 100}%`,
    left: `${(-visible.x / visible.width) * 100}%`,
    top: `${(-visible.y / visible.height) * 100}%`,
  }
}

/**
 * One pixel-art icon in a slot sized from the PNG's native dimensions (or,
 * when the icon declares one, its `visible` region), so the layout is final
 * before the image arrives. Height comes from `--panel-icon-size`; the
 * artwork itself is never framed or recoloured.
 */
export function PanelIcon({ icon, src, alt }: PanelIconProps) {
  const box = icon.visible ?? icon
  return (
    <span
      className={icon.visible ? 'panel-icon is-cropped' : 'panel-icon'}
      style={{ aspectRatio: `${box.width} / ${box.height}` }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          width={icon.width}
          height={icon.height}
          decoding="async"
          draggable={false}
          style={visibleRegionStyle(icon)}
        />
      )}
    </span>
  )
}
