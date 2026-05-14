import { useState, useEffect } from 'react'
import type { Resource, ResourceStatus } from '../../types/resource'
import { getResourceBookings } from '../../features/bookings/api/bookingApi'
import { getResourcesList, createResource, updateResource, deleteResource, changeResourceStatus } from '../../features/resources/api/resourceApi'

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
import styles from './AdminWorkspacesPage.module.css'

const PAGE_SIZE = 7

function statusLabel(s: ResourceStatus): { text: string; cls: string } {
  switch (s) {
    case 'RESOURCE_STATUS_AVAILABLE':  return { text: 'Доступно',   cls: 'available' }
    case 'RESOURCE_STATUS_OCCUPIED':   return { text: 'Занято',     cls: 'occupied' }
    default:                           return { text: 'Недоступно', cls: 'maintenance' }
  }
}

function effectiveStatus(r: Resource, bookedNowIds: Set<string>): ResourceStatus {
  if (r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY') return r.status
  return bookedNowIds.has(r.resource_id) ? 'RESOURCE_STATUS_OCCUPIED' : 'RESOURCE_STATUS_AVAILABLE'
}

interface EquipmentForm {
  name: string
  location: string
  device_type: string
  model: string
  serial_number: string
  description: string
  unavailable: boolean
  unavailableReason: string
}

const EMPTY_FORM: EquipmentForm = {
  name: '', location: '', device_type: '', model: '', serial_number: '', description: '',
  unavailable: false, unavailableReason: '',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}
function IconChevronLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
}
function IconChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
}

