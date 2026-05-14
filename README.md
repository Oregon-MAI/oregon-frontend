# T1 Workspace — Frontend

## Запуск

Перед запуском фронта должен быть поднят backend/infra gateway на `http://localhost:8000`.
Для вноса рабочих мест в бд запустить:
```
TOKEN="..." API_URL="http://localhost:8000/api/v1" node scripts/import-workspaces.mjs

```
**токен брать из локального хранилища браузера после входа в админку.**
### Dev

```bash
npm install
npm run dev
```

Открыть: `http://localhost:5173`

### Production

```bash
npm install
npm run build
npm start
```

Открыть: `http://localhost:3000`

Production server отдаёт `dist` и проксирует `/api` + `/notifications` на API gateway.
По умолчанию gateway ожидается на `http://localhost:8000`.

```bash
API_GATEWAY_URL=http://localhost:8000 PORT=3000 npm start
```

Если `3000` занят:

```bash
PORT=3001 npm start
```

### Docker

```bash
docker build -t t1-frontend .
docker run --rm -p 3000:3000 -e API_GATEWAY_URL=http://host.docker.internal:8000 t1-frontend
```

## Проверка

```bash
npm run build
```

## Стек

- **React 18** + **TypeScript**
- **React Router v6** — маршрутизация
- **Axios** — HTTP клиент с interceptor для автоматического refresh токенов
- **CSS Modules** — стили

---

## Структура

```
src/
├── main.tsx                    # Точка входа React
├── app/
│   ├── providers.tsx           # Глобальные провайдеры приложения
│   └── router.tsx              # Описание маршрутов
├── shared/
│   ├── api/httpClient.ts       # Общий axios client + refresh interceptor
│   └── lib/jwt.ts              # Общие утилиты
├── features/
│   ├── auth/
│   │   ├── api/                # Auth/User ручки
│   │   └── model/AuthContext.tsx
│   ├── bookings/
│   │   ├── api/bookingApi.ts
│   │   └── lib/bookingMappers.ts
│   ├── notifications/
│   │   └── api/notificationApi.ts
│   └── resources/
│       ├── api/resourceApi.ts
│       └── lib/resourceMappers.ts
├── types/
│   ├── auth.ts                 # LoginRequest/Response, UserDto
│   ├── map.ts                  # Desk, Zone, Booking
│   └── resource.ts             # Resource, BookingRequest/Response
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

## Архитектурные правила

- `app/` содержит сборку приложения: providers и router.
- `shared/` содержит общую инфраструктуру, не привязанную к домену: HTTP client, JWT utilities.
- `features/` содержит бизнес-домены: auth, resources, bookings, notifications.
- `pages/` собирают экран из feature API, shared UI и локальной логики страницы.
- `components/` — переиспользуемые UI-компоненты приложения.
- `types/` — общие DTO/модели, которые используются в нескольких доменах.
- Backend DTO нормализуются в `features/*/lib/*Mappers.ts`, а не внутри страниц.
- Новые API-ручки добавляются в соответствующий `features/<domain>/api`, а не в общий файл.

## API Контракт

Актуальное описание ручек лежит в [API_REQUIREMENTS.md](./API_REQUIREMENTS.md).

Коротко:

- Основной gateway: `/api/v1`.
- Notifications идут отдельно: `/notifications`.
- В dev `/api` и `/notifications` проксируются Vite на `http://localhost:8000`.
- В production этим занимается [server.cjs](./server.cjs).
- Все защищенные запросы отправляют `Authorization: Bearer <access_token>`.

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
