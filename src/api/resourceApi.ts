import { api } from './authApi'
import type { Resource, ResourceType, CreateResourceRequest, ChangeResourceStatusRequest, CreateBookingRequest, BookingResponse } from '../types/resource'
import type { Booking } from '../types/map'

function normalizeResource(r: Resource): Resource {
  const raw = r as unknown as Record<string, unknown>
  const details = raw.details as Record<string, unknown> | undefined
  const type: Resource['type'] = r.type || (raw.resource_type as Resource['type']) || 'RESOURCE_TYPE_UNSPECIFIED'

  return {
    ...r,
    resource_id: r.resource_id || (raw.uuid as string) || r.id || '',
    type,
    // бэкенд отдаёт детали в поле details вместо meeting_room / workspace / device
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

// GET /resources/list?type[]=...
export async function getResourcesList(types?: ResourceType[]): Promise<Resource[]> {
  const { data } = await api.get<{ resources: Resource[] }>('/resources/list', {
    params: types?.length ? { type: types } : undefined,
  })
  return data.resources.map(normalizeResource)
}

// GET /resources?type[]=...&location=...
export async function getAvailableResources(types?: ResourceType[], location?: string): Promise<{ resources: Resource[]; total_count: number }> {
  const { data } = await api.get<{ resources: Resource[]; total_count: number }>('/resources', {
    params: { ...(types?.length ? { type: types } : {}), ...(location ? { location } : {}) },
  })
  return data
}

// GET /resources/{resource_id}
export async function getResource(resource_id: string): Promise<Resource> {
  const { data } = await api.get<{ resource: Resource } | Resource>(`/resources/${resource_id}`)
  const raw = data as Record<string, unknown>
  const resource = (raw.resource ?? data) as Resource
  return normalizeResource(resource)
}

function extractResource(data: unknown): Resource {
  if (!data) throw new Error('Пустой ответ от сервера')
  if (typeof data === 'object' && 'resource' in data) {
    const inner = (data as { resource: Resource }).resource
    if (!inner) throw new Error('Пустой ответ от сервера')
    return normalizeResource(inner)
  }
  return normalizeResource(data as Resource)
}

// POST /resources  (admin only)
export async function createResource(payload: CreateResourceRequest): Promise<Resource> {
  const { data } = await api.post('/resources', payload)
  return extractResource(data)
}

// PUT /resources/{resource_id}  (admin only)
export async function updateResource(resource_id: string, resource: Partial<Resource>): Promise<Resource> {
  const { data } = await api.put(`/resources/${resource_id}`, {
    resource_id,
    ...resource,
  })
  return extractResource(data)
}

// PATCH /resources/{resource_id}/status  (admin only)
export async function changeResourceStatus(payload: ChangeResourceStatusRequest): Promise<Resource> {
  const { data } = await api.patch(`/resources/${payload.resource_id}/status`, {
    status: payload.status,
    reason: payload.reason,
  })
  return extractResource(data)
}

// DELETE /resources/{resource_id}  (admin only)
export async function deleteResource(resource_id: string): Promise<boolean> {
  const { data } = await api.delete<{ success: boolean } | boolean>(`/resources/${resource_id}`)
  return typeof data === 'boolean' ? data : data.success
}

// ─── Booking helpers ─────────────────────────────────────────────────────────

/** Convert local date string "YYYY-MM-DD" + time "HH:MM" → UTC ISO timestamp */
function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

/** Parse UTC ISO timestamp → local date "YYYY-MM-DD" + time "HH:MM" */
function fromISO(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function normalizeBooking(b: BookingResponse): Booking {
  // gRPC gateway response
  if (b.starts_at && b.ends_at) {
    const { date, time: timeFrom } = fromISO(b.starts_at)
    const { time: timeTo } = fromISO(b.ends_at)
    return {
      id: b.booking_id ?? b.id ?? '',
      resourceId: b.resource_id ?? '',
      resourceName: b.resource_name ?? b.resource_id ?? '',
      date,
      timeFrom,
      timeTo,
      resourceType: b.resource_type,
      resourceLocation: b.resource_location,
    }
  }
  // legacy format fallback
  return {
    id: b.id ?? b.booking_id ?? '',
    resourceId: b.resource_id ?? '',
    resourceName: b.resource_name ?? '',
    date: b.date ?? '',
    timeFrom: b.time_from ?? '',
    timeTo: b.time_to ?? '',
    resourceType: b.resource_type,
    resourceLocation: b.resource_location,
  }
}

// POST /bookings
export async function createBooking(
  resourceId: string,
  userId: string,
  date: string,
  timeFrom: string,
  timeTo: string,
): Promise<Booking> {
  const payload: CreateBookingRequest = {
    resource_id: resourceId,
    user_id: userId,
    starts_at: toISO(date, timeFrom),
    ends_at: toISO(date, timeTo),
  }
  const { data } = await api.post<BookingResponse>('/bookings', payload)
  return normalizeBooking(data)
}

// GET /bookings?user_id={user_id}  (ListBookingsByUser)
export async function getMyBookings(userId: string): Promise<Booking[]> {
  const { data } = await api.get<{ bookings?: BookingResponse[] } | BookingResponse[]>(
    '/bookings',
    { params: { user_id: userId } },
  )
  const list = Array.isArray(data) ? data : (data.bookings ?? [])
  return list.map(normalizeBooking)
}

// POST /bookings/{booking_id}/cancel  (UserCancelBooking)
export async function cancelBooking(bookingId: string): Promise<void> {
  await api.post(`/bookings/${bookingId}/cancel`)
}
