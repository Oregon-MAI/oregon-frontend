# Документация API — T1 Workspace

Документ описывает HTTP-контракт сервиса T1 Workspace, который используется фронтендом для авторизации, управления пользователями, ресурсами офиса, бронированиями и уведомлениями.

## Общая Информация

### Base URL

Основной API доступен относительно frontend-приложения:

```text
/api/v1
```

Сервис уведомлений идет отдельным маршрутом:

```text
/notifications
```

В dev и production фронтенд использует относительные URL и проксирует запросы на backend/API gateway:

```text
/api -> API_GATEWAY_URL
/notifications -> API_GATEWAY_URL
```

Значение `API_GATEWAY_URL` по умолчанию:

```text
http://localhost:8000
```

### Авторизация

Все защищенные ручки получают access token в заголовке:

```http
Authorization: Bearer <access_token>
```

Ручка обновления токенов получает refresh token в том же формате:

```http
Authorization: Bearer <refresh_token>
```

### Общий Формат Ошибок

Gateway обычно возвращает ошибку в одном из форматов:

```json
{
  "error": "message"
}
```

или:

```json
{
  "detail": "message"
}
```

Фронтенд не завязан на единый DTO ошибки и ориентируется на HTTP-статус. Если production proxy не может подключиться к API gateway, frontend server возвращает:

```http
502 Bad Gateway
```

```json
{
  "error": "api gateway unavailable"
}
```

## Справочники DTO

### RoleDto

```json
{
  "id": "string UUID",
  "name": "string",
  "description": "string"
}
```

### UserDto

```json
{
  "id": "string UUID",
  "login": "string",
  "name": "string",
  "surname": "string",
  "email": "string",
  "roles": [
    {
      "id": "string UUID",
      "name": "string",
      "description": "string"
    }
  ]
}
```

### Resource

Ресурс — единая сущность для рабочих мест, переговорных и оборудования.

