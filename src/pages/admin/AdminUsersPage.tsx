import { useState, useEffect } from 'react'
import { register, getUsers, deleteUser } from '../../api/authApi'
import styles from './AdminWorkspacesPage.module.css'

interface UserDto {
  id: string
  login: string
  name: string
  surname: string
  email: string
  roles: { id: string; name: string }[]
}

interface UserForm {
  login: string
  name: string
  surname: string
  email: string
  password: string
}

const EMPTY_FORM: UserForm = {
  login: '', name: '', surname: '', email: '', password: '',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function CreateUserModal({ onSave, onClose }: {
  onSave: (form: UserForm) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof UserForm>(field: K, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    if (!form.login.trim()) { setError('Введите логин'); return }
    if (!form.name.trim()) { setError('Введите имя'); return }
    if (!form.surname.trim()) { setError('Введите фамилию'); return }
    if (!form.email.trim()) { setError('Введите email'); return }
    if (!form.password || form.password.length < 6) { setError('Пароль минимум 6 символов'); return }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; message?: string } } }
      setError(err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Ошибка создания пользователя')
    }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Создать пользователя</h2>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>ЛИЧНЫЕ ДАННЫЕ</div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Имя *</label>
                <input className={styles.formInput} placeholder="Иван" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Фамилия *</label>
                <input className={styles.formInput} placeholder="Иванов" value={form.surname} onChange={e => set('surname', e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email *</label>
              <input className={styles.formInput} type="email" placeholder="ivanov@t1.ru" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionLabel}>УЧЁТНЫЕ ДАННЫЕ</div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Логин *</label>
                <input className={styles.formInput} placeholder="ivanov.i" value={form.login} onChange={e => set('login', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Пароль *</label>
                <input className={styles.formInput} type="password" placeholder="••••••" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
            </div>
          </div>

          {error && <div className={styles.formError}>{error}</div>}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnGhost} onClick={onClose}>Отмена</button>
          <button type="button" className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? 'Создание...' : '✓ Создать'}
          </button>
        </div>
      </div>
    </>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    getUsers()
      .then(list => setUsers(list))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleCreate(form: UserForm) {
    await register({
      login: form.login,
      password: form.password,
      name: form.name,
      surname: form.surname,
      email: form.email,
    })
    const list = await getUsers()
    setUsers(list)
    showToast(`Пользователь ${form.login} создан`)
  }

  async function handleDelete(id: string) {
    await deleteUser(id)
    setUsers(prev => prev.filter(u => u.id !== id))
    setDeleteConfirm(null)
    showToast('Пользователь удалён')
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Пользователи</h1>
          <p className={styles.pageSubtitle}>{users.length} пользователей</p>
        </div>
        <div className={styles.headerRight}>
          <button type="button" className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <IconPlus /> Создать пользователя
          </button>
        </div>
      </div>

      <div className={styles.tableCard}>
        {loading ? <div className={styles.loadingMsg}>Загрузка...</div> : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>ЛОГИН</th>
                  <th className={styles.th}>ИМЯ</th>
                  <th className={styles.th}>EMAIL</th>
                  <th className={styles.th}>РОЛИ</th>
                  <th className={styles.th}>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td}><span className={styles.idLink}>{u.login}</span></td>
                    <td className={styles.td}>{u.surname} {u.name}</td>
                    <td className={styles.td}><span className={styles.location}>{u.email}</span></td>
                    <td className={styles.td}>
                      {(u.roles.length > 0 ? u.roles : [{ id: 'default', name: 'user', description: '' }]).map(r => (
                        <span key={r.id} className={`${styles.statusBadge} ${styles.status_available}`}>{r.name}</span>
                      ))}
                    </td>
                    <td className={styles.td}>
                      <button type="button" className={styles.btnDelete} onClick={() => setDeleteConfirm(u.id)}>Удалить</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className={styles.emptyRow}>Нет пользователей. Создайте первого.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {deleteConfirm && (
        <>
          <div className={styles.overlay} onClick={() => setDeleteConfirm(null)} />
          <div className={styles.confirmModal}>
            <p className={styles.confirmText}>Удалить пользователя?</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setDeleteConfirm(null)}>Отмена</button>
              <button type="button" className={styles.btnDanger} onClick={() => handleDelete(deleteConfirm)}>Удалить</button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <CreateUserModal
          onSave={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
