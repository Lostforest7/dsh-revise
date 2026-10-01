import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { revise } from '../../lib/vite.js'
export default defineConfig({ root: 'examples/vite-react', plugins: [revise(), react()], server: { port: 5173, strictPort: true } })
