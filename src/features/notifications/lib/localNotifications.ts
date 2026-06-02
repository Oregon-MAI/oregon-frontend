const LOCAL_NOTIFICATION_EVENT = 't1:local-notification'

export type LocalNotificationPayload = {
  id: string
  title: string
  message: string
}

type BookingNotificationPayload = {
  bookingId: string
  resourceName: string
  date: string
  timeFrom: string
  timeTo: string
}

export function dispatchLocalNotification(payload: LocalNotificationPayload) {
  window.dispatchEvent(new CustomEvent<LocalNotificationPayload>(LOCAL_NOTIFICATION_EVENT, {
    detail: payload,
  }))
}

export function listenLocalNotifications(
  handler: (payload: LocalNotificationPayload) => void,
): () => void {
  function handleEvent(event: Event) {
    handler((event as CustomEvent<LocalNotificationPayload>).detail)
  }

  window.addEventListener(LOCAL_NOTIFICATION_EVENT, handleEvent)
  return () => window.removeEventListener(LOCAL_NOTIFICATION_EVENT, handleEvent)
}

export function dispatchBookingNotification({
  bookingId,
  resourceName,
  date,
  timeFrom,
  timeTo,
}: BookingNotificationPayload) {
  const fallbackId = `${resourceName}-${date}-${timeFrom}-${timeTo}-${Date.now()}`

  dispatchLocalNotification({
    id: `booking-created-${bookingId || fallbackId}`,
    title: 'Бронь создана',
    message: `${resourceName} забронировано на ${date} ${timeFrom}-${timeTo}`,
  })
}
