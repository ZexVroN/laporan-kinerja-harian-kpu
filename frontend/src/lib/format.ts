import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const ROMAN = ['', 'I', 'II', 'III', 'IV']
export const QUARTER_RANGES = ['', 'Jan – Mar', 'Apr – Jun', 'Jul – Sep', 'Okt – Des']

const numberFmt = new Intl.NumberFormat('id-ID')

export function formatNumber(n: number | null | undefined) {
  return n == null ? '–' : numberFmt.format(n)
}

/** "2026-11-03" → Date lokal tanpa geser zona waktu. */
export function parseDate(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 03/11/2026 */
export function formatDateShort(ymd: string) {
  const [y, m, d] = ymd.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** 3 November 2026 */
export function formatDateLong(ymd: string) {
  const date = parseDate(ymd)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/** Selasa, 03 November 2026 */
export function formatDateFull(ymd: string) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(parseDate(ymd))
}

/** 03/11/2026 10.42 */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

export function todayYmd() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function quarterOf(ymd: string) {
  return Math.floor((parseDate(ymd).getMonth()) / 3) + 1
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 19) return 'Selamat sore'
  return 'Selamat malam'
}

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}
