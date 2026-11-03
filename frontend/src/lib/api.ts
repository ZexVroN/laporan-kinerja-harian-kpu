import axios, { AxiosError } from 'axios'

/**
 * Klien API: cookie sesi + token CSRF (Sanctum SPA). Tidak ada token yang disimpan di browser.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
})

let csrfReady: Promise<unknown> | null = null

/** Ambil cookie XSRF-TOKEN sekali sebelum permintaan yang mengubah data. */
export function ensureCsrf(force = false) {
  if (!csrfReady || force) {
    csrfReady = axios.get('/sanctum/csrf-cookie', { withCredentials: true }).catch((e) => {
      csrfReady = null
      throw e
    })
  }
  return csrfReady
}

api.interceptors.request.use(async (config) => {
  if (config.method && config.method.toLowerCase() !== 'get') {
    await ensureCsrf()
  }
  return config
})

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** Dipanggil AuthProvider: sesi berakhir di tengah pemakaian → kembali ke halaman masuk. */
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined

    // Token CSRF kedaluwarsa: ambil ulang lalu ulangi sekali.
    if (status === 419 && config && !config._retried) {
      config._retried = true
      await ensureCsrf(true)
      return api.request(config)
    }

    if (status === 401 && !config?.url?.includes('auth/me') && !config?.url?.includes('auth/login')) {
      unauthorizedListeners.forEach((l) => l())
    }

    return Promise.reject(error)
  },
)

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

/** Pesan yang aman ditampilkan ke pengguna. */
export function errorMessage(error: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return 'Tidak dapat terhubung ke server. Periksa koneksi Anda.'
    const body = error.response.data
    const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
    if (first) return first
    if (body?.message && error.response.status < 500) return body.message
    if (error.response.status >= 500) return 'Server sedang bermasalah. Coba beberapa saat lagi.'
  }
  return fallback
}

/** Kesalahan validasi per kolom (422) untuk ditampilkan di formulir. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(error) && error.response?.status === 422 && error.response.data?.errors) {
    return Object.fromEntries(Object.entries(error.response.data.errors).map(([k, v]) => [k, v[0]]))
  }
  return {}
}

/** Buang parameter kosong agar URL rapi dan validasi backend tidak tersandung string kosong. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>
}