function EquipmentModal({ mode, initial, onSave, onClose }: {
  mode: 'add' | 'edit'
  initial: EquipmentForm
  onSave: (form: EquipmentForm) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<EquipmentForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof EquipmentForm>(field: K, value: EquipmentForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Введите название'); return }
    if (form.name.trim().length < 2) { setError('Название слишком короткое'); return }
    if (!form.location.trim()) { setError('Введите локацию'); return }
    if (!form.device_type.trim()) { setError('Выберите тип устройства'); return }
    if (form.serial_number.trim() && !/^[\w\-]+$/.test(form.serial_number.trim())) {
      setError('Серийный номер может содержать только буквы, цифры и дефис'); return
    }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{mode === 'add' ? 'Добавить технику' : `Изменить ${initial.name}`}</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНОВНАЯ ИНФОРМАЦИЯ</div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название *</label>
                <input className={styles.formInput} placeholder='MacBook Pro 14"' value={form.name}
                  onChange={e => set('name', e.target.value)} readOnly={mode === 'edit'} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Тип устройства *</label>
                <select className={styles.formInput} value={form.device_type} onChange={e => set('device_type', e.target.value)}>
                  <option value="">Выберите тип</option>
                  <option value="laptop">Ноутбук</option>
                  <option value="monitor">Монитор</option>
                  <option value="camera">Камера</option>
                  <option value="projector">Проектор</option>
                  <option value="tv">Телевизор</option>
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Локация *</label>
              <input className={styles.formInput} placeholder="20 этаж · Крыло А" value={form.location}
                onChange={e => set('location', e.target.value)} />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ХАРАКТЕРИСТИКИ</div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Модель</label>
                <input className={styles.formInput} placeholder="Apple M3 Pro" value={form.model}
                  onChange={e => set('model', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Серийный номер</label>
                <input className={styles.formInput} placeholder="SN123456" value={form.serial_number}
                  onChange={e => set('serial_number', e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Описание</label>
              <textarea className={styles.formTextarea} rows={2} value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ВРЕМЕННАЯ НЕДОСТУПНОСТЬ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div className={`${styles.toggle} ${form.unavailable ? styles.toggleOn : ''}`}
                  role="switch" aria-checked={form.unavailable} tabIndex={0}
                  onClick={() => set('unavailable', !form.unavailable)}
                  onKeyDown={e => e.key === 'Enter' && set('unavailable', !form.unavailable)}>
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Отметить как временно недоступную</span>
              </label>
            </div>
            {form.unavailable && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Причина</label>
                <textarea className={styles.formTextarea} rows={2} value={form.unavailableReason}
                  onChange={e => set('unavailableReason', e.target.value)} />
              </div>
            )}
          </div>

          {error && <div className={styles.formError}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : '✓ Сохранить'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminEquipmentPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bookedSlotsMap, setBookedSlotsMap] = useState<Map<string, string[]>>(new Map())
  const [bookedNowIds, setBookedNowIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const dayFrom = new Date(`${today}T00:00:00`).toISOString()
    const dayTo   = new Date(`${today}T23:59:59`).toISOString()
    getResourcesList(['RESOURCE_TYPE_DEVICE'])
      .then(async list => {
        const devices = list.filter(r => r.type === 'RESOURCE_TYPE_DEVICE')
        setResources(devices)
        const bookingsPerResource = await Promise.all(
          devices.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        const now = new Date()
        const m = new Map<string, string[]>()
        const nowSet = new Set<string>()
        devices.forEach((r, i) => {
          const slots = bookingsPerResource[i]
            .filter(b => b.starts_at && b.ends_at)
            .map(b => `${isoToTime(b.starts_at!)}–${isoToTime(b.ends_at!)}`)
          if (slots.length > 0) m.set(r.resource_id, slots)
          const active = bookingsPerResource[i].some(
            b => b.starts_at && b.ends_at && new Date(b.starts_at) <= now && new Date(b.ends_at) >= now
          )
          if (active) nowSet.add(r.resource_id)
        })
        setBookedSlotsMap(m)
        setBookedNowIds(nowSet)
      })
      .catch(() => setError('Не удалось загрузить технику'))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const totalPages = Math.max(1, Math.ceil(resources.length / PAGE_SIZE))
  const pageItems = resources.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resourceToForm(r: Resource): EquipmentForm {
    return {
      name: r.name,
      location: r.location,
      device_type: r.device?.device_type ?? '',
      model: r.device?.model ?? '',
      serial_number: r.device?.serial_number ?? '',
      description: r.device?.description ?? '',
      unavailable: r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY',
      unavailableReason: '',
    }
  }

  async function handleAdd(form: EquipmentForm) {
    const created = await createResource({
      name: form.name,
      type: 'RESOURCE_TYPE_DEVICE',
      location: form.location,
      details: { device_type: form.device_type, model: form.model, serial_number: form.serial_number, description: form.description },
    })
    if (form.unavailable) {
      await changeResourceStatus({ resource_id: created.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
      created.status = 'RESOURCE_STATUS_MAINTENANCE'
    }
    setResources(prev => [created, ...prev])
    showToast(`${form.name} добавлена`)
  }

  async function handleEdit(form: EquipmentForm) {
    if (!editTarget) return
    const updated = await updateResource(
      editTarget.resource_id,
      {
        name: form.name,
        type: 'RESOURCE_TYPE_DEVICE',
        location: form.location,
        status: editTarget.status,
        details: { device_type: form.device_type, model: form.model, serial_number: form.serial_number, description: form.description },
      },
    )
    if (form.unavailable && editTarget.status === 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
      updated.status = 'RESOURCE_STATUS_MAINTENANCE'
    } else if (!form.unavailable && editTarget.status !== 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_AVAILABLE', reason: '' })
      updated.status = 'RESOURCE_STATUS_AVAILABLE'
    }
    setResources(prev => prev.map(r => r.resource_id === updated.resource_id ? updated : r))
    showToast(`${form.name} обновлена`)
  }

  async function handleDelete(id: string) {
    await deleteResource(id)
    setResources(prev => prev.filter(r => r.resource_id !== id))
    setDeleteConfirm(null)
    showToast('Техника удалена')
  }

  const DEVICE_TYPE_LABELS: Record<string, string> = {
    laptop: 'Ноутбук', monitor: 'Монитор', camera: 'Камера', projector: 'Проектор', tv: 'Телевизор',
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Техника</h1>
          <p className={styles.pageSubtitle}>{resources.length} единиц · БЦ «Арена»</p>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.btnPrimary} onClick={() => { setEditTarget(null); setShowModal(true) }}>
            <IconPlus /> Добавить технику
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? <div className={styles.loadingMsg}>Загрузка...</div>
          : error ? <div className={styles.errorMsg}>{error}</div>
          : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>НАЗВАНИЕ</th>
                    <th className={styles.th}>ТИП</th>
                    <th className={styles.th}>МОДЕЛЬ</th>
                    <th className={styles.th}>ЛОКАЦИЯ</th>
                    <th className={styles.th}>СТАТУС</th>
                    <th className={styles.th}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(r => {
                    const { text, cls } = statusLabel(effectiveStatus(r, bookedNowIds))
                    return (
                      <tr key={r.resource_id} className={styles.tr}>
                        <td className={styles.td}><span className={styles.idLink}>{r.name}</span></td>
                        <td className={styles.td}>{DEVICE_TYPE_LABELS[r.device?.device_type ?? ''] ?? r.device?.device_type ?? '—'}</td>
                        <td className={styles.td}><span className={styles.amenities}>{r.device?.model || '—'}</span></td>
                        <td className={styles.td}><span className={styles.location}>{r.location || '—'}</span></td>
                        <td className={styles.td}>
                          <span className={`${styles.statusBadge} ${styles[`status_${cls}`]}`}>● {text}</span>
                          {bookedSlotsMap.get(r.resource_id)?.map((s, i) => (
                            <span key={i} className={styles.slotBadge}>{s}</span>
                          ))}
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actions}>
                            <button type="button" className={styles.btnEdit} onClick={() => { setEditTarget(r); setShowModal(true) }}>Изменить</button>
                            <button type="button" className={styles.btnDelete} onClick={() => setDeleteConfirm(r.resource_id)}>Удалить</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {pageItems.length === 0 && <tr><td colSpan={6} className={styles.emptyRow}>Техника не найдена</td></tr>}
                </tbody>
              </table>

              <div className={styles.tableFooter}>
                <span className={styles.footerInfo}>Показано {pageItems.length} из {resources.length}</span>
                <div className={styles.pagination}>
                  <button type="button" className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><IconChevronLeft /></button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" className={`${styles.pageBtn} ${page === n ? styles.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button type="button" className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><IconChevronRight /></button>
                </div>
              </div>
            </>
          )}
      </div>

      {showModal && (
        <EquipmentModal
          mode={editTarget ? 'edit' : 'add'}
          initial={editTarget ? resourceToForm(editTarget) : EMPTY_FORM}
          onSave={editTarget ? handleEdit : handleAdd}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}

      {deleteConfirm && (
        <>
          <div className={styles.overlay} onClick={() => setDeleteConfirm(null)} />
          <div className={styles.confirmModal}>
            <p className={styles.confirmText}>Удалить технику?</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button type="button" className={styles.btnDanger} onClick={() => handleDelete(deleteConfirm)}>Удалить</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
