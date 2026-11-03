import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, cleanParams } from './api'
import type {
  ActionPlan,
  ActivityLogEntry,
  AppInfo,
  CompiledReport,
  Dashboard,
  Employee,
  EmployeeOption,
  Paginated,
  PaginationMeta,
  PeriodLockRow,
  Rank,
  Report,
  ReportFilters,
  Settings,
  Unit,
  WorkType,
} from './types'

export const keys = {
  dashboard: ['dashboard'] as const,
  reports: (f: ReportFilters) => ['reports', f] as const,
  summary: (f: ReportFilters) => ['reports', 'summary', f] as const,
  units: ['units'] as const,
  ranks: ['ranks'] as const,
  actionPlans: ['action-plans'] as const,
  employeeOptions: ['employees', 'options'] as const,
  employees: (f: object) => ['employees', 'list', f] as const,
  periodLocks: (year: number) => ['period-locks', year] as const,
  logs: (f: object) => ['activity-logs', f] as const,
  settings: ['settings'] as const,
  appInfo: ['app-info'] as const,
}

export function useDashboard<T extends Dashboard = Dashboard>() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: async () => (await api.get<{ data: T }>('/dashboard')).data.data,
  })
}

export function useReports(filters: ReportFilters, enabled = true) {
  return useQuery({
    queryKey: keys.reports(filters),
    queryFn: async () => (await api.get<Paginated<Report>>('/reports', { params: cleanParams(filters) })).data,
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useReportSummary(filters: ReportFilters, enabled: boolean) {
  return useQuery({
    queryKey: keys.summary(filters),
    queryFn: async () => (await api.get<{ data: CompiledReport }>('/reports/summary', { params: cleanParams(filters) })).data.data,
    enabled,
    retry: false,
  })
}

export interface ReportInput {
  report_date: string
  start_time: string
  end_time: string
  activity_description: string
  remarks?: string | null
  action_plan_id: number | null
  action_plan_other: string | null
  work_type: WorkType
  data_source: string | null
  target: number
  realization: number
  unit_of_measure: string
  evidence_url: string | null
  is_completed: boolean
}

/** Setelah laporan berubah, segarkan daftar, rekap, dan dasbor. */
function useInvalidateReports() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    queryClient.invalidateQueries({ queryKey: keys.dashboard })
  }
}

export function useCreateReport() {
  const invalidate = useInvalidateReports()
  return useMutation({
    mutationFn: async (input: ReportInput) => (await api.post<{ data: Report; message: string }>('/reports', input)).data,
    onSuccess: invalidate,
  })
}

export function useUpdateReport() {
  const invalidate = useInvalidateReports()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<ReportInput> & { id: number }) =>
      (await api.put<{ data: Report; message: string }>(`/reports/${id}`, input)).data,
    onSuccess: invalidate,
  })
}

export function useDeleteReport() {
  const invalidate = useInvalidateReports()
  return useMutation({
    mutationFn: async (id: number) => (await api.delete<{ message: string }>(`/reports/${id}`)).data,
    onSuccess: invalidate,
  })
}

export function useUnits() {
  return useQuery({ queryKey: keys.units, queryFn: async () => (await api.get<{ data: Unit[] }>('/units')).data.data, staleTime: 10 * 60_000 })
}

export function useActionPlans() {
  return useQuery({
    queryKey: keys.actionPlans,
    queryFn: async () => (await api.get<{ data: ActionPlan[] }>('/action-plans')).data.data,
    staleTime: 5 * 60_000,
  })
}

export function useRanks() {
  return useQuery({ queryKey: keys.ranks, queryFn: async () => (await api.get<{ data: Rank[] }>('/ranks')).data.data, staleTime: 10 * 60_000 })
}

export function useEmployeeOptions(enabled = true) {
  return useQuery({
    queryKey: keys.employeeOptions,
    queryFn: async () => (await api.get<{ data: EmployeeOption[] }>('/employees/options')).data.data,
    staleTime: 5 * 60_000,
    enabled,
  })
}

export interface EmployeeFilters {
  q?: string
  unit_id?: number
  role?: string
  status?: 'active' | 'inactive'
  page?: number
  per_page?: number
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: keys.employees(filters),
    queryFn: async () => (await api.get<Paginated<Employee>>('/employees', { params: cleanParams(filters) })).data,
    placeholderData: keepPreviousData,
  })
}

export function usePeriodLocks(year: number) {
  return useQuery({
    queryKey: keys.periodLocks(year),
    queryFn: async () => (await api.get<{ data: PeriodLockRow[] }>('/period-locks', { params: { year } })).data.data,
  })
}

export interface LogFilters {
  q?: string
  action?: string
  date_from?: string
  date_to?: string
  page?: number
}

/** Log memakai paginator Laravel biasa (meta di tingkat atas); diseragamkan menjadi Paginated. */
export function useActivityLogs(filters: LogFilters) {
  return useQuery({
    queryKey: keys.logs(filters),
    queryFn: async () => {
      const { data } = await api.get<{ data: ActivityLogEntry[] } & PaginationMeta>('/activity-logs', { params: cleanParams({ ...filters, per_page: 25 }) })
      const { data: rows, current_page, last_page, per_page, total, from, to } = data
      return { data: rows, meta: { current_page, last_page, per_page, total, from, to } } satisfies Paginated<ActivityLogEntry>
    },
    placeholderData: keepPreviousData,
  })
}

export function useSettings(enabled = true) {
  return useQuery({ queryKey: keys.settings, queryFn: async () => (await api.get<{ data: Settings }>('/settings')).data.data, enabled })
}

export function useAppInfo() {
  return useQuery({
    queryKey: keys.appInfo,
    queryFn: async () => (await api.get<{ data: AppInfo }>('/app-info')).data.data,
    staleTime: 30 * 60_000,
  })
}
