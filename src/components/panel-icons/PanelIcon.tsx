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
 * One pixel-art icon in a slot sized from the PNG's native dimensions, so
 * the layout is final before the image arrives. Height comes from
 * `--panel-icon-size`; the artwork itself is never framed or recoloured.
 */
export function PanelIcon({ icon, src, alt }: PanelIconProps) {
  return (
    <span
      className="panel-icon"
      style={{ aspectRatio: `${icon.width} / ${icon.height}` }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          width={icon.width}
          height={icon.height}
          decoding="async"
          draggable={false}
        />
      )}
    </span>
  )
}
