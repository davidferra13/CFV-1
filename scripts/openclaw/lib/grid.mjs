// Grid walker - divides state bounding boxes into small cells for systematic coverage.
// Each cell is ~0.08 degrees (roughly 8-9km), small enough to avoid Overpass timeouts.

import config from '../config.json' with { type: 'json' }

const CELL_SIZE = config.grid.cellSize

/**
 * Generate all grid cells for a state bounding box.
 * Returns array of { id, bbox: [south, west, north, east] }
 */
export function generateCells(stateCode, stateBbox) {
  const [south, west, north, east] = stateBbox
  const cells = []

  for (let lat = south; lat < north; lat += CELL_SIZE) {
    for (let lon = west; lon < east; lon += CELL_SIZE) {
      const cellSouth = parseFloat(lat.toFixed(4))
      const cellWest = parseFloat(lon.toFixed(4))
      const cellNorth = parseFloat(Math.min(lat + CELL_SIZE, north).toFixed(4))
      const cellEast = parseFloat(Math.min(lon + CELL_SIZE, east).toFixed(4))

      cells.push({
        id: `${stateCode}_${cellSouth}_${cellWest}`,
        state: stateCode,
        bbox: [cellSouth, cellWest, cellNorth, cellEast],
      })
    }
  }

  return cells
}

/**
 * Count total cells for a state (for progress reporting).
 */
export function countCells(stateBbox) {
  const [south, west, north, east] = stateBbox
  const rows = Math.ceil((north - south) / CELL_SIZE)
  const cols = Math.ceil((east - west) / CELL_SIZE)
  return rows * cols
}
