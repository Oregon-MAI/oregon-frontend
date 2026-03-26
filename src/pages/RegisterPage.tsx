import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { register, validate as validateToken } from '../api/authApi'
import styles from './LoginPage.module.css'

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

export default function RegisterPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const [login,       setLogin]       = useState('')
  const [name,        setName]        = useState('')
  const [surname,     setSurname]     = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const [loginErr,     setLoginErr]     = useState<string | null>(null)
  const [nameErr,      setNameErr]      = useState<string | null>(null)
  const [surnameErr,   setSurnameErr]   = useState<string | null>(null)
  const [emailErr,     setEmailErr]     = useState<string | null>(null)
  const [passwordErr,  setPasswordErr]  = useState<string | null>(null)
  const [confirmErr,   setConfirmErr]   = useState<string | null>(null)

  function validate(): boolean {
    let ok = true
    if (!login.trim()) {
      setLoginErr('Введите логин'); ok = false
    } else { setLoginErr(null) }

    if (!name.trim()) {
      setNameErr('Введите имя'); ok = false
    } else { setNameErr(null) }

    if (!surname.trim()) {
      setSurnameErr('Введите фамилию'); ok = false
    } else { setSurnameErr(null) }

    if (!email.trim()) {
      setEmailErr('Введите email'); ok = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Некорректный email'); ok = false
    } else { setEmailErr(null) }

    if (!password) {
      setPasswordErr('Введите пароль'); ok = false
    } else if (password.length < 6) {
      setPasswordErr('Минимум 6 символов'); ok = false
    } else { setPasswordErr(null) }

    if (!confirmPw) {
      setConfirmErr('Повторите пароль'); ok = false
    } else if (confirmPw !== password) {
      setConfirmErr('Пароли не совпадают'); ok = false
    } else { setConfirmErr(null) }

    return ok
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setIsLoading(true)
    try {
      const tokens = await register({ login: login.trim(), password, name: name.trim(), surname: surname.trim(), email: email.trim() })
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      const userData = await validateToken()
      setUser(userData)
      navigate('/map')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response
        setError(res?.data?.message ?? 'Ошибка регистрации')
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

        <h1 className={styles.title}>Регистрация</h1>
        <p className={styles.subtitle}>Создайте аккаунт в системе бронирования</p>

        {error && (
          <div className={styles.apiError} role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className={styles.apiErrorClose}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="login" className={styles.label}>Логин</label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              placeholder="ivanov.aleksey"
              value={login}
              onChange={e => { setLogin(e.target.value); setLoginErr(null) }}
              className={`${styles.input} ${loginErr ? styles.inputErr : ''}`}
            />
            {loginErr && <span className={styles.fieldErr}>{loginErr}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Имя</label>
            <input
              id="name"
              type="text"
              autoComplete="given-name"
              placeholder="Алексей"
              value={name}
              onChange={e => { setName(e.target.value); setNameErr(null) }}
              className={`${styles.input} ${nameErr ? styles.inputErr : ''}`}
            />
            {nameErr && <span className={styles.fieldErr}>{nameErr}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="surname" className={styles.label}>Фамилия</label>
            <input
              id="surname"
              type="text"
              autoComplete="family-name"
              placeholder="Иванов"
              value={surname}
              onChange={e => { setSurname(e.target.value); setSurnameErr(null) }}
              className={`${styles.input} ${surnameErr ? styles.inputErr : ''}`}
            />
            {surnameErr && <span className={styles.fieldErr}>{surnameErr}</span>}
          </div>

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
                autoComplete="new-password"
                placeholder="••••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setPasswordErr(null) }}
                className={`${styles.input} ${styles.inputPw} ${passwordErr ? styles.inputErr : ''}`}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}>
                {showPw ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
            {passwordErr && <span className={styles.fieldErr}>{passwordErr}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPw" className={styles.label}>Повторите пароль</label>
            <div className={styles.pwWrap}>
              <input
                id="confirmPw"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setConfirmErr(null) }}
                className={`${styles.input} ${styles.inputPw} ${confirmErr ? styles.inputErr : ''}`}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Скрыть пароль' : 'Показать пароль'}>
                {showConfirm ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
            {confirmErr && <span className={styles.fieldErr}>{confirmErr}</span>}
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={isLoading}>
            {isLoading && <span className={styles.spinner} />}
            {isLoading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" style={{ color: '#1A56DB', fontWeight: 600, textDecoration: 'none' }}>
            Войти
          </Link>
        </p>
      </div>

      <div className={styles.right} />
    </div>
  )
}
