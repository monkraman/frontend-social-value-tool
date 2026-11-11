import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localRepository } from './local-repository/plugin.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // SV_LOCAL_REPOSITORY has no VITE_ prefix on purpose: the folder path never reaches browser code.
  const env = loadEnv(mode, process.cwd(), 'SV_')
  return {
    plugins: [react(), localRepository(env.SV_LOCAL_REPOSITORY)],
  }
})
