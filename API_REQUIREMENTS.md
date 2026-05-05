# API Requirements — T1 Workspace Frontend

Документ описывает HTTP-контракт, который сейчас использует фронтенд.

## Base URLs

Основной API:

```text
VITE_API_URL=/api/v1
```

В dev и production фронт ходит относительными URL. Прокси:

```text
/api -> http://localhost:8000
/notifications -> http://localhost:8000
```

Production server проксирует `/api` и `/notifications` в `API_GATEWAY_URL`.
По умолчанию:

```text
API_GATEWAY_URL=http://localhost:8000
```

Все защищенные ручки должны получать:

```http
Authorization: Bearer <access_token>
```

## Auth

### POST /api/v1/auth/login

```json
{
  "login": "string",
  "password": "string"
}
```

Response:

```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

### POST /api/v1/auth/register

```json
{
  "login": "string",
  "password": "string",
  "name": "string",
  "surname": "string",
  "email": "string"
}
```

Response:

```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

### POST /api/v1/auth/validate

Фронт использует для проверки access token через gateway/SSO.

Response:

```json
{
  "id": "string",
  "roles": ["ADMIN"],
  "exp": 1770000000
}
```

### POST /api/v1/auth/refresh

Refresh token передается в заголовке:

```http
Authorization: Bearer <refresh_token>
```

Response:

