import type { Desk } from '../../types/map'
import styles from './BookingPanel.module.css'
import { useState } from 'react'
import { createBooking } from '../../api/resourceApi'

// Все слоты по 15 минут с 09:00 до 15:30
const ALL_SLOTS = [
  '09:00','09:15','09:30','09:45','10:00',
  '10:15','10:30','10:45','11:00','11:15',
  '11:30','11:45','12:00','12:15','12:30',
  '12:45','13:00','13:15','13:30','13:45',
  '14:00','14:15','14:30','14:45','15:00',
  '15:15','15:30',
]

interface Props {
  desk: Desk | null
  onClose: () => void
  onBooked?: () => void
}

export default function BookingPanel({ desk, onClose, onBooked }: Props) {
  const [startSlot, setStartSlot] = useState<string | null>(null)
  const [endSlot, setEndSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState<'idle' | 'loading' | 'error'>('idle')

  if (!desk) return null
  function handleClose() {
  setStartSlot(null)
  setEndSlot(null)
  onClose()
  }

  function handleSlotClick(slot: string) {
  // Первый клик — начало
  if (!startSlot) {
    setStartSlot(slot)
    setEndSlot(null)
    return
  }

  // Клик на тот же слот — сброс
  if (slot === startSlot) {
    setStartSlot(null)
    setEndSlot(null)
    return
  }

  // Если кликнули раньше начала — меняем начало
  if (ALL_SLOTS.indexOf(slot) < ALL_SLOTS.indexOf(startSlot)) {
    setStartSlot(slot)
    setEndSlot(null)
    return
  }

  // Второй клик — конец
  setEndSlot(slot)
  }
  function isInRange(slot: string): boolean {
  if (!startSlot || !endSlot) return false
  const i = ALL_SLOTS.indexOf(slot)
  const start = ALL_SLOTS.indexOf(startSlot)
  const end = ALL_SLOTS.indexOf(endSlot)
  return i >= start && i <= end
}
  return (
    <>
      {/* Затемнение фона */}
      <div className={styles.overlay} onClick={handleClose} />

      {/* Панель */}
      <div className={styles.panel}>
        {/* Заголовок */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>
              Рабочее место <span className={styles.titleAccent}>{desk.id}</span>
            </div>
            <div className={styles.subtitle}>
              БЦ «Арена» · 11 этаж · Зона {desk.zone} — {desk.zoneName ?? `Зона ${desk.zone}`}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose}>×</button>
        </div>

        {/* Удобства */}
        {desk.amenities.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Удобства</div>
            <div className={styles.amenities}>
              {desk.amenities.map(a => (
                <span key={a} className={styles.amenity}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Выбор времени */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Выбор времени · 1 марта 2026</div>
          <div className={styles.slotsHint}>
            Интервал 15 минут · нажмите начало и конец
          </div>
          <div className={styles.slots}>
            {ALL_SLOTS.map(slot => {
                const isBusy = desk.bookedSlots.includes(slot)
                const isStart = slot === startSlot
                const isEnd = slot === endSlot
                const inRange = isInRange(slot)

        return (
            <button
              key={slot}
              disabled={isBusy}
              onClick={() => !isBusy && handleSlotClick(slot)}
              className={`
                ${styles.slot}
                ${isBusy ? styles.slotBusy : ''}
                ${(isStart || isEnd) ? styles.slotSelected : ''}
                ${(inRange && !isStart && !isEnd) ? styles.slotRange : ''}
              `}
            >
              {slot}
            </button>
          )
        })}
          </div>
        </div>

        {/* Кнопки */}
        <div className={styles.footer}>
          <button
            className={styles.btnBook}
            disabled={!startSlot || !endSlot || booking === 'loading'}
            onClick={async () => {
              if (!startSlot || !endSlot || !desk?.resourceId) return
              setBooking('loading')
              try {
                await createBooking({
                  resource_id: desk.resourceId,
                  date: new Date().toISOString().slice(0, 10),
                  time_from: startSlot,
                  time_to: endSlot,
                })
                setBooking('idle')
                onBooked?.()
                handleClose()
              } catch {
                setBooking('error')
              }
            }}
          >
            {booking === 'loading' ? 'Бронирование...' : 'Забронировать'}
          </button>
          <button className={styles.btnCancel} onClick={onClose}>Отмена</button>
        </div>
        {booking === 'error' && (
          <div className={styles.bookingError}>Не удалось забронировать. Попробуйте ещё раз.</div>
        )}
      </div>
    </>
  )
}