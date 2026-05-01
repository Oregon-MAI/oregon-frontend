import { useState, useEffect } from 'react'
import type { Resource, ResourceStatus } from '../../types/resource'
import {
  getResourcesList,
  createResource,
  updateResource,
  deleteResource,
  changeResourceStatus,
  getResourceBookings,
} from '../../api/resourceApi'
import styles from './AdminWorkspacesPage.module.css'


const ZONES = ['A', 'B', 'D'] as const
type Zone = typeof ZONES[number]

const ZONE_NAMES: Record<Zone, string> = {
  A: 'Разработка',
  B: 'Аналитика',
  D: 'Дизайн',
}

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

interface WorkspaceForm {
  zone: Zone
  number: string
  floor: string
  has_monitor: boolean
  unavailable: boolean
  unavailableReason: string
}

const EMPTY_FORM: WorkspaceForm = {
  zone: 'A',
  number: '',
  floor: '',
  has_monitor: false,
  unavailable: false,
  unavailableReason: '',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function WorkspaceModal({ mode, initial, onSave, onClose }: {
  mode: 'add' | 'edit'
  initial: WorkspaceForm
  onSave: (form: WorkspaceForm) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<WorkspaceForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof WorkspaceForm>(field: K, value: WorkspaceForm[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.number.trim()) { setError('Введите номер места'); return }
    if (mode === 'add') {
      const nums = form.number.trim().split(/\s+/)
      if (nums.some(n => !/^\d+$/.test(n))) { setError('Номера мест должны быть числами'); return }
    } else {
      if (!/^\d+$/.test(form.number.trim())) { setError('Номер места должен быть числом'); return }
    }
    if (!form.floor.trim()) { setError('Введите этаж'); return }
    if (!/^\d+$/.test(form.floor.trim())) { setError('Этаж должен быть числом'); return }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const previewIds = mode === 'add'
    ? form.number.trim().split(/\s+/).filter(Boolean).map(n => `${form.zone}-${n}`).join(', ')
    : `${form.zone}-${form.number}`

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {mode === 'add' ? 'Добавить рабочее место' : `Изменить место ${initial.zone}-${initial.number}`}
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНОВНАЯ ИНФОРМАЦИЯ</div>

            <div className={styles.formRow}>
              {/* Выбор зоны */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Зона *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ZONES.map(z => (
                    <button
                      key={z}
                      type="button"
                      disabled={mode === 'edit'}
                      onClick={() => set('zone', z)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 6,
                        border: form.zone === z ? '2px solid #1A56DB' : '1px solid #E5E7EB',
                        background: form.zone === z ? '#EFF6FF' : '#fff',
                        color: form.zone === z ? '#1A56DB' : '#374151',
                        fontWeight: form.zone === z ? 700 : 400,
                        cursor: mode === 'edit' ? 'default' : 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {z}
                    </button>
                  ))}
                </div>
                <span className={styles.formHelper}>{ZONE_NAMES[form.zone]}</span>
              </div>

              {/* Номер места */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {mode === 'add' ? 'Номера мест *' : 'Номер места *'}
                </label>
                <input
                  className={styles.formInput}
                  placeholder={mode === 'add' ? '49 50 51' : '49'}
                  value={form.number}
                  onChange={e => set('number', mode === 'add'
                    ? e.target.value.replace(/[^\d\s]/g, '')
                    : e.target.value.replace(/\D/g, '')
                  )}
                  readOnly={mode === 'edit'}
                />
                {mode === 'add' && (
                  <span className={styles.formHelper}>
                    Несколько номеров — через пробел
                  </span>
                )}
                {form.number.trim() && (
                  <span className={styles.formHelper}>ID: {previewIds}</span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Этаж *</label>
              <input
                className={styles.formInput}
                placeholder="11"
                value={form.floor}
                onChange={e => set('floor', e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ОСНАЩЕНИЕ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.has_monitor ? styles.toggleOn : ''}`}
                  role="switch" aria-checked={form.has_monitor} tabIndex={0}
                  onClick={() => set('has_monitor', !form.has_monitor)}
                  onKeyDown={e => e.key === 'Enter' && set('has_monitor', !form.has_monitor)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Монитор</span>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ВРЕМЕННАЯ НЕДОСТУПНОСТЬ</div>
            <div className={styles.toggleRow}>
              <label className={styles.toggleLabel}>
                <div
                  className={`${styles.toggle} ${form.unavailable ? styles.toggleOn : ''}`}
                  role="switch" aria-checked={form.unavailable} tabIndex={0}
                  onClick={() => set('unavailable', !form.unavailable)}
                  onKeyDown={e => e.key === 'Enter' && set('unavailable', !form.unavailable)}
                >
                  <div className={styles.toggleThumb} />
                </div>
                <span className={styles.toggleText}>Отметить как временно недоступное</span>
              </label>
            </div>
            {form.unavailable && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Причина</label>
                <textarea
                  className={styles.formTextarea}
                  rows={2}
                  value={form.unavailableReason}
                  onChange={e => set('unavailableReason', e.target.value)}
                />
              </div>
            )}
          </div>

          {error && <div className={styles.formError}>{error}</div>}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : '✓ Сохранить место'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminWorkspacesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [bookedNowIds, setBookedNowIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const dayFrom = new Date(`${today}T00:00:00`).toISOString()
    const dayTo   = new Date(`${today}T23:59:59`).toISOString()
    getResourcesList(['RESOURCE_TYPE_WORKSPACE'])
      .then(async list => {
        const workspaces = list.filter(r => r.type === 'RESOURCE_TYPE_WORKSPACE')
        setResources(workspaces)
        const now = new Date()
        const bookingsPerResource = await Promise.all(
          workspaces.map(r => getResourceBookings(r.resource_id, dayFrom, dayTo).catch(() => []))
        )
        const nowSet = new Set<string>()
        workspaces.forEach((r, i) => {
          const active = bookingsPerResource[i].some(
            b => b.starts_at && b.ends_at && new Date(b.starts_at) <= now && new Date(b.ends_at) >= now
          )
          if (active) nowSet.add(r.resource_id)
        })
        setBookedNowIds(nowSet)
      })
      .catch(() => setError('Не удалось загрузить рабочие места'))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }


  function resourceToForm(r: Resource): WorkspaceForm {
    const [zone, number] = r.name.split('-')
    return {
      zone: (ZONES.includes(zone as Zone) ? zone : 'A') as Zone,
      number: number ?? '',
      floor: r.location ?? '',
      has_monitor: r.workspace?.has_monitor ?? false,
      unavailable: r.status === 'RESOURCE_STATUS_MAINTENANCE' || r.status === 'RESOURCE_STATUS_EMERGENCY',
      unavailableReason: '',
    }
  }

  async function handleAdd(form: WorkspaceForm) {
    const numbers = form.number.trim().split(/\s+/).filter(Boolean)

    const inputDupes = numbers.filter((n, i) => numbers.indexOf(n) !== i)
    if (inputDupes.length > 0)
      throw new Error(`Повторяющиеся номера в вводе: ${[...new Set(inputDupes)].join(', ')}`)

    const existingNames = new Set(resources.map(r => r.name))
    const conflicts = numbers.filter(n => existingNames.has(`${form.zone}-${n}`))
    if (conflicts.length > 0)
      throw new Error(`Уже существуют: ${conflicts.map(n => `${form.zone}-${n}`).join(', ')}`)

    const created = await Promise.all(numbers.map(async num => {
      const name = `${form.zone}-${num}`
      const resource = await createResource({
        name,
        type: 'RESOURCE_TYPE_WORKSPACE',
        location: `${form.floor} этаж`,
        details: { has_monitor: form.has_monitor },
      })
      if (form.unavailable) {
        await changeResourceStatus({ resource_id: resource.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
        resource.status = 'RESOURCE_STATUS_MAINTENANCE'
      }
      return resource
    }))
    setResources(prev => [...created, ...prev])
    showToast(created.length === 1 ? `Место ${created[0].name} добавлено` : `Добавлено ${created.length} мест`)
  }

  async function handleEdit(form: WorkspaceForm) {
    if (!editTarget) return
    const updated = await updateResource(
      editTarget.resource_id,
      { name: editTarget.name, type: 'RESOURCE_TYPE_WORKSPACE', location: `${form.floor} этаж`, details: { has_monitor: form.has_monitor } },
    )
    if (form.unavailable && editTarget.status === 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_MAINTENANCE', reason: form.unavailableReason || 'Временно недоступно' })
      updated.status = 'RESOURCE_STATUS_MAINTENANCE'
    } else if (!form.unavailable && editTarget.status !== 'RESOURCE_STATUS_AVAILABLE') {
      await changeResourceStatus({ resource_id: editTarget.resource_id, status: 'RESOURCE_STATUS_AVAILABLE', reason: '' })
      updated.status = 'RESOURCE_STATUS_AVAILABLE'
    }
    setResources(prev => prev.map(r => r.resource_id === updated.resource_id ? updated : r))
    showToast(`Место ${editTarget.name} обновлено`)
  }

  async function handleDelete(id: string) {
    await deleteResource(id)
    setResources(prev => prev.filter(r => r.resource_id !== id))
    setDeleteConfirm(null)
    showToast('Место удалено')
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Рабочие места</h1>
          <p className={styles.pageSubtitle}>{resources.length} мест · БЦ «Арена»</p>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.btnPrimary} onClick={() => { setEditTarget(null); setShowModal(true) }}>
            <IconPlus /> Добавить место
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? <div className={styles.loadingMsg}>Загрузка...</div>
          : error ? <div className={styles.errorMsg}>{error}</div>
          : (
            <>
              <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>ID</th>
                    <th className={styles.th}>ЗОНА</th>
                    <th className={styles.th}>ЛОКАЦИЯ</th>
                    <th className={styles.th}>МОНИТОР</th>
                    <th className={styles.th}>СТАТУС</th>
                    <th className={styles.th}>ДЕЙСТВИЯ</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(r => {
                    const [zone] = r.name.split('-')
                    const zoneName = ZONE_NAMES[zone as Zone] ?? 'Общая зона'
                    const { text, cls } = statusLabel(effectiveStatus(r, bookedNowIds))
                    return (
                      <tr key={r.resource_id} className={styles.tr}>
                        <td className={styles.td}><span className={styles.idLink}>{r.name}</span></td>
                        <td className={styles.td}>
                          <span className={styles.zoneName}>Зона {zone}</span>
                          <span className={styles.zoneSub}>{zoneName}</span>
                        </td>
                        <td className={styles.td}><span className={styles.location}>{r.location || '—'}</span></td>
                        <td className={styles.td}>{r.workspace?.has_monitor ? '✓' : '—'}</td>
                        <td className={styles.td}>
                          <span className={`${styles.statusBadge} ${styles[`status_${cls}`]}`}>● {text}</span>
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
                  {resources.length === 0 && <tr><td colSpan={6} className={styles.emptyRow}>Рабочие места не найдены</td></tr>}
                </tbody>
              </table>
              </div>

              <div className={styles.tableFooter}>
                <span className={styles.footerInfo}>{resources.length} мест</span>
              </div>
            </>
          )}
      </div>

      {showModal && (
        <WorkspaceModal
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
            <p className={styles.confirmText}>Удалить это рабочее место?</p>
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
