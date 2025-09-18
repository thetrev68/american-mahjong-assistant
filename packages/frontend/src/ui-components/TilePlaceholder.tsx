import { getTileStateClass } from '../features/gameplay/TileStates'
import type { PlayerTile } from 'shared-types'

interface TilePlaceholderProps {
  tile: PlayerTile
  width?: string
  height?: string
}

export const TilePlaceholder = ({
  tile,
  width = '52px',
  height = '69px'
}: TilePlaceholderProps) => {
  return (
    <div
      className={`${getTileStateClass('placeholder')} rounded-lg flex flex-col items-center justify-center text-xs font-medium text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300`}
      style={{ width, height }}
    >
      <div className="text-[10px] opacity-75">Tile</div>
      <div className="font-bold">{tile.id}</div>
      <div className="text-[8px] opacity-50">Selected</div>
    </div>
  )
}