export interface WorkspaceMapLocation {
  floor: number
  x?: number
  y?: number
  rotate?: number
}

export function parseWorkspaceLocation(location?: string): WorkspaceMapLocation | null {
  if (!location?.trim()) return null

  try {
    const parsed = JSON.parse(location) as Partial<WorkspaceMapLocation>
    const floor = Number(parsed.floor)
    if (Number.isFinite(floor) && floor > 0) {
      return {
        floor,
        x: Number.isFinite(Number(parsed.x)) ? Number(parsed.x) : undefined,
        y: Number.isFinite(Number(parsed.y)) ? Number(parsed.y) : undefined,
        rotate: Number.isFinite(Number(parsed.rotate)) ? Number(parsed.rotate) : undefined,
      }
    }
  } catch {
    // Older resources store a human-readable string such as "20 этаж".
  }

  const floor = Number(location.match(/\d+/)?.[0])
  return Number.isFinite(floor) && floor > 0 ? { floor } : null
}

export function serializeWorkspaceLocation(location: WorkspaceMapLocation): string {
  const payload: WorkspaceMapLocation = {
    floor: location.floor,
  }

  if (location.x !== undefined) payload.x = Math.round(location.x)
  if (location.y !== undefined) payload.y = Math.round(location.y)
  if (location.rotate !== undefined) payload.rotate = Math.round(location.rotate)

  return JSON.stringify(payload)
}

export function getWorkspaceFloor(location?: string): number | null {
  return parseWorkspaceLocation(location)?.floor ?? null
}

export function formatWorkspaceLocation(location?: string): string {
  const parsed = parseWorkspaceLocation(location)
  if (!parsed) return location || '—'

  return `${parsed.floor} этаж`
}
