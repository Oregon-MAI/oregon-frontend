import { api } from '../../../shared/api/httpClient'
import type { Resource, ResourceType, CreateResourceRequest, ChangeResourceStatusRequest } from '../../../shared/types/resource'
import { extractResource, normalizeResource, withTypedResourceDetails } from '../lib/resourceMappers'

/** Loads resources for admin/list screens and normalizes backend detail fields. */
export async function getResourcesList(types?: ResourceType[]): Promise<Resource[]> {
  const { data } = await api.get<{ resources: Resource[] }>('/resources/list', {
    params: types?.length ? { type: types } : undefined,
  })
  return data.resources.map(normalizeResource)
}

/** Requests resources available for an optional type/location/time filter. */
export async function getAvailableResources(
  types?: ResourceType[],
  location?: string,
  startsAt?: string,
  endsAt?: string,
): Promise<{ resources: Resource[]; total_count: number }> {
  const { data } = await api.get<{ resources: Resource[]; total_count: number }>('/resources', {
    params: {
      ...(types?.length ? { type: types } : {}),
      ...(location ? { location } : {}),
      ...(startsAt ? { starts_at: startsAt } : {}),
      ...(endsAt ? { ends_at: endsAt } : {}),
    },
  })
  return data
}

/** Loads one resource by id and unwraps possible gateway response shapes. */
export async function getResource(resource_id: string): Promise<Resource> {
  const { data } = await api.get<{ resource: Resource } | Resource>(`/resources/${resource_id}`)
  const raw = data as Record<string, unknown>
  const resource = (raw.resource ?? data) as Resource
  return normalizeResource(resource)
}

/** Creates a resource, ensuring details are sent in the backend-compatible shape. */
export async function createResource(payload: CreateResourceRequest): Promise<Resource> {
  const { data } = await api.post('/resources', withTypedResourceDetails(payload))
  return extractResource(data)
}

/** Updates core resource fields and domain-specific details. */
export async function updateResource(resource_id: string, resource: Partial<Resource>): Promise<Resource> {
  const { meeting_room, workspace, device, ...rest } = resource
  const details = resource.details ?? meeting_room ?? workspace ?? device

  const { data } = await api.put(`/resources/${resource_id}`, {
    name: rest.name,
    type: rest.type,
    location: rest.location,
    status: rest.status,
    details: details ?? {},
  })
  return extractResource(data)
}

/** Changes resource availability status with an audit reason. */
export async function changeResourceStatus(payload: ChangeResourceStatusRequest): Promise<Resource> {
  const { data } = await api.patch(`/resources/${payload.resource_id}/status`, {
    status: payload.status,
    reason: payload.reason,
  })
  return extractResource(data)
}

/** Deletes a resource and returns the backend success flag. */
export async function deleteResource(resource_id: string): Promise<boolean> {
  const { data } = await api.delete<{ success: boolean } | boolean>(`/resources/${resource_id}`)
  return typeof data === 'boolean' ? data : data.success
}
