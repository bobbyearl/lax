import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/lax/',
  resolve: { tsconfigPaths: true },
  plugins: [TanStackRouterVite(), tailwindcss(), viteReact()],
})
