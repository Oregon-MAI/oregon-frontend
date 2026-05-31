# T1 Workspace Frontend

Frontend MVP для бронирования офисных ресурсов T1 Workspace: рабочих мест на карте офиса, переговорных, оборудования, пользовательских бронирований и административного управления ресурсами.

## Стек

- React 18 + TypeScript
- Vite
- React Router v6
- Axios
- CSS Modules
- Node.js production server для отдачи `dist` и proxy на backend gateway

## Быстрый Старт

Перед запуском фронта должен быть доступен backend/API gateway. По умолчанию проект ожидает gateway на `http://localhost:8000`.

```bash
npm install
npm run dev
```

Dev-сервер по умолчанию слушает `0.0.0.0:5173`, поэтому доступен и локально, и по IP сервера:

- `http://localhost:5173`
- `http://111.88.152.26:5173`

Production-сборка:

```bash
npm run build
npm start
```

Production-сервер по умолчанию слушает `0.0.0.0:3001`:

- `http://localhost:3001`
- `http://111.88.152.26:3001`

Если нужен другой gateway или порт:

```bash
API_GATEWAY_URL=http://localhost:8000 PORT=3001 npm start
```

Или через `.env`:

```bash
cp .env.example .env
npm run dev
```

## Переменные Окружения

| Переменная | Где используется | Значение по умолчанию | Назначение |
| --- | --- | --- | --- |
| `VITE_API_URL` | dev/browser build | `/api/v1` | Base URL для основного API клиента |
| `VITE_NOTIFICATIONS_URL` | dev/browser build | пусто, далее `/notifications` | Base URL для сервиса уведомлений |
| `VITE_DEV_HOST` | Vite dev server | `0.0.0.0` | Host, на котором слушает dev server |
| `VITE_DEV_PORT` | Vite dev server | `5173` | Порт dev server |
| `VITE_ALLOWED_HOSTS` | Vite dev server | пусто | Дополнительные разрешенные hostnames, через запятую |
| `FRONTEND_HOST` | `server.cjs` | `0.0.0.0` | Host, на котором слушает production server |
| `FRONTEND_PUBLIC_HOST` | `server.cjs` | `111.88.152.26` | Публичный адрес, который показывается в логах запуска |
| `API_GATEWAY_URL` | `server.cjs` | `http://localhost:8000` | Gateway для production proxy |
| `PORT` | `server.cjs` | `3001` | Порт production server |

## Команды

```bash
npm run dev      # локальная разработка через Vite
npm run build    # TypeScript check + production build
npm start        # запуск server.cjs для dist
```

Для импорта рабочих мест в backend:

```bash
TOKEN="..." API_URL="http://localhost:8000/api/v1" node scripts/import-workspaces.mjs
```

`TOKEN` берётся из localStorage браузера после входа в админку.

## Docker

```bash
docker build -t t1-frontend .
docker run --rm -p 3001:3001 -e API_GATEWAY_URL=http://host.docker.internal:8000 t1-frontend
```

## Архитектура

Проект разложен по прикладной топологии, близкой к Feature-Sliced Design: верхний уровень показывает роль кода, а доменная логика живёт внутри своих feature-модулей.

```text
src/
├── main.tsx                         # точка входа React
├── app/
│   ├── providers.tsx                # глобальные провайдеры
│   ├── router.tsx                   # единая таблица маршрутов
│   └── routes/ProtectedRoute.tsx    # защита приватных/admin маршрутов
├── pages/                           # страницы, собирающие фичи и виджеты
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── MapPage.tsx
│   ├── MeetingRoomsPage.tsx
│   ├── EquipmentPage.tsx
│   ├── BookingsPage.tsx
│   └── admin/
├── widgets/                         # крупные UI-блоки приложения
│   ├── app-shell/                   # layout, sidebar, notification center
│   └── office-map/                  # SVG-карта офиса и маркеры ресурсов
├── features/                        # бизнес-домены
│   ├── auth/
│   │   ├── api/
│   │   └── model/AuthContext.tsx
│   ├── bookings/
│   │   ├── api/
│   │   └── lib/
│   ├── notifications/
│   │   └── api/
│   └── resources/
│       ├── api/
│       └── lib/
├── shared/                          # код без привязки к конкретной странице
    ├── api/httpClient.ts            # axios client + refresh-token очередь
    ├── assets/
    ├── lib/                         # JWT, дата/время и общие утилиты
    ├── types/                       # DTO и общие модели
    └── ui/TimeSelect/               # переиспользуемые UI-компоненты
```


- Маршруты в `src/app/router.tsx`.
- Auth-состояние и текущий пользователь находятся в `src/features/auth/model/AuthContext.tsx`.
- Все HTTP-вызовы лежат в `src/features/<domain>/api`.
- Нормализация backend DTO выполняется в `src/features/<domain>/lib`
- Общие DTO находятся в `src/shared/types`.
- Утилиты без бизнес-зависимостей находятся в `src/shared/lib`.
- Переиспользуемые контролы  в `src/shared/ui`.
- Крупные экранные блоки, которые не являются самостоятельной страницей, кладутся в `src/widgets`.
- Страницы в `src/pages` должны оставаться композиционным слоем: загружают данные, держат локальное состояние экрана и собирают UI.

## Маршруты

| URL | Страница | Доступ |
| --- | --- | --- |
| `/login` | вход | публичный |
| `/register` | регистрация | публичный |
| `/map` | карта офиса и бронирование рабочих мест/переговорных | авторизованные |
| `/rooms` | каталог переговорных | авторизованные |
| `/equipment` | каталог оборудования | авторизованные |
| `/bookings` | мои бронирования | авторизованные |
| `/admin` | админ-панель, по умолчанию рабочие места | `admin` |
| `/admin/workspaces` | управление рабочими местами и картой | `admin` |
| `/admin/rooms` | управление переговорными | `admin` |
| `/admin/equipment` | управление оборудованием | `admin` |
| `/admin/users` | управление пользователями | `admin` |

## API

Актуальный контракт описан в [API_REQUIREMENTS.md](./API_REQUIREMENTS.md).
