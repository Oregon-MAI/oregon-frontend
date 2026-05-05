import type { CreateResourceRequest, Resource } from '../../../types/resource'

export function normalizeResource(r: Resource): Resource {
  const raw = r as unknown as Record<string, unknown>
  const details = raw.details as Record<string, unknown> | undefined
  const type: Resource['type'] = r.type || (raw.resource_type as Resource['type']) || 'RESOURCE_TYPE_UNSPECIFIED'

  return {
    ...r,
    resource_id: r.resource_id || (raw.uuid as string) || r.id || '',
    type,
    meeting_room: r.meeting_room ?? (
      type === 'RESOURCE_TYPE_MEETING_ROOM' && details
        ? { capacity: details.capacity as number, has_projector: !!details.has_projector, has_whiteboard: !!details.has_whiteboard }
        : undefined
    ),
    workspace: r.workspace ?? (
      type === 'RESOURCE_TYPE_WORKSPACE' && details
        ? { has_monitor: !!details.has_monitor }
        : undefined
    ),
    device: r.device ?? (
      type === 'RESOURCE_TYPE_DEVICE' && details
        ? { device_type: details.device_type as string, serial_number: details.serial_number as string, model: details.model as string, description: details.description as string }
        : undefined
    ),
  }
}

export function withTypedResourceDetails<T extends Partial<Resource> | CreateResourceRequest>(resource: T): T {
  const details = resource.details
  if (!details) return resource

  if (resource.type === 'RESOURCE_TYPE_MEETING_ROOM') {
    return { ...resource, meeting_room: details } as T
  }

  if (resource.type === 'RESOURCE_TYPE_WORKSPACE') {
    return { ...resource, workspace: details } as T
  }

  if (resource.type === 'RESOURCE_TYPE_DEVICE') {
    return { ...resource, device: details } as T
  }

  return resource
}

export function getResourceUpdatePaths(resource: Partial<Resource>): string[] {
  const paths: string[] = []
  if (resource.name !== undefined) paths.push('name')
  if (resource.type !== undefined) paths.push('type')
  if (resource.location !== undefined) paths.push('location')
  if (resource.status !== undefined) paths.push('status')
  if (resource.details !== undefined) {
    paths.push('details')
  } else {
    if (resource.meeting_room !== undefined) paths.push('meeting_room')
    if (resource.workspace !== undefined) paths.push('workspace')
    if (resource.device !== undefined) paths.push('device')
  }
  return Array.from(new Set(paths))
}

export function extractResource(data: unknown): Resource {
  if (!data) throw new Error('Пустой ответ от сервера')
  if (typeof data === 'object' && 'resource' in data) {
    const inner = (data as { resource: Resource }).resource
    if (!inner) throw new Error('Пустой ответ от сервера')
    return normalizeResource(inner)
  }
  return normalizeResource(data as Resource)
}
