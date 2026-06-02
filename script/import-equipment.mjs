import fs from 'node:fs/promises'

const API_URL = (process.env.API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
const TOKEN = process.env.TOKEN
const EQUIPMENT_PATH = process.env.EQUIPMENT_PATH
const CREATE_DELAY_MS = Number(process.env.CREATE_DELAY_MS ?? 250)
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 5)
const DEFAULT_LOCATION = process.env.LOCATION ?? 'Склад'

if (!TOKEN) {
  console.error('TOKEN is required. Example: TOKEN="..." API_URL="http://localhost:8000/api/v1" node script/import-equipment.mjs')
  process.exit(1)
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

const tokenPayload = decodeJwtPayload(TOKEN)
if (tokenPayload?.exp && tokenPayload.exp * 1000 <= Date.now()) {
  console.error(`TOKEN is expired. Expired at ${new Date(tokenPayload.exp * 1000).toISOString()}`)
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${TOKEN}`,
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function makeEquipment({ count, name, deviceType, model, serialPrefix, description, location = DEFAULT_LOCATION }) {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1

    return {
      name: `${name} ${pad(number)}`,
      type: 'RESOURCE_TYPE_DEVICE',
      location,
      device: {
        device_type: deviceType,
        model,
        serial_number: `${serialPrefix}-${pad(number)}`,
        description,
      },
    }
  })
}

function generateEquipment() {
  return [
    ...makeEquipment({
      count: 20,
      name: 'Lenovo ThinkBook',
      deviceType: 'laptop',
      model: 'ThinkBook 14 G6',
      serialPrefix: 'LTB',
      description: 'Lenovo ThinkBook laptop',
    }),
    ...makeEquipment({
      count: 15,
      name: 'MacBook Pro',
      deviceType: 'laptop',
      model: 'MacBook Pro 14',
      serialPrefix: 'MBP',
      description: 'Apple MacBook Pro laptop',
    }),
    ...makeEquipment({
      count: 15,
      name: 'Dell UltraSharp',
      deviceType: 'monitor',
      model: 'UltraSharp 27',
      serialPrefix: 'DUS',
      description: 'Dell UltraSharp monitor',
    }),
  ]
}

function equipmentKey(resource) {
  const serial = resource.device?.serial_number ?? resource.details?.serial_number ?? ''
  return `${resource.type}|${resource.name}|${resource.location}|${serial}`
}

function toCreatePayload(resource) {
  const { status, details, device, resource_id, uuid, id, created_at, updated_at, ...rest } = resource

  return {
    ...rest,
    type: 'RESOURCE_TYPE_DEVICE',
    device: device ?? details,
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null
      const error = new Error(`${options.method ?? 'GET'} ${path} failed: 429 ${body}`)
      error.retryAfterMs = retryAfterMs
      error.rateLimited = true
      throw error
    }
    if (response.status === 401) {
      throw new Error(
        `${options.method ?? 'GET'} ${path} failed: 401 unauthorized. ` +
        'Check that TOKEN is a fresh access token and API_URL points to the same backend you logged into. ' +
        body,
      )
    }
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${response.status} ${body}`)
  }

  return response.json()
}

async function requestWithRetry(path, options = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await request(path, options)
    } catch (error) {
      if (!error.rateLimited || attempt === MAX_RETRIES) {
        throw error
      }

      const delay = error.retryAfterMs ?? Math.min(1000 * 2 ** attempt, 10000)
      console.log(`rate limited, retrying in ${delay}ms`)
      await wait(delay)
    }
  }
}

async function loadEquipment() {
  if (!EQUIPMENT_PATH) return generateEquipment()

  const raw = await fs.readFile(EQUIPMENT_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${EQUIPMENT_PATH} to contain an array`)
  }
  return parsed
}

const equipment = await loadEquipment()
const existingResponse = await requestWithRetry('/resources/list?type=RESOURCE_TYPE_DEVICE')
const existingKeys = new Set((existingResponse.resources ?? []).map(equipmentKey))

let created = 0
let skipped = 0

for (const resource of equipment) {
  const normalized = {
    ...resource,
    type: 'RESOURCE_TYPE_DEVICE',
    location: resource.location || DEFAULT_LOCATION,
  }
  const key = equipmentKey(normalized)

  if (existingKeys.has(key)) {
    skipped += 1
    continue
  }

  try {
    await requestWithRetry('/resources', {
      method: 'POST',
      body: JSON.stringify(toCreatePayload(normalized)),
    })
  } catch (error) {
    throw new Error(`Failed to create ${normalized.name}. ${error.message}`)
  }

  existingKeys.add(key)
  created += 1
  console.log(`created ${normalized.name}, location ${normalized.location}`)
  if (CREATE_DELAY_MS > 0) {
    await wait(CREATE_DELAY_MS)
  }
}

console.log(`Done. created=${created}, skipped=${skipped}, total=${equipment.length}`)
