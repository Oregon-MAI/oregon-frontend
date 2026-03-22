import type { Desk } from '../../types/map'
import styles from './BookingPanel.module.css'

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
}

export default function BookingPanel({ desk, onClose }: Props) {
  if (!desk) return null

  return (
    <>
      {/* Затемнение фона */}
      <div className={styles.overlay} onClick={onClose} />

      {/* Панель */}
      <div className={styles.panel}>
        {/* Заголовок */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>
              Рабочее место <span className={styles.titleAccent}>{desk.id}</span>
            </div>
            <div className={styles.subtitle}>
              БЦ «Арена» · 11 этаж · Зона {desk.zone} — {desk.zoneName}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
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
              return (
                <button
                  key={slot}
                  className={`${styles.slot} ${isBusy ? styles.slotBusy : ''}`}
                  disabled={isBusy}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>

        {/* Кнопки */}
        <div className={styles.footer}>
          <button className={styles.btnBook}>Забронировать</button>
          <button className={styles.btnCancel} onClick={onClose}>Отмена</button>
        </div>
      </div>
    </>
  )
}