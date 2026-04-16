# T1 Workspace — Frontend




## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:5173`


## Стек

- **React 18** + **TypeScript**
- **React Router v6** — маршрутизация
- **Axios** — HTTP клиент с interceptor для автоматического refresh токенов
- **CSS Modules** — стили

---

## Структура

```
src/
├── main.tsx                    # Роутер + AuthProvider
├── context/
│   └── AuthContext.tsx         # Глобальное состояние пользователя
├── types/
│   ├── auth.ts                 # LoginRequest/Response, UserDto
│   ├── map.ts                  # Desk, Zone, Booking
│   └── resource.ts             # Resource, BookingRequest/Response
├── api/
│   ├── authApi.ts              # Auth + User ручки, axios instance, refresh interceptor
│   └── resourceApi.ts          # Resources + Bookings ручки
├── components/
│   ├── ProtectedRoute.tsx      # Защита маршрутов
│   ├── Layout.tsx              # Топбар + сайдбар
│   ├── OfficeMap/              # SVG карта офиса
│   ├── BookingPanel/           # Панель бронирования рабочего места
│   └── TimeSelect.tsx          # Выбор времени
└── pages/
    ├── LoginPage.tsx           # Вход
    ├── RegisterPage.tsx        # Регистрация
    ├── MapPage.tsx             # Карта офиса
    ├── MeetingRoomsPage.tsx    # Переговорные
    ├── EquipmentPage.tsx       # Оборудование
    ├── BookingsPage.tsx        # Мои бронирования
    └── admin/
        ├── AdminLayout.tsx
        ├── AdminWorkspacesPage.tsx
        ├── AdminRoomsPage.tsx
        ├── AdminEquipmentPage.tsx
        └── AdminUsersPage.tsx
```

---

## Маршруты

| URL | Страница | Доступ |
|-----|----------|--------|
| `/login` | Вход | Публичный |
| `/register` | Регистрация | Публичный |
| `/map` | Карта офиса | Авторизованные |
| `/rooms` | Переговорные | Авторизованные |
| `/equipment` | Оборудование | Авторизованные |
| `/bookings` | Мои бронирования | Авторизованные |
| `/admin` | Панель администратора | Только `admin` |
| `/admin/workspaces` | Управление рабочими местами | Только `admin` |
| `/admin/rooms` | Управление переговорными | Только `admin` |
| `/admin/equipment` | Управление оборудованием | Только `admin` |
| `/admin/users` | Управление пользователями | Только `admin` |

---



