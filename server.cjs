const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { URL } = require('node:url')

const PORT = Number(process.env.PORT || 3001)
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000'
const DIST_DIR = path.join(__dirname, 'dist')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function isProxyRequest(url) {
  return url.startsWith('/api/') || url === '/api' || url.startsWith('/notifications/')
}

function proxyRequest(req, res) {
  const target = new URL(req.url, API_GATEWAY_URL)
  const headers = { ...req.headers, host: target.host }

  delete headers.connection
  delete headers['content-length']

  const proxy = http.request(
    target,
    {
      method: req.method,
      headers,
    },
    proxyRes => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    },
  )

  proxy.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    }
    res.end(JSON.stringify({ error: 'api gateway unavailable' }))
  })

  req.pipe(proxy)
}

function getStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0])
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(DIST_DIR, normalizedPath)

  if (!filePath.startsWith(DIST_DIR)) {
    return path.join(DIST_DIR, 'index.html')
  }

  return filePath
}

function serveStatic(req, res) {
  let filePath = getStaticPath(req.url || '/')

  if (!path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html')
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html')
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Failed to read static file')
      return
    }

    const contentType = mimeTypes[path.extname(filePath)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end()
    return
  }

  if (isProxyRequest(req.url)) {
    proxyRequest(req, res)
    return
  }

  serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`Frontend server listening on http://localhost:${PORT}`)
  console.log(`Proxying /api and /notifications to ${API_GATEWAY_URL}`)
})
