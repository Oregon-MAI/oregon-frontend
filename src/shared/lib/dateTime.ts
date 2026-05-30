const BOOKING_DAY_END_HOUR = 19

/** Formats a Date as a local YYYY-MM-DD string without UTC timezone shifts. */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Returns today's booking date, or tomorrow after the booking day is over. */
export function getDefaultBookingDate(now: Date = new Date()): string {
  if (now.getHours() < BOOKING_DAY_END_HOUR) return formatLocalDate(now)
  return formatLocalDate(new Date(now.getTime() + 86400000))
}

/** Extracts local HH:mm from an ISO/RFC3339 timestamp returned by the backend. */
export function isoToLocalTime(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/** Converts an HH:mm value to minutes since midnight for timeline calculations. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/** Returns today's date in local YYYY-MM-DD format. */
export function getTodayDate(): string {
  return formatLocalDate()
}
