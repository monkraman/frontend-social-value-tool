import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localRepository } from './local-repository/plugin.ts'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // SV_LOCAL_REPOSITORY has no VITE_ prefix on purpose: the folder path never reaches browser code.
  const env = loadEnv(mode, process.cwd(), 'SV_')
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim()
  const apiTarget = apiUrl || 'http://127.0.0.1:8000'

  // The backend URL comes only from the hosting platform's environment variables (Vercel project
  // settings, the Azure workflow's GitHub variable). A production build without it would call the
  // wrong backend, so it stops here instead.
  if (command === 'build' && mode === 'production') {
    if (!apiUrl) {
      throw new Error(
        'VITE_API_URL is not set. Set it in the hosting platform (Vercel: Project Settings > Environment ' +
          'Variables; Azure: the GitHub variable used by the deploy workflow), or in .env.production.local ' +
          'for a local build.',
      )
    }
    const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(apiUrl)
    if (!apiUrl.startsWith('https://') && !local) {
      throw new Error(`VITE_API_URL must be an https:// address (got "${apiUrl}").`)
    }
  }
  return {
    plugins: [react(), localRepository(env.SV_LOCAL_REPOSITORY)],
    server: {
      proxy: {
        '/api-proxy': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
        },
      },
    },
  }
})
