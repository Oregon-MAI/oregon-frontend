import type { Booking } from '../../../shared/types/map'
import type { BookingResponse } from '../../../shared/types/resource'

/** Combines a local date and time into the ISO string required by the backend. */
export function toBookingISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

/** Splits an ISO backend timestamp into local UI date and HH:mm values. */
export function fromBookingISO(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

/** Converts current and legacy booking response shapes to the UI booking model. */
export function normalizeBooking(b: BookingResponse): Booking {
  if (b.starts_at && b.ends_at) {
    const { date, time: timeFrom } = fromBookingISO(b.starts_at)
    const { time: timeTo } = fromBookingISO(b.ends_at)
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
