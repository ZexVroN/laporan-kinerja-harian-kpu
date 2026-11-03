import {
  BookOpen,
  Building2,
  CalendarRange,
  FilePenLine,
  FileText,
  History,
  House,
  Lock,
  ScrollText,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Label bagian untuk breadcrumb. */
  section: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

const beranda: NavItem = { to: '/beranda', label: 'Beranda', icon: House, section: 'Beranda' }
const triwulan: NavItem = { to: '/laporan/triwulan', label: 'Laporan Triwulan', icon: CalendarRange, section: 'Laporan' }
const profil: NavItem = { to: '/profil', label: 'Profil Saya', icon: UserRound, section: 'Akun' }

export const NAVIGATION: Record<Role, NavGroup[]> = {
  pegawai: [
    {
      title: 'Menu Utama',
      items: [
        beranda,
        { to: '/laporan/isi', label: 'Isi Laporan', icon: FilePenLine, section: 'Laporan' },
        { to: '/laporan', label: 'Riwayat Laporan', icon: History, section: 'Laporan' },
        triwulan,
      ],
    },
    { title: 'Akun', items: [profil, { to: '/panduan', label: 'Panduan', icon: BookOpen, section: 'Akun' }] },
  ],
  admin: [
    {
      title: 'Menu Utama',
      items: [beranda, { to: '/laporan', label: 'Laporan Pegawai', icon: FileText, section: 'Laporan' }, triwulan],
    },
    {
      title: 'Administrasi',
      items: [
        { to: '/admin/pegawai', label: 'Manajemen Pegawai', icon: Users, section: 'Administrasi' },
        { to: '/admin/data-induk', label: 'Unit & Pangkat', icon: Building2, section: 'Administrasi' },
        { to: '/admin/kunci-periode', label: 'Kunci Periode', icon: Lock, section: 'Administrasi' },
        { to: '/admin/log', label: 'Log Aktivitas', icon: ScrollText, section: 'Administrasi' },
        { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings, section: 'Administrasi' },
      ],
    },
    { title: 'Akun', items: [profil] },
  ],
  pimpinan: [
    {
      title: 'Menu Utama',
      items: [beranda, { to: '/laporan', label: 'Laporan Pegawai', icon: FileText, section: 'Laporan' }, triwulan],
    },
    { title: 'Akun', items: [profil] },
  ],
}

export function findNavItem(role: Role, pathname: string): NavItem | undefined {
  return NAVIGATION[role].flatMap((g) => g.items).find((item) => item.to === pathname)
}
