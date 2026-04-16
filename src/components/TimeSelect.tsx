import { useState, useRef, useEffect } from 'react'
import styles from './TimeSelect.module.css'

const SLOTS = Array.from({ length: 37 }, (_, i) => {
  const total = 9 * 60 + i * 15
  const h = Math.floor(total / 60).toString().padStart(2, '0')
  const m = (total % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}) // 09:00 — 18:00

interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
}

export default function TimeSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className={styles.wrap}>
      <button
        type="button"
        className={`${styles.trigger} ${className ?? ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {value}
      </button>
      {open && (
        <div className={styles.dropdown}>
          {SLOTS.map(s => (
            <button
              key={s}
              type="button"
              className={`${styles.option} ${s === value ? styles.optionActive : ''}`}
              onClick={() => { onChange(s); setOpen(false) }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
