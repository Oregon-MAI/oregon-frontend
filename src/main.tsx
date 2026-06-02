import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import './index.css'

function syncAppViewport() {
  const viewport = window.visualViewport
  const height = viewport?.height ?? window.innerHeight
  const width = viewport?.width ?? window.innerWidth
  document.documentElement.style.setProperty('--app-height', `${height}px`)
  document.documentElement.style.setProperty('--app-width', `${width}px`)
}

syncAppViewport()
window.visualViewport?.addEventListener('resize', syncAppViewport)
window.visualViewport?.addEventListener('scroll', syncAppViewport)
window.addEventListener('resize', syncAppViewport)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>,
)
