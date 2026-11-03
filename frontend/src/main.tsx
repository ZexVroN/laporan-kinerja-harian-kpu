import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/auth'
import { clearReloadFlag, reloadOnceForUpdate } from './RouteError'
import { router } from './router'
import './index.css'

// Setelah pembaruan di server, berkas halaman lama tidak ada lagi: muat ulang sekali untuk versi baru.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForUpdate()) event.preventDefault()
})
// Halaman berhasil dimuat: izinkan muat ulang otomatis lagi pada pembaruan berikutnya.
window.addEventListener('load', () => setTimeout(clearReloadFlag, 10_000))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Galat 4xx (akses, validasi) tidak perlu diulang.
      retry: (count, error) => !(axios.isAxiosError(error) && (error.response?.status ?? 500) < 500) && count < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