```json
{
  "resource_id": "string UUID",
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

`meeting_room`, `workspace`, `device` работают как typed details: у одного ресурса приходит только блок, соответствующий `type`. Для обратной совместимости фронтенд также умеет читать поля `uuid`, `id`, `resource_type` и общий объект `details`.

Типы ресурсов:

```text
RESOURCE_TYPE_UNSPECIFIED
RESOURCE_TYPE_MEETING_ROOM
RESOURCE_TYPE_WORKSPACE
RESOURCE_TYPE_DEVICE
```

Статусы ресурсов:

```text
RESOURCE_STATUS_UNSPECIFIED
RESOURCE_STATUS_AVAILABLE
RESOURCE_STATUS_OCCUPIED
RESOURCE_STATUS_MAINTENANCE
RESOURCE_STATUS_EMERGENCY
```

### Booking

```json
{
  "booking_id": "string UUID",
  "resource_id": "string UUID",
  "user_id": "string UUID",
  "resource_name": "string",
  "resource_location": "string",
  "resource_type": "RESOURCE_TYPE_WORKSPACE",
  "starts_at": "2026-05-04T10:00:00Z",
  "ends_at": "2026-05-04T11:00:00Z",
  "status": "BOOKING_STATUS_CONFIRMED",
  "cancel_reason": "string",
  "created_at": "2026-05-04T09:00:00Z",
  "updated_at": "2026-05-04T09:00:00Z"
}
```

Статусы бронирования:

```text
BOOKING_STATUS_CONFIRMED
BOOKING_STATUS_CANCELED
```

## Аутентификация

### POST /api/v1/auth/login

Аутентификация пользователя по логину и паролю.

Запрос:

```json
{
  "login": "string",
  "password": "string"
}
```

Ответ `200 OK`:

```json
{
  "access_token": "string JWT",
  "refresh_token": "string JWT",
  "user_id": "string UUID"
}
```

`user_id` может отсутствовать. В этом случае фронтенд берет идентификатор пользователя из `/auth/validate` или payload JWT.

Ответ `400 Bad Request`:

```json
{
  "detail": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "incorrect data"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### POST /api/v1/auth/register

Регистрация нового пользователя.

Запрос:

```json
{
  "login": "string",
  "password": "string",
  "name": "string",
  "surname": "string",
  "email": "string"
}
```

Ответ `200 OK`:

```json
{
  "access_token": "string JWT",
  "refresh_token": "string JWT",
  "user_id": "string UUID"
}
```

Ответ `400 Bad Request`:

```json
{
  "detail": "validation error"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### POST /api/v1/auth/validate

Проверка валидности текущего access token и получение claims сессии.

Заголовки:

```http
Authorization: Bearer <access_token>
```

Ответ `200 OK`:

```json
{
  "id": "string UUID",
  "roles": ["admin"],
  "exp": 1770000000
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "The token has expired"
}
```

или:

```json
{
  "detail": "Invalid token"
}
```

### POST /api/v1/auth/refresh

Обновление пары токенов по refresh token.

Заголовки:

```http
Authorization: Bearer <refresh_token>
```

Тело запроса не передается.

Ответ `200 OK`:

```json
{
  "access_token": "string JWT",
  "refresh_token": "string JWT"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "The token has expired"
}
```

или:

```json
{
  "detail": "Invalid token"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: после успешного refresh фронтенд сохраняет новую пару токенов в `localStorage`. Если несколько запросов одновременно получили `401`, фронтенд выполняет только один refresh-запрос, а остальные запросы ждут новый access token в очереди.

## Пользователи

Все ручки раздела требуют:

```http
Authorization: Bearer <access_token>
```

### GET /api/v1/user/user

Получение пользователя по идентификатору.

Параметры запроса:

```text
id=string UUID
```

Пример:

```text
GET /api/v1/user/user?id=0f6e4a2a-2f2d-4a88-9d40-7f9a2c68b124
```

Ответ `200 OK`:

```json
{
  "id": "string UUID",
  "login": "string",
  "name": "string",
  "surname": "string",
  "email": "string",
  "roles": [
    {
      "id": "string UUID",
      "name": "admin",
      "description": "string"
    }
  ]
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### GET /api/v1/user/users

Получение списка всех пользователей. Используется экраном администрирования.

Ответ `200 OK`:

```json
[
  {
    "id": "string UUID",
    "login": "string",
    "name": "string",
    "surname": "string",
    "email": "string",
    "roles": [
      {
        "id": "string UUID",
        "name": "user",
        "description": "string"
      }
    ]
  }
]
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### DELETE /api/v1/user/delete_user

Удаление пользователя по идентификатору. Используется в админке.

Запрос:

```json
{
  "id": "string UUID"
}
```

Ответ `200 OK`:

```json
{
  "Info": "Success"
}
```

Фронтенд не использует тело успешного ответа и считает операцию выполненной по успешному HTTP-статусу.

Ответ `400 Bad Request`:

```json
{
  "detail": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "you not have permission"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

## Ресурсы

Все ручки раздела требуют:

```http
Authorization: Bearer <access_token>
```

Ручки создания, изменения статуса, обновления и удаления используются в административных экранах и требуют роль `admin`.

### GET /api/v1/resources/list

Получение списка ресурсов для каталогов и админки.

Параметры запроса:

```text
type=RESOURCE_TYPE_MEETING_ROOM
type=RESOURCE_TYPE_WORKSPACE
type=RESOURCE_TYPE_DEVICE
```

Параметр `type` можно передавать несколько раз.

Примеры:

```text
GET /api/v1/resources/list
GET /api/v1/resources/list?type=RESOURCE_TYPE_DEVICE
GET /api/v1/resources/list?type=RESOURCE_TYPE_MEETING_ROOM&type=RESOURCE_TYPE_WORKSPACE
```

Ответ `200 OK`:

```json
{
  "resources": [
    {
      "resource_id": "string UUID",
      "name": "A-1",
      "type": "RESOURCE_TYPE_WORKSPACE",
      "location": "11 этаж",
      "status": "RESOURCE_STATUS_AVAILABLE",
      "workspace": {
        "has_monitor": true
      }
    }
  ]
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "invalid type"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: фронтенд нормализует ресурсы после получения. Если вместо `resource_id` пришли `uuid` или `id`, они используются как fallback.

### GET /api/v1/resources

Получение доступных ресурсов с фильтрами.

Параметры запроса:

```text
type=RESOURCE_TYPE_MEETING_ROOM
location=string
starts_at=RFC3339 timestamp
ends_at=RFC3339 timestamp
```

Пример:

```text
GET /api/v1/resources?type=RESOURCE_TYPE_MEETING_ROOM&location=Office&starts_at=2026-05-04T10:00:00.000Z&ends_at=2026-05-04T11:00:00.000Z
```

Ответ `200 OK`:

```json
{
  "resources": [],
  "total_count": 0
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "invalid filter"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: фронтенд может передавать `starts_at` и `ends_at`, но текущий gateway может учитывать только `type` и `location`. Занятость на отдельных экранах дополнительно вычисляется по бронированиям.

### GET /api/v1/resources/{resource_id}

Получение ресурса по идентификатору.

Ответ `200 OK`:

```json
{
  "resource": {
    "resource_id": "string UUID",
    "name": "Meeting Room Alpha",
    "type": "RESOURCE_TYPE_MEETING_ROOM",
    "location": "Office 1, Floor 3",
    "status": "RESOURCE_STATUS_AVAILABLE",
    "meeting_room": {
      "capacity": 12,
      "has_projector": true,
      "has_whiteboard": true
    }
  }
}
```

Также поддерживается ответ без wrapper-объекта:

```json
{
  "resource_id": "string UUID",
  "name": "Meeting Room Alpha",
  "type": "RESOURCE_TYPE_MEETING_ROOM",
  "location": "Office 1, Floor 3",
  "status": "RESOURCE_STATUS_AVAILABLE"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### POST /api/v1/resources

Создание ресурса. Требуется роль `admin`.

Запрос для переговорной:

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

Запрос для рабочего места:

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

Запрос для оборудования:

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

Ответ `200 OK`:

```json
{
  "resource": {
    "resource_id": "string UUID",
    "name": "MacBook Pro",
    "type": "RESOURCE_TYPE_DEVICE",
    "location": "Склад",
    "status": "RESOURCE_STATUS_AVAILABLE",
    "device": {
      "device_type": "laptop",
      "serial_number": "SN-001",
      "model": "MacBook Pro 14",
      "description": "M3"
    }
  }
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: если UI собирает ресурс через общий объект `details`, фронтенд перед отправкой зеркалит его в typed-поле `meeting_room`, `workspace` или `device` согласно `type`.

### PUT /api/v1/resources/{resource_id}

Обновление ресурса. Требуется роль `admin`.

Gateway принимает измененный ресурс плоским объектом. Поле `details` должно присутствовать, даже если изменяются только основные поля.

Запрос:

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

`details` для рабочего места:

```json
{
  "has_monitor": true
}
```

`details` для оборудования:

```json
{
  "device_type": "laptop",
  "serial_number": "SN123456",
  "model": "Apple M3 Pro",
  "description": "16GB RAM"
}
```

Ответ `200 OK`:

```json
{
  "resource": {}
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### PATCH /api/v1/resources/{resource_id}/status

Изменение статуса доступности ресурса с причиной. Требуется роль `admin`.

Запрос:

```json
{
  "status": "RESOURCE_STATUS_MAINTENANCE",
  "reason": "Projector maintenance"
}
```

Ответ `200 OK`:

```json
{
  "resource": {}
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "invalid status"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: админские формы используют эту ручку для включения или снятия признака "временно недоступно". При установке недоступности фронтенд отправляет `RESOURCE_STATUS_MAINTENANCE`, при снятии — `RESOURCE_STATUS_AVAILABLE`.

### DELETE /api/v1/resources/{resource_id}

Удаление ресурса. Требуется роль `admin`.

Ответ `200 OK`:

```json
{
  "success": true
}
```

Также фронтенд поддерживает ответ простым boolean:

```json
true
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### GET /api/v1/resources/{resource_id}/status

Проверка доступности ресурса.

Ответ `200 OK`:

```json
{
  "is_available": true,
  "status": "RESOURCE_STATUS_AVAILABLE"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### PATCH /api/v1/resources/{resource_id}/occupancy

Системная ручка для интеграции booking/resource сервиса.

Запрос:

```json
{
  "is_occupied": true
}
```

Ответ `200 OK`:

```json
{
  "resource": {}
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

## Бронирования

Все ручки раздела требуют:

```http
Authorization: Bearer <access_token>
```

Время передается в формате RFC3339/ISO 8601 UTC.

### POST /api/v1/bookings

Создание бронирования выбранного ресурса.

Запрос:

```json
{
  "resource_id": "string UUID",
  "user_id": "string UUID",
  "starts_at": "2026-05-04T10:00:00.000Z",
  "ends_at": "2026-05-04T11:00:00.000Z"
}
```

Ответ `200 OK`:

```json
{
  "booking": {
    "booking_id": "string UUID",
    "resource_id": "string UUID",
    "user_id": "string UUID",
    "starts_at": "2026-05-04T10:00:00Z",
    "ends_at": "2026-05-04T11:00:00Z",
    "status": "BOOKING_STATUS_CONFIRMED"
  }
}
```

Также поддерживается ответ без wrapper-объекта:

```json
{
  "booking_id": "string UUID",
  "resource_id": "string UUID",
  "user_id": "string UUID",
  "starts_at": "2026-05-04T10:00:00Z",
  "ends_at": "2026-05-04T11:00:00Z",
  "status": "BOOKING_STATUS_CONFIRMED"
}
```

Ответ `400 Bad Request`:

```json
{
  "error": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `409 Conflict`:

```json
{
  "error": "resource is already booked"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: фронтенд отправляет `user_id`, но gateway может переопределить пользователя по access token.

### GET /api/v1/bookings

Получение бронирований пользователя.

Параметры запроса:

```text
user_id=string UUID
```

Пример:

```text
GET /api/v1/bookings?user_id=0f6e4a2a-2f2d-4a88-9d40-7f9a2c68b124
```

Ответ `200 OK`:

```json
{
  "bookings": [
    {
      "booking_id": "string UUID",
      "resource_id": "string UUID",
      "user_id": "string UUID",
      "resource_name": "A-1",
      "resource_type": "RESOURCE_TYPE_WORKSPACE",
      "resource_location": "11 этаж",
      "starts_at": "2026-05-04T10:00:00Z",
      "ends_at": "2026-05-04T11:00:00Z",
      "status": "BOOKING_STATUS_CONFIRMED"
    }
  ]
}
```

Также поддерживается ответ массивом:

```json
[
  {
    "booking_id": "string UUID",
    "resource_id": "string UUID",
    "status": "BOOKING_STATUS_CONFIRMED"
  }
]
```

Ответ `400 Bad Request`:

```json
{
  "error": "validation error"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: экран "Мои бронирования" дополнительно фильтрует отмененные и уже завершенные бронирования на стороне фронтенда.

### GET /api/v1/bookings/{booking_id}

Получение бронирования по идентификатору.

Ответ `200 OK`:

```json
{
  "booking": {}
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### POST /api/v1/bookings/{booking_id}/cancel

Отмена бронирования пользователем.

Тело запроса не передается.

Ответ `200 OK`:

```json
{
  "booking": {
    "booking_id": "string UUID",
    "status": "BOOKING_STATUS_CANCELED"
  }
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### POST /api/v1/admin/bookings/{booking_id}/cancel

Административная отмена бронирования. Требуется роль `admin`.

Тело запроса не передается.

Ответ `200 OK`:

```json
{
  "booking": {
    "booking_id": "string UUID",
    "status": "BOOKING_STATUS_CANCELED"
  }
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

### GET /api/v1/resources/{resource_id}/bookings

Получение бронирований ресурса за интервал.

Параметры запроса:

```text
from=RFC3339 timestamp
to=RFC3339 timestamp
```

Пример:

```text
GET /api/v1/resources/RESOURCE_ID/bookings?from=2026-05-04T00:00:00.000Z&to=2026-05-04T23:59:59.000Z
```

Ответ `200 OK`:

```json
{
  "bookings": []
}
```

Также поддерживается ответ массивом:

```json
[]
```

Ответ `400 Bad Request`:

```json
{
  "error": "invalid interval"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `500 Internal Server Error`:

```json
{
  "detail": "INTERNAL SERVER ERROR"
}
```

Особенность: фронтенд отбрасывает бронирования со статусом `BOOKING_STATUS_CANCELED` и использует оставшиеся интервалы для отображения занятости рабочих мест, переговорных и оборудования.

## Уведомления

Уведомления идут через маршрут без `/api/v1`:

```text
/notifications
```

Все запросы отправляют:

```http
Authorization: Bearer <access_token>
```

### GET /notifications/{user_id}

Открытие SSE-like stream уведомлений пользователя.

Особенность: используется `fetch` stream, потому что native `EventSource` не позволяет отправлять заголовок `Authorization`.

Ответ `200 OK`:

```text
Content-Type: text/event-stream

data: {"id":"string","text":"string","user_id":"string"}
```

Сообщение:

```json
{
  "id": "string",
  "text": "string",
  "user_id": "string UUID"
}
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`:

```json
{
  "error": "temporary gateway error"
}
```

Особенности stream-подключения:

- при `401` фронтенд один раз пробует обновить токены и переподключиться;
- при `401` или `403` после неуспешного refresh сессия считается недоступной;
- при временной ошибке или закрытии stream фронтенд вызывает обработчик ошибки и переподключается через 1500 мс;
- некорректный JSON в `data:` считается ошибкой stream.

### POST /notifications/confirm/{user_id}/{message_id}

Подтверждение прочтения уведомления.

Тело запроса не передается.

Ответ `200 OK`:

```text
success
```

Ответ `401 Unauthorized`:

```json
{
  "detail": "Invalid token"
}
```

Ответ `403 Forbidden`:

```json
{
  "detail": "FORBIDDEN"
}
```

Ответ `404 Not Found`:

```json
{
  "detail": "NOT FOUND"
}
```

Ответ `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`:

```json
{
  "error": "temporary gateway error"
}
```

Особенности подтверждения:

- при `401` фронтенд один раз пробует обновить токены и повторить запрос;
- при `502`, `503`, `504` фронтенд делает retry с задержками 300 мс и 1000 мс;
- если `VITE_NOTIFICATIONS_URL` начинается с `/api/v1`, подтверждение отправляется через общий axios-клиент на `/api/v1/notifications/confirm/{user_id}/{message_id}`.

## Реализованные Особенности Сервиса

### Прокси и окружение

- `VITE_API_URL` по умолчанию равен `/api/v1`.
- `VITE_NOTIFICATIONS_URL` по умолчанию ведет на `/notifications`.
- Production server в `server.cjs` отдает собранный `dist` и проксирует `/api`, `/api/...`, `/notifications/...` в `API_GATEWAY_URL`.
- Если путь не относится к API, сервер возвращает static-файл или `index.html` для SPA-роутинга.

### Token refresh

- Access token хранится в `localStorage` под ключом `access_token`.
- Refresh token хранится под ключом `refresh_token`.
- На каждый обычный API-запрос axios автоматически добавляет `Authorization: Bearer <access_token>`.
- При первом `401` запрос помечается как retry, выполняется `/auth/refresh`, затем исходный запрос повторяется.
- Пока refresh-запрос уже идет, остальные запросы ждут результат в очереди и не создают дополнительные refresh-запросы.
- Если refresh не удался, оба токена удаляются, пользователь перенаправляется на `/login`.

### Восстановление сессии

- При старте приложения фронтенд пытается восстановить пользователя из сохраненных токенов.
- Если access token отсутствует, но есть refresh token, сначала выполняется refresh.
- Затем вызывается `/auth/validate`.
- Идентификатор пользователя берется из ответа validate или из JWT payload.
- Профиль пользователя загружается через `/user/user?id=<id>`.
- Если профиль получить не удалось, фронтенд создает минимальную локальную модель пользователя из claims токена.

### Роли и admin-доступ

- Админский доступ на фронтенде определяется наличием роли `admin` без учета регистра.
- Admin-экраны используют ручки создания, обновления, удаления ресурсов и удаления пользователей.
- Backend/gateway должен дополнительно проверять роль на защищенных admin-операциях.

### Нормализация ресурсов

- Основной идентификатор ресурса: `resource_id`.
- Поддерживаемые fallback-поля: `uuid`, `id`.
- Основной тип ресурса: `type`.
- Поддерживаемое fallback-поле: `resource_type`.
- Typed details читаются из `meeting_room`, `workspace`, `device`.
- Для обратной совместимости typed details могут быть восстановлены из общего объекта `details`.
- UI-статус `mine` не приходит от backend, а вычисляется фронтендом по пересечению `resource_id` с активными бронированиями текущего пользователя.

### Нормализация бронирований

- Новый формат времени: `starts_at` и `ends_at`.
- Legacy fallback: `date`, `time_from`, `time_to`.
- Ответы booking API поддерживаются и в wrapper-формате `{ "booking": {} }`, `{ "bookings": [] }`, и как plain object/plain array.
- Отмененные бронирования не показываются в пользовательских списках и не учитываются как активная занятость.
- Завершенные бронирования фильтруются на странице "Мои бронирования".

### Импорт рабочих мест

Скрипт импорта использует:

```text
GET /api/v1/resources/list?type=...
POST /api/v1/resources
```

Особенности импорта:

- токен передается через переменную `TOKEN`;
- перед стартом проверяется expiration JWT;
- импорт по умолчанию создает `RESOURCE_TYPE_WORKSPACE` и `RESOURCE_TYPE_MEETING_ROOM`;
- дубликаты пропускаются по ключу `type + name + floor`;
- при `429 Too Many Requests` скрипт повторяет запрос с учетом `Retry-After` или exponential backoff.
