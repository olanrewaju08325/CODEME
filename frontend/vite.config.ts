import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from root directory. Passing '' as the third parameter loads all variables regardless of prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    define: {
      'process.env.SUPABASE_PROJECT_URL': JSON.stringify(env.SUPABASE_PROJECT_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'codeme.jpg'],
        manifest: {
          name: 'CodeMe Learning Platform',
          short_name: 'CodeMe',
          description: 'The official mobile-first learning app for CodeMe Academy Nigeria.',
          theme_color: '#0C4A8C',
          background_color: '#07060D',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            {
              src: '/codeme.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any'
            },
            {
              src: '/codeme.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            animation: ['gsap', 'framer-motion'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react']
          }
        }
      }
    }
  }
})
