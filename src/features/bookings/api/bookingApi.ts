import { api } from '../../../shared/api/httpClient'
import type { Booking } from '../../../shared/types/map'
import type { BookingResponse, CreateBookingRequest } from '../../../shared/types/resource'
import { normalizeBooking, toBookingISO } from '../lib/bookingMappers'

/** Supports both plain booking responses and `{ booking }` gateway wrappers. */
function extractBooking(data: { booking?: BookingResponse } | BookingResponse): BookingResponse {
  if ('booking' in data && data.booking) return data.booking
  return data as BookingResponse
}

/** Creates a booking for the selected resource and normalizes the response for UI use. */
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
    starts_at: toBookingISO(date, timeFrom),
    ends_at: toBookingISO(date, timeTo),
  }
  const { data } = await api.post<{ booking?: BookingResponse } | BookingResponse>('/bookings', payload)
  return normalizeBooking(extractBooking(data))
}

/** Loads non-cancelled bookings for a resource within the requested time range. */
export async function getResourceBookings(
  resourceId: string,
  from: string,
  to: string,
): Promise<BookingResponse[]> {
  const { data } = await api.get<{ bookings?: BookingResponse[] } | BookingResponse[]>(
    `/resources/${resourceId}/bookings`,
    { params: { from, to } },
  )
  const list = Array.isArray(data) ? data : (data.bookings ?? [])
  return list.filter(b => b.status !== 'BOOKING_STATUS_CANCELED')
}

/** Loads the current user's future bookings and maps backend DTOs to app bookings. */
export async function getMyBookings(userId: string): Promise<Booking[]> {
  const { data } = await api.get<{ bookings?: BookingResponse[] } | BookingResponse[]>(
    '/bookings',
    { params: { user_id: userId } },
  )
  const now = new Date()
  const list = Array.isArray(data) ? data : (data.bookings ?? [])
  return list
    .filter(b => b.status !== 'BOOKING_STATUS_CANCELED')
    .filter(b => !b.user_id || b.user_id === userId)
    .filter(b => !b.ends_at || new Date(b.ends_at) > now)
    .map(normalizeBooking)
}

/** Cancels a booking by id. */
export async function cancelBooking(bookingId: string): Promise<void> {
  await api.post(`/bookings/${bookingId}/cancel`)
}
