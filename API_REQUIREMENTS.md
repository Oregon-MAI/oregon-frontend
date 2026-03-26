# API Requirements — Frontend T1

Базовый URL: `VITE_API_URL` (по умолчанию `/api/v1`)

Все защищённые ручки требуют заголовок:
```
Authorization: Bearer {access_token}
```

---

## 1. Аутентификация

### POST /auth/login
Вход по логину и паролю.

**Request:**
```json
{
  "login": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

---

### POST /auth/register
Регистрация нового пользователя.

**Request:**
```json
{
  "login": "string",
  "password": "string",
  "name": "string",
  "surname": "string",
  "email": "string"
}
```
**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

---

### GET /auth/validate
Проверка текущей сессии и получение данных пользователя. Вызывается при каждом открытии приложения.

**Response:**
```json
{
  "id": "string",
  "login": "string",
  "name": "string",
  "surname": "string",
  "email": "string",
  "roles": ["string"]
}
```
Роли: `ADMIN`, `USER` (или аналог)

---

### GET /auth/refresh
Обновление access_token по refresh_token. Вызывается автоматически при 401.

**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

---

## 2. Ресурсы (ResourcePublicService)

Все рабочие места, переговорки и оборудование — единая сущность `Resource`.

### Структура Resource
```json
{
  "resource_id": "string",
  "name": "string",
  "type": "RESOURCE_TYPE_WORKSPACE",
  "location": "string",
  "status": "RESOURCE_STATUS_AVAILABLE",
  "meeting_room": { "capacity": 8, "has_projector": true, "has_whiteboard": true },
  "workspace":    { "has_monitor": true },
  "device":       { "device_type": "string", "serial_number": "string", "model": "string", "description": "string" },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

> `oneof details` из proto сериализуется плоско — только одно из полей (`meeting_room`, `workspace`, `device`) присутствует в ответе в зависимости от типа ресурса.

**Типы (`type`):**
| Значение | Что это |
|----------|---------|
| `RESOURCE_TYPE_MEETING_ROOM` | Переговорная комната |
| `RESOURCE_TYPE_WORKSPACE` | Рабочее место / стол |
| `RESOURCE_TYPE_DEVICE` | Оборудование |

**Статусы (`status`):**
| Значение | Что это |
|----------|---------|
| `RESOURCE_STATUS_AVAILABLE` | Свободен |
| `RESOURCE_STATUS_OCCUPIED` | Занят прямо сейчас |
| `RESOURCE_STATUS_MAINTENANCE` | Плановое обслуживание |
| `RESOURCE_STATUS_EMERGENCY` | Форс-мажор |

> Статус `mine` (забронировано мной) — фронтенд определяет сам, сверяя `resource_id` с бронированиями из `/bookings/my`.

---

### GetResourcesList
Получить список ресурсов с фильтром по типу. Используется для страниц карты, переговорок и оборудования.

**Request:**
```json
{
  "types": ["RESOURCE_TYPE_WORKSPACE"]
}
```
Можно передать несколько типов или пустой массив (вернёт все).

**Response:**
```json
{
  "resources": [ /* Resource[] */ ]
}
```

---

### GetAvailableResources
Получить только свободные ресурсы. Фильтрация по типу и локации.

**Request:**
```json
{
  "types": ["RESOURCE_TYPE_MEETING_ROOM"],
  "location": "11 этаж"
}
```
**Response:**
```json
{
  "resources": [ /* Resource[] */ ],
  "total_count": 5
}
```

---

### GetResource
Получить один ресурс по ID.

**Request:**
```json
{ "resource_id": "string" }
```
**Response:**
```json
{ "resource": { /* Resource */ } }
```

---

### CreateResource
Создать новый ресурс (только администратор).

**Request:**
```json
{
  "name": "Переговорка A3",
  "type": "RESOURCE_TYPE_MEETING_ROOM",
  "location": "11 этаж, крыло А",
  "meeting_room": { "capacity": 6, "has_projector": true, "has_whiteboard": false }
}
```
**Response:**
```json
{ "resource": { /* Resource */ } }
```

---

### UpdateResource
Обновить поля ресурса (только администратор). Передаётся `field_mask` с именами изменяемых полей.

**Request:**
```json
{
  "resource_id": "string",
  "resource": { "name": "Новое название" },
  "field_mask": { "paths": ["name"] }
}
```
**Response:**
```json
{ "resource": { /* Resource */ } }
```

---

### ChangeResourceStatus
Изменить статус ресурса с причиной (только администратор).

**Request:**
```json
{
  "resource_id": "string",
  "status": "RESOURCE_STATUS_MAINTENANCE",
  "reason": "Плановый ремонт кондиционера"
}
```
**Response:**
```json
{ "resource": { /* Resource */ } }
```

---

### DeleteResource
Удалить ресурс (только администратор).

**Request:**
```json
{ "resource_id": "string" }
```
**Response:**
```json
{ "success": true }
```

---

## 3. Бронирования ресурсов

Запросы на бронирование идут в отдельный booking-сервис. `resource_id` берётся из Resource.

### POST /bookings
Забронировать любой ресурс.

**Request:**
```json
{
  "resource_id": "string",
  "date": "YYYY-MM-DD",
  "time_from": "HH:MM",
  "time_to": "HH:MM"
}
```
**Response:**
```json
{
  "id": "string",
  "resource_id": "string",
  "resource_name": "string",
  "date": "YYYY-MM-DD",
  "time_from": "HH:MM",
  "time_to": "HH:MM"
}
```

---

## 4. Бронирования пользователя

### GET /bookings/my
Получить список всех активных бронирований текущего пользователя.

**Response:**
```json
[
  {
    "id": "string",
    "resource_id": "string",
    "resource_name": "string",
    "date": "YYYY-MM-DD",
    "time_from": "HH:MM",
    "time_to": "HH:MM"
  }
]
```

---

### DELETE /bookings/{id}
Отменить бронирование.

**Response:** `204 No Content` или `{ "success": true }`

---

## 5. Обработка ошибок

Все ручки при ошибке возвращают:
```json
{
  "message": "Описание ошибки"
}
```


