import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function parsePort(value: string | undefined, fallback: number) {
  const port = Number(value)

  return Number.isInteger(port) && port > 0 ? port : fallback
}

function parseAllowedHosts(value: string | undefined) {
  if (!value) {
    return undefined
  }

  if (value.trim() === 'true') {
    return true
  }

  return value
    .split(',')
    .map(host => host.trim())
    .filter(Boolean)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiGatewayUrl = env.API_GATEWAY_URL || env.VITE_API_GATEWAY_URL || 'http://localhost:8000'
  const allowedHosts = parseAllowedHosts(env.VITE_ALLOWED_HOSTS)

  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || env.FRONTEND_HOST || '0.0.0.0',
      port: parsePort(env.VITE_DEV_PORT || env.PORT, 5173),
      ...(allowedHosts ? { allowedHosts } : {}),
      proxy: {
        '/api': {
          target: apiGatewayUrl,
          changeOrigin: true,
        },
        '/notifications': {
          target: apiGatewayUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
