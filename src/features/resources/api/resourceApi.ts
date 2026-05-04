import { api } from '../../../shared/api/httpClient'
import type { Resource, ResourceType, CreateResourceRequest, ChangeResourceStatusRequest } from '../../../types/resource'
import { extractResource, getResourceUpdatePaths, normalizeResource, withTypedResourceDetails } from '../lib/resourceMappers'

export async function getResourcesList(types?: ResourceType[]): Promise<Resource[]> {
  const { data } = await api.get<{ resources: Resource[] }>('/resources/list', {
    params: types?.length ? { type: types } : undefined,
  })
  return data.resources.map(normalizeResource)
}

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

export async function getResource(resource_id: string): Promise<Resource> {
  const { data } = await api.get<{ resource: Resource } | Resource>(`/resources/${resource_id}`)
  const raw = data as Record<string, unknown>
  const resource = (raw.resource ?? data) as Resource
  return normalizeResource(resource)
}

export async function createResource(payload: CreateResourceRequest): Promise<Resource> {
  const { data } = await api.post('/resources', withTypedResourceDetails(payload))
  return extractResource(data)
}

export async function updateResource(resource_id: string, resource: Partial<Resource>): Promise<Resource> {
  const paths = getResourceUpdatePaths(resource)
  const { data } = await api.put(`/resources/${resource_id}`, {
    resource: withTypedResourceDetails(resource),
    paths,
    field_mask: paths.join(','),
  })
  return extractResource(data)
}

export async function changeResourceStatus(payload: ChangeResourceStatusRequest): Promise<Resource> {
  const { data } = await api.patch(`/resources/${payload.resource_id}/status`, {
    status: payload.status,
    reason: payload.reason,
  })
  return extractResource(data)
}

export async function deleteResource(resource_id: string): Promise<boolean> {
  const { data } = await api.delete<{ success: boolean } | boolean>(`/resources/${resource_id}`)
  return typeof data === 'boolean' ? data : data.success
}
