import { api } from './authApi'
import type { Resource, ResourceType, CreateResourceRequest, ChangeResourceStatusRequest, CreateBookingRequest, BookingResponse } from '../types/resource'
import type { Booking } from '../types/map'

// GET /resources?types[]=...
export async function getResourcesList(types?: ResourceType[]): Promise<Resource[]> {
  const { data } = await api.get<{ resources: Resource[] }>('/resources', {
    params: types?.length ? { types } : undefined,
  })
  return data.resources
}

// GET /resources/available?types[]=...&location=...
export async function getAvailableResources(types?: ResourceType[], location?: string): Promise<{ resources: Resource[]; total_count: number }> {
  const { data } = await api.get<{ resources: Resource[]; total_count: number }>('/resources/available', {
    params: { ...(types?.length ? { types } : {}), ...(location ? { location } : {}) },
  })
  return data
}

// GET /resources/{resource_id}
export async function getResource(resource_id: string): Promise<Resource> {
  const { data } = await api.get<{ resource: Resource }>(`/resources/${resource_id}`)
  return data.resource
}

// POST /resources  (admin only)
export async function createResource(payload: CreateResourceRequest): Promise<Resource> {
  const { data } = await api.post<{ resource: Resource }>('/resources', payload)
  return data.resource
}

// PUT /resources/{resource_id}  (admin only)
export async function updateResource(resource_id: string, resource: Partial<Resource>, fieldPaths: string[]): Promise<Resource> {
  const { data } = await api.put<{ resource: Resource }>(`/resources/${resource_id}`, {
    resource,
    field_mask: { paths: fieldPaths },
  })
  return data.resource
}

// PATCH /resources/{resource_id}/status  (admin only)
export async function changeResourceStatus(payload: ChangeResourceStatusRequest): Promise<Resource> {
  const { data } = await api.patch<{ resource: Resource }>(`/resources/${payload.resource_id}/status`, {
    status: payload.status,
    reason: payload.reason,
  })
  return data.resource
}

// DELETE /resources/{resource_id}  (admin only)
export async function deleteResource(resource_id: string): Promise<boolean> {
  const { data } = await api.delete<{ success: boolean }>(`/resources/${resource_id}`)
  return data.success
}

// POST /bookings
export async function createBooking(payload: CreateBookingRequest): Promise<Booking> {
  const { data } = await api.post<BookingResponse>('/bookings', payload)
  return {
    id: data.id,
    resourceId: data.resource_id,
    resourceName: data.resource_name,
    date: data.date,
    timeFrom: data.time_from,
    timeTo: data.time_to,
  }
}

// GET /bookings/my
export async function getMyBookings(): Promise<Booking[]> {
  const { data } = await api.get<BookingResponse[]>('/bookings/my')
  return data.map(b => ({
    id: b.id,
    resourceId: b.resource_id,
    resourceName: b.resource_name,
    date: b.date,
    timeFrom: b.time_from,
    timeTo: b.time_to,
  }))
}

// DELETE /bookings/{id}
export async function cancelBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`)
}
