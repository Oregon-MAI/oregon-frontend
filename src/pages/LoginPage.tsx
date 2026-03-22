import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './LoginPage.module.css'
import { login } from '../api/auth'


function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [emailErr,    setEmailErr]    = useState<string | null>(null)
  const [passwordErr, setPasswordErr] = useState<string | null>(null)

  function validate(): boolean {
    let ok = true
    if (!email.trim()) {
      setEmailErr('Введите email'); ok = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Некорректный email'); ok = false
    } else {
      setEmailErr(null)
    }
    if (!password) {
      setPasswordErr('Введите пароль'); ok = false
    } else if (password.length < 6) {
      setPasswordErr('Минимум 6 символов'); ok = false
    } else {
      setPasswordErr(null)
    }
    return ok
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      const data = await login({ email: email.trim(), password })
      localStorage.setItem('access_token', data.access_token)
      setUser(data.user)
      navigate('/map')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response
        setError(res?.data?.message ?? 'Неверный email или пароль')
      } else {
        setError('Нет связи с сервером')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <div className={styles.logoSq}>T1</div>
          <span className={styles.logoText}>Workspace</span>
        </div>

        <h1 className={styles.title}>Добро пожаловать</h1>
        <p className={styles.subtitle}>Войдите в систему бронирования ресурсов</p>

        {error && (
          <div className={styles.apiError} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className={styles.apiErrorClose}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Электронная почта</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ivanov.a@t1.ru"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailErr(null) }}
              className={`${styles.input} ${emailErr ? styles.inputErr : ''}`}
            />
            {emailErr && <span className={styles.fieldErr}>{emailErr}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Пароль</label>
            <div className={styles.pwWrap}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordErr(null) }}
                className={`${styles.input} ${styles.inputPw} ${passwordErr ? styles.inputErr : ''}`}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPw ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
            {passwordErr && <span className={styles.fieldErr}>{passwordErr}</span>}
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} />}
            {isLoading ? 'Входим…' : 'Войти'}
          </button>

          <div className={styles.divider}>
            <div className={styles.divLine} />
            <div className={styles.divLine} />
          </div>
        </form>
      </div>

      <div className={styles.right} />
    </div>
  )
}
