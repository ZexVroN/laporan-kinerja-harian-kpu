import axios from 'axios'
import { api, cleanParams } from './api'

/**
 * Unduh berkas dari API sebagai blob agar kesalahan (mis. 422 terlalu banyak baris)
 * dapat ditampilkan sebagai pesan, bukan halaman JSON.
 */
export async function downloadFile(url: string, params: object) {
  try {
    const response = await api.get<Blob>(url, { params: cleanParams(params), responseType: 'blob' })
    const disposition = response.headers['content-disposition'] as string | undefined
    const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? 'laporan'

    const href = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  } catch (error) {
    // Isi galat berupa blob JSON; ubah kembali agar errorMessage() bisa membacanya.
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text())
      } catch {
        /* biarkan apa adanya */
      }
    }
    throw error
  }
}
