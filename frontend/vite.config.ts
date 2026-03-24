import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const urlPrefix = process.env.VITE_URL_PREFIX || ''

// Behind a reverse proxy (Tailscale serve --set-path) that strips the URL prefix,
// all requests arrive without the prefix. We need base set so the HTML references
// prefixed asset URLs, but then Vite rejects stripped incoming requests.
// This middleware re-adds the prefix to incoming requests so Vite can serve them.
function readdPrefix(): Plugin {
  return {
    name: 'readd-prefix',
    configureServer(server) {
      // This runs before Vite's internal middleware.
      // Re-add the prefix for asset requests so Vite can serve them,
      // but NOT for /api requests which need to hit the proxy as-is.
      server.middlewares.use((req, _res, next) => {
        if (urlPrefix && req.url && !req.url.startsWith(urlPrefix) && !req.url.startsWith('/api')) {
          req.url = urlPrefix + req.url
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: urlPrefix ? `${urlPrefix}/` : '/',
  plugins: [readdPrefix(), react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
      },
    },
    allowedHosts: true,
  },
  preview: { allowedHosts: true }
})
