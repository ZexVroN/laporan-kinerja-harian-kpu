export type Role = 'pegawai' | 'admin' | 'pimpinan'

export interface RankRef {
  id: number
  code: string
  name: string
  label: string
}

export interface NamedRef {
  id: number
  name: string
}

export interface Employee {
  id: number
  full_name: string
  nip: string
  nip_formatted: string
  position: string
  rank?: RankRef | null
  unit?: NamedRef
  supervisor?: { id: number; full_name: string; nip: string; position: string } | null
  user?: {
    id: number
    username: string
    email: string | null
    role: Role
    role_label: string
    is_active: boolean
    last_login_at: string | null
  } | null
  reports_count?: number
}

export interface User {
  id: number
  name: string
  username: string
  email: string | null
  role: Role
  role_label: string
  is_active: boolean
  must_change_password: boolean
  last_login_at: string | null
  employee?: Employee | null
}

export interface Report {
  id: number
  report_date: string
  month: number
  month_name: string
  year: number
  quarter: number
  quarter_label: string
  activity_description: string
  remarks: string | null
  snapshot: { rank: string | null; position: string; unit?: NamedRef }
  employee?: { id: number; full_name: string; nip: string; nip_formatted: string }
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface Unit {
  id: number
  name: string
  code: string | null
  is_active: boolean
  employees_count?: number
}

export interface Rank {
  id: number
  code: string
  name: string
  sort_order: number
}

export interface EmployeeOption {
  id: number
  full_name: string
  nip: string
  unit_id: number
  position: string
}

export interface ReportFilters {
  q?: string
  employee_id?: number
  unit_id?: number
  date_from?: string
  date_to?: string
  year?: number
  month?: number
  quarter?: number
  sort?: 'report_date' | 'created_at' | 'employee_name'
  direction?: 'asc' | 'desc'
  per_page?: number
  page?: number
}

export interface CompiledGroup {
  employee: {
    id: number
    full_name: string
    nip: string
    nip_formatted: string
    rank: string | null
    position: string
    unit: string | null
  }
  supervisor: { full_name: string; nip_formatted: string; position: string } | null
  reports: { id: number; report_date: string; report_date_formatted: string; activity_description: string; remarks: string | null }[]
  days_reported: number
  total: number
}

export interface CompiledReport {
  title: string
  period_label: string
  period_type: 'month' | 'quarter' | 'range'
  period_from: string
  period_to: string
  is_quarter: boolean
  generated_at: string
  settings: Settings
  groups: CompiledGroup[]
  total: number
  limits: { pdf_max_rows: number }
}

export interface Settings {
  app_name: string
  instansi_nama: string
  instansi_kop_1: string
  instansi_kop_2: string
  instansi_alamat: string
  kota_ttd: string
}

export interface PeriodInfo {
  today: string
  year: number
  quarter: number
  quarter_label: string
  quarter_start: string
  quarter_end: string
}

export interface MonthlyPoint {
  month: number
  label: string
  total: number | null
}

export interface UnitStat {
  id: number
  name: string
  employees: number
  total: number
}

export interface PegawaiDashboard {
  role: 'pegawai'
  period: PeriodInfo
  today: { date: string; total: number }
  month: { total: number; days_reported: number; workdays: number }
  quarter: { total: number; days_reported: number; workdays: number }
  monthly: MonthlyPoint[]
  quarters: { quarter: number; label: string; total: number; days_reported: number; workdays: number; is_current: boolean; is_locked: boolean }[]
  recent: { id: number; report_date: string; activity_description: string; remarks: string | null; created_at: string }[]
}

export interface AdminDashboard {
  role: 'admin'
  period: PeriodInfo
  employees_total: number
  units_total: number
  accounts_active: number
  accounts_inactive: number
  reports_year: number
  reports_month: number
  month_workdays: number
  by_unit: UnitStat[]
  today: { active_employees: number; reported: number; missing_total: number; missing: { id: number; full_name: string; unit: string | null }[] }
  latest: { id: number; report_date: string; created_at: string; employee: string; unit: string | null; activity_description: string }[]
}

export interface PimpinanDashboard {
  role: 'pimpinan'
  period: PeriodInfo
  active_employees: number
  quarter: { quarter: number; label: string; is_current: boolean; total: number; workdays: number; coverage_percent: number | null }
  avg_per_employee_per_day: number
  monthly: MonthlyPoint[]
  quarters: { quarter: number; label: string; is_current: boolean; total: number; workdays: number; coverage_percent: number | null }[]
  by_unit: UnitStat[]
  coverage: { id: number; full_name: string; unit: string | null; days_reported: number; workdays: number; total: number }[]
}

export type Dashboard = PegawaiDashboard | AdminDashboard | PimpinanDashboard

export interface ActivityLogEntry {
  id: number
  action: string
  description: string
  properties: { old?: Record<string, unknown>; new?: Record<string, unknown>; filters?: Record<string, unknown> } | null
  subject_type: string | null
  subject_id: number | null
  ip_address: string | null
  user: { id: number; name: string; username: string; role_label: string } | null
  created_at: string
}

export interface PeriodLockRow {
  year: number
  quarter: number
  label: string
  start: string
  end: string
  auto_lock_at: string
  is_locked: boolean
  mode: 'manual' | 'otomatis'
  changed_by: string | null
  changed_at: string | null
}
