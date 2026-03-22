# T1 Workspace — Frontend

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:5173`

Войти: любой email + пароль (6+ символов) — работает заглушка.

---

## Структура

```
src/
├── main.tsx                          # Роутер + AuthProvider
├── index.css                         # Шрифты + reset
│
├── context/
│   └── AuthContext.tsx               # Глобальное состояние: user + bookings
│
├── types/
│   ├── auth.ts                       # LoginRequest, LoginResponse
│   └── map.ts                        # Desk, Zone, Booking
│
├── api/
│   └── authApi.ts                    # POST /auth/login
│
├── components/
│   ├── ProtectedRoute.tsx            # Охранник маршрутов (проверяет токен)
│   ├── Layout.tsx                    # Топбар + Сайдбар + контент
│   ├── Layout.module.css
│   ├── Sidebar.tsx                   # Навигация, этажи, виджет «Сегодня»
│   ├── Sidebar.module.css
│   ├── OfficeMap/
│   │   ├── OfficeMap.tsx             # Карта с местами по зонам
│   │   └── OfficeMap.module.css
│   └── BookingPanel/
│       ├── BookingPanel.tsx          # Панель бронирования (слоты 15 мин)
│       └── BookingPanel.module.css
│
└── pages/
    ├── LoginPage.tsx                 # Страница входа
    ├── LoginPage.module.css
    ├── MapPage.tsx                   # Карта офиса
    └── MapPage.module.css
```

---

## Маршруты

| URL | Страница | Доступ |
|-----|----------|--------|
| `/login` | Вход | Публичный |
| `/map` | Карта офиса | Только авторизованные |

---

## Что сделано

- Авторизация с валидацией (заглушка, готово к подключению бэка)
- JWT токен в localStorage
- Защищённые маршруты через `ProtectedRoute`
- Глобальное состояние пользователя и броней через `AuthContext`
- Layout: топбар с именем и кнопкой выхода, сайдбар с навигацией
- Карта офиса: зоны, столы со статусами (свободно / занято / моё место)
- Панель бронирования: слоты по 15 минут

