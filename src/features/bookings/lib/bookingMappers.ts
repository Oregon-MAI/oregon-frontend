import type { Booking } from '../../../types/map'
import type { BookingResponse } from '../../../types/resource'

export function toBookingISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

export function fromBookingISO(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

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