```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

## Users

### GET /api/v1/user/user?id=<uuid>

Response:

```json
{
  "id": "string",
  "login": "string",
  "name": "string",
  "surname": "string",
  "email": "string",
  "roles": [
    { "name": "ADMIN" }
  ]
}
```

### GET /api/v1/user/users

Response:

```json
[
  {
    "id": "string",
    "login": "string",
    "name": "string",
    "surname": "string",
    "email": "string",
    "roles": [
      { "name": "USER" }
    ]
  }
]
```

### DELETE /api/v1/user/delete_user

Request body:

```json
{
  "id": "string"
}
```

## Resources

Ресурс — единая сущность для рабочих мест, переговорных и оборудования.

### Resource

```json
{
  "resource_id": "string",
  "name": "string",
  "type": "RESOURCE_TYPE_WORKSPACE",
  "location": "string",
  "status": "RESOURCE_STATUS_AVAILABLE",
  "meeting_room": {
    "capacity": 8,
    "has_projector": true,
    "has_whiteboard": true
  },
  "workspace": {
    "has_monitor": true
  },
  "device": {
    "device_type": "laptop",
    "serial_number": "string",
    "model": "string",
    "description": "string"
  },
  "created_at": "2026-05-04T10:00:00Z",
  "updated_at": "2026-05-04T10:00:00Z"
}
```

`meeting_room`, `workspace`, `device` — proto `oneof`; в одном ресурсе приходит только одно из этих полей.

Resource types:

```text
RESOURCE_TYPE_MEETING_ROOM
RESOURCE_TYPE_WORKSPACE
RESOURCE_TYPE_DEVICE
```

Resource statuses:

```text
RESOURCE_STATUS_AVAILABLE
RESOURCE_STATUS_OCCUPIED
RESOURCE_STATUS_MAINTENANCE
RESOURCE_STATUS_EMERGENCY
```

### GET /api/v1/resources/list

Получить список ресурсов. Фильтр по типу передается повторяющимся query-параметром:

```text
GET /api/v1/resources/list?type=RESOURCE_TYPE_DEVICE
GET /api/v1/resources/list?type=RESOURCE_TYPE_MEETING_ROOM&type=RESOURCE_TYPE_WORKSPACE
```

Response:

```json
{
  "resources": []
}
```

### GET /api/v1/resources

Получить доступные ресурсы с фильтрами:

```text
GET /api/v1/resources?type=RESOURCE_TYPE_MEETING_ROOM&location=Office
```

Фронт также может передавать `starts_at` и `ends_at`, но текущий gateway учитывает только `type` и `location`.

Response:

```json
{
  "resources": [],
  "total_count": 0
}
```

### GET /api/v1/resources/:id

Response:

```json
{
  "resource": {}
}
```

### POST /api/v1/resources

Admin only.

Meeting room:

```json
{
  "name": "Meeting Room Alpha",
  "type": "RESOURCE_TYPE_MEETING_ROOM",
  "location": "Office 1, Floor 3",
  "meeting_room": {
    "capacity": 12,
    "has_projector": true,
    "has_whiteboard": true
  }
}
```

Workspace:

```json
{
  "name": "A-1",
  "type": "RESOURCE_TYPE_WORKSPACE",
  "location": "11 этаж",
  "workspace": {
    "has_monitor": true
  }
}
```

Device:

```json
{
  "name": "MacBook Pro",
  "type": "RESOURCE_TYPE_DEVICE",
  "location": "Склад",
  "device": {
    "device_type": "laptop",
    "serial_number": "SN-001",
    "model": "MacBook Pro 14",
    "description": "M3"
  }
}
```

Response:

```json
{
  "resource": {}
}
```

### PUT /api/v1/resources/:id

Admin only. Gateway принимает измененный ресурс плоским объектом. `details` всегда должен присутствовать.

```json
{
  "name": "Meeting Room Omega",
  "type": "RESOURCE_TYPE_MEETING_ROOM",
  "location": "Office 2, Floor 1",
  "status": "RESOURCE_STATUS_AVAILABLE",
  "details": {
    "capacity": 10,
    "has_projector": true,
    "has_whiteboard": false
  }
}
```

Для рабочих мест `details` выглядит так:

```json
{ "has_monitor": true }
```

Для техники:

```json
{
  "device_type": "laptop",
  "serial_number": "SN123456",
  "model": "Apple M3 Pro",
  "description": "16GB RAM"
}
```

Response:

```json
{
  "resource": {}
}
```

### PATCH /api/v1/resources/:id/status

```json
{
  "status": "RESOURCE_STATUS_MAINTENANCE",
  "reason": "Projector maintenance"
}
```

Response:

```json
{
  "resource": {}
}
```

### DELETE /api/v1/resources/:id

Response:

```json
{
  "success": true
}
```

### GET /api/v1/resources/:id/status

Проверка доступности ресурса.

Response:

```json
{
  "is_available": true,
  "status": "RESOURCE_STATUS_AVAILABLE"
}
```

### PATCH /api/v1/resources/:id/occupancy

Системная ручка для booking/resource интеграции.

```json
{
  "is_occupied": true
}
```

## Bookings

### Booking

```json
{
  "booking_id": "string",
  "resource_id": "string",
  "user_id": "string",
  "resource_name": "string",
  "resource_location": "string",
  "resource_type": "string",
  "starts_at": "2026-05-04T10:00:00Z",
  "ends_at": "2026-05-04T11:00:00Z",
  "status": "BOOKING_STATUS_CONFIRMED",
  "cancel_reason": "string",
  "created_at": "2026-05-04T09:00:00Z",
  "updated_at": "2026-05-04T09:00:00Z"
}
```

Booking statuses:

```text
BOOKING_STATUS_CONFIRMED
BOOKING_STATUS_CANCELED
```

### POST /api/v1/bookings

Фронт отправляет `user_id`, но gateway может переопределить его из access token.

```json
{
  "resource_id": "string",
  "user_id": "string",
  "starts_at": "2026-05-04T10:00:00.000Z",
  "ends_at": "2026-05-04T11:00:00.000Z"
}
```

Response:

```json
{
  "booking": {}
}
```

### GET /api/v1/bookings?user_id=<uuid>

Получить бронирования пользователя.

Response:

```json
{
  "bookings": []
}
```

### GET /api/v1/bookings/:booking_id

Response:

```json
{
  "booking": {}
}
```

### POST /api/v1/bookings/:booking_id/cancel

Отмена бронирования пользователем.

Response:

```json
{
  "booking": {}
}
```

### POST /api/v1/admin/bookings/:booking_id/cancel

Admin only. Административная отмена бронирования.

Response:

```json
{
  "booking": {}
}
```

### GET /api/v1/resources/:id/bookings?from=<RFC3339>&to=<RFC3339>

Получить бронирования ресурса за интервал.

```text
GET /api/v1/resources/RESOURCE_ID/bookings?from=2026-05-04T00:00:00.000Z&to=2026-05-04T23:59:59.000Z
```

Response:

```json
{
  "bookings": []
}
```

## Notifications

Notifications идут через Envoy/gateway route без `/api/v1`:

```text
/notifications
```

Все notification-запросы отправляют:

```http
Authorization: Bearer <access_token>
```

### GET /notifications/:user_id

SSE stream. Фронт использует `fetch` stream, потому что native `EventSource` не умеет отправлять `Authorization`.

События приходят в формате:

```text
data: {"id":"string","text":"string","user_id":"string"}
```

### POST /notifications/confirm/:user_id/:message_id

Подтверждение прочтения уведомления.

Response:

```text
success
```

Фронт делает retry на `502`, `503`, `504`.

## Frontend Data Mapping

Фронт нормализует backend DTO в UI-модели:

- `Resource` нормализуется в `features/resources/lib/resourceMappers.ts`.
- `Booking` нормализуется в `features/bookings/lib/bookingMappers.ts`.
- `details` fallback поддерживается только для обратной совместимости; новые запросы отправляют `meeting_room`, `workspace`, `device`.
- UI-статус `mine` фронт вычисляет сам по пересечению `resource_id` с бронированиями текущего пользователя.

## Error Shape

Gateway обычно возвращает ошибки так:

```json
{
  "error": "message"
}
```

SSO/notification service могут вернуть свой формат ошибки. Фронт не завязан на единый error DTO и обрабатывает неуспешный HTTP status.
