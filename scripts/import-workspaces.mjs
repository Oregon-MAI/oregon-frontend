import fs from 'node:fs/promises'

const API_URL = (process.env.API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')
const TOKEN = process.env.TOKEN
const MAP_PATH = process.env.MAP_PATH ?? 'map.json'
const CREATE_DELAY_MS = Number(process.env.CREATE_DELAY_MS ?? 250)
const MAX_RETRIES = Number(process.env.MAX_RETRIES ?? 5)
const DEFAULT_RESOURCE_TYPES = ['RESOURCE_TYPE_WORKSPACE', 'RESOURCE_TYPE_MEETING_ROOM']
const IMPORT_TYPES = (process.env.IMPORT_TYPES ?? DEFAULT_RESOURCE_TYPES.join(','))
  .split(',')
  .map(type => type.trim())
  .filter(Boolean)

if (!TOKEN) {
  console.error('TOKEN is required. Example: TOKEN="..." API_URL="http://localhost:8000/api/v1" node scripts/import-workspaces.mjs')
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

function floorKey(resource) {
  try {
    return JSON.parse(resource.location ?? '{}').floor ?? ''
  } catch {
    return ''
  }
}

function resourceKey(resource) {
  return `${resource.type}|${resource.name}|${floorKey(resource)}`
}

function toCreatePayload(resource) {
  const { status, details, meeting_room, workspace, device, resource_id, uuid, id, created_at, updated_at, ...rest } = resource

  if (resource.type === 'RESOURCE_TYPE_WORKSPACE') {
    return {
      ...rest,
      workspace: workspace ?? details ?? { has_monitor: false },
    }
  }

  if (resource.type === 'RESOURCE_TYPE_MEETING_ROOM') {
    return {
      ...rest,
      meeting_room: meeting_room ?? details ?? {
        capacity: 6,
        has_projector: false,
        has_whiteboard: false,
      },
    }
  }

  if (resource.type === 'RESOURCE_TYPE_DEVICE') {
    return {
      ...rest,
      device: device ?? details,
    }
  }

  return rest
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

const raw = await fs.readFile(MAP_PATH, 'utf8')
const mapResources = JSON.parse(raw)
const resourcesToImport = mapResources.filter(resource => IMPORT_TYPES.includes(resource.type))

const existingResources = []
for (const type of IMPORT_TYPES) {
  const existingResponse = await requestWithRetry(`/resources/list?type=${encodeURIComponent(type)}`)
  existingResources.push(...(existingResponse.resources ?? []))
}
const existingKeys = new Set(existingResources.map(resourceKey))

let created = 0
let skipped = 0

for (const resource of resourcesToImport) {
  const key = resourceKey(resource)
  if (existingKeys.has(key)) {
    skipped += 1
    continue
  }

  try {
    await requestWithRetry('/resources', {
      method: 'POST',
      body: JSON.stringify(toCreatePayload(resource)),
    })
  } catch (error) {
    throw new Error(`Failed to create ${resource.name}, type ${resource.type}, floor ${floorKey(resource)}. ${error.message}`)
  }

  existingKeys.add(key)
  created += 1
  console.log(`created ${resource.name}, type ${resource.type}, floor ${floorKey(resource)}`)
  if (CREATE_DELAY_MS > 0) {
    await wait(CREATE_DELAY_MS)
  }
}

console.log(`Done. created=${created}, skipped=${skipped}, total=${resourcesToImport.length}, types=${IMPORT_TYPES.join(',')}`)
