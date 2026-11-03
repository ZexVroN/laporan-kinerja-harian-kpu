import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, KeyRound, Pencil, Plus, Power, Search, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { EmptyState, ErrorState, Notice, Spinner } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/form'
import { Pagination } from '@/components/ui/pagination'
import { useUser } from '@/features/auth/auth'
import { api, errorMessage } from '@/lib/api'
import { initials } from '@/lib/format'
import { useEmployees, useUnits, type EmployeeFilters } from '@/lib/queries'
import type { Employee } from '@/lib/types'
import { EmployeeFormDialog } from './EmployeeFormDialog'

type Pending = { kind: 'reset' | 'status' | 'delete'; employee: Employee } | null

export function EmployeesPage() {
  const me = useUser()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const units = useUnits()

  const [filters, setFilters] = useState<EmployeeFilters>({ q: params.get('q') ?? undefined, page: 1 })
  const [search, setSearch] = useState(filters.q ?? '')
  const employees = useEmployees(filters)

  const [formOpen, setFormOpen] = useState(params.get('baru') === '1')
  const [editing, setEditing] = useState<Employee | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [credentials, setCredentials] = useState<{ name: string; username: string; password: string } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === (search || undefined) ? f : { ...f, q: search || undefined, page: 1 })), 350)
    return () => clearTimeout(t)
  }, [search])

  // Bersihkan ?baru=1 / ?q= setelah dibaca agar tidak membuka ulang saat dimuat ulang.
  useEffect(() => {
    if (params.size) setParams(new URLSearchParams(), { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const action = useMutation({
    mutationFn: async (p: NonNullable<Pending>) => {
      const user = p.employee.user
      if (p.kind === 'reset') return (await api.post<{ message: string; temporary_password: string }>(`/users/${user!.id}/reset-password`)).data
      if (p.kind === 'status') return (await api.patch<{ message: string }>(`/users/${user!.id}/status`, { is_active: !user!.is_active })).data
      return (await api.delete<{ message: string }>(`/employees/${p.employee.id}`)).data
    },
    onSuccess: (res, p) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      const temporary = (res as { temporary_password?: string }).temporary_password
      if (temporary) {
        setCredentials({ name: p.employee.full_name, username: p.employee.user!.username, password: temporary })
      }
      setPending(null)
    },
    onError: (error) => {
      toast.error(errorMessage(error))
      setPending(null)
    },
  })

  const rows = employees.data?.data ?? []
  const confirmText = pending && {
    reset: { title: 'Atur ulang kata sandi?', body: <>Kata sandi <strong className="text-ink">{pending.employee.full_name}</strong> diganti dengan kata sandi sementara dan semua sesinya diakhiri.</>, label: 'Atur Ulang', tone: 'primary' as const },
    status: pending.employee.user?.is_active
      ? { title: 'Nonaktifkan akun?', body: <><strong className="text-ink">{pending.employee.full_name}</strong> tidak dapat masuk lagi dan sesinya langsung diakhiri. Riwayat laporan tetap tersimpan.</>, label: 'Nonaktifkan', tone: 'danger' as const }
      : { title: 'Aktifkan kembali akun?', body: <><strong className="text-ink">{pending.employee.full_name}</strong> dapat masuk kembali dengan kata sandi terakhirnya.</>, label: 'Aktifkan', tone: 'primary' as const },
    delete: { title: 'Hapus data pegawai?', body: <>Data <strong className="text-ink">{pending.employee.full_name}</strong> dihapus dan akunnya dinonaktifkan. Hanya pegawai tanpa laporan yang dapat dihapus.</>, label: 'Ya, Hapus', tone: 'danger' as const },
  }[pending.kind]

  return (
    <>
      <PageHeader
        title="Manajemen Pegawai"
        description="Pegawai yang memiliki laporan tidak dapat dihapus, hanya dinonaktifkan."
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus aria-hidden="true" />Tambah Pegawai</Button>}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-[#efece8] px-5 py-4">
          <div className="relative flex-[2_1_240px]">
            <label htmlFor="e-q" className="sr-only">Cari pegawai</label>
            <Search className="pointer-events-none absolute top-3 left-3.5 size-[18px] text-muted" aria-hidden="true" />
            <Input id="e-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, NIP, nama pengguna, atau email" className="h-[42px] pl-10.5" />
          </div>
          <label className="flex-[1_1_200px]">
            <span className="sr-only">Unit kerja</span>
            <Select className="h-[42px]" value={filters.unit_id ?? ''} onChange={(e) => setFilters({ ...filters, unit_id: e.target.value ? Number(e.target.value) : undefined, page: 1 })}>
              <option value="">Semua unit kerja</option>
              {units.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </label>
          <label className="flex-[0_1_160px]">
            <span className="sr-only">Peran</span>
            <Select className="h-[42px]" value={filters.role ?? ''} onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined, page: 1 })}>
              <option value="">Semua peran</option>
              <option value="pegawai">Pegawai</option>
              <option value="pimpinan">Pimpinan</option>
              <option value="admin">Administrator</option>
            </Select>
          </label>
          <label className="flex-[0_1_160px]">
            <span className="sr-only">Status akun</span>
            <Select className="h-[42px]" value={filters.status ?? ''} onChange={(e) => setFilters({ ...filters, status: (e.target.value || undefined) as EmployeeFilters['status'], page: 1 })}>
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </Select>
          </label>
        </div>

        {employees.isPending ? (
          <Spinner />
        ) : employees.isError ? (
          <ErrorState message={errorMessage(employees.error)} onRetry={() => employees.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Users />} title="Tidak ada pegawai" description="Ubah pencarian atau penyaring." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#faf9f7] text-left">
                  {['Pegawai', 'NIP', 'Pangkat/Gol.', 'Jabatan & Unit', 'Peran', 'Status'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-3 text-xs font-bold tracking-wider text-muted uppercase first:pl-5">{h}</th>
                  ))}
                  <th scope="col" className="py-3 pr-5 pl-3 text-right text-xs font-bold tracking-wider text-muted uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const u = e.user
                  const self = u?.id === me.id
                  return (
                    <tr key={e.id} className="border-t border-[#f1eeea]">
                      <td className="py-3 pr-3 pl-5">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-maroon-50 text-xs font-extrabold text-maroon-700">{initials(e.full_name)}</span>
                          <div className="flex flex-col">
                            <strong className="font-semibold whitespace-nowrap">{e.full_name}</strong>
                            <span className="text-xs text-muted">{u ? `@${u.username}` : 'Tanpa akun'}{u?.email ? ` · ${u.email}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12.5px] whitespace-nowrap">{e.nip_formatted}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{e.rank ? `${e.rank.name} (${e.rank.code})` : '—'}</td>
                      <td className="px-3 py-3"><div className="flex flex-col"><span className="font-semibold">{e.position}</span><span className="text-xs text-muted">{e.unit?.name}</span></div></td>
                      <td className="px-3 py-3">{u && <Badge tone={u.role === 'admin' ? 'gold' : u.role === 'pimpinan' ? 'maroon' : 'neutral'}>{u.role_label}</Badge>}</td>
                      <td className="px-3 py-3">{u && (u.is_active ? <Badge tone="success" dot>Aktif</Badge> : <Badge dot>Nonaktif</Badge>)}</td>
                      <td className="py-2.5 pr-5 pl-3">
                        <div className="flex justify-end gap-1.5">
                          <Button variant="icon" size="icon" aria-label={`Ubah data ${e.full_name}`} onClick={() => { setEditing(e); setFormOpen(true) }}><Pencil aria-hidden="true" /></Button>
                          {u && <Button variant="icon" size="icon" aria-label={`Atur ulang kata sandi ${e.full_name}`} onClick={() => setPending({ kind: 'reset', employee: e })}><KeyRound aria-hidden="true" /></Button>}
                          {u && !self && (
                            <Button variant="icon" size="icon" aria-label={`${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun ${e.full_name}`} onClick={() => setPending({ kind: 'status', employee: e })}>
                              <Power className={u.is_active ? '' : 'text-success'} aria-hidden="true" />
                            </Button>
                          )}
                          {e.reports_count === 0 && !self && (
                            <Button variant="icon-danger" size="icon" aria-label={`Hapus ${e.full_name}`} onClick={() => setPending({ kind: 'delete', employee: e })}><Trash2 aria-hidden="true" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {employees.data && rows.length > 0 && <Pagination meta={employees.data.meta} noun="pegawai" onPage={(page) => setFilters({ ...filters, page })} />}
      </Card>

      <EmployeeFormDialog
        open={formOpen}
        employee={editing}
        onClose={() => setFormOpen(false)}
        onCreated={(r) => r.password && setCredentials({ name: r.name, username: r.username, password: r.password })}
      />

      {pending && confirmText && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={confirmText.title}
          description={confirmText.body}
          confirmLabel={confirmText.label}
          tone={confirmText.tone}
          loading={action.isPending}
          onConfirm={() => action.mutate(pending)}
        />
      )}

      <CredentialsDialog value={credentials} onClose={() => setCredentials(null)} />
    </>
  )
}

/** Kata sandi sementara ditampilkan sekali; tidak dapat dilihat lagi setelah ditutup. */
function CredentialsDialog({ value, onClose }: { value: { name: string; username: string; password: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => setCopied(false), [value])

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()} title="Kata sandi sementara" description={value?.name} footer={<Button onClick={onClose}>Selesai</Button>}>
      {value && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Nama pengguna</dt>
            <dd className="m-0 font-mono font-semibold">{value.username}</dd>
            <dt className="text-muted">Kata sandi</dt>
            <dd className="m-0 flex items-center gap-2">
              <code className="rounded-lg bg-canvas px-2.5 py-1 font-mono text-base font-semibold tracking-wider">{value.password}</code>
              <Button
                variant="icon"
                size="icon"
                aria-label="Salin kata sandi"
                onClick={async () => {
                  await navigator.clipboard.writeText(value.password)
                  setCopied(true)
                }}
              >
                {copied ? <Check className="text-success" aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </Button>
            </dd>
          </dl>
          <Notice tone="warning">Catat dan serahkan langsung kepada pegawai. Kata sandi ini hanya ditampilkan sekali; pegawai wajib menggantinya saat pertama masuk.</Notice>
        </div>
      )}
    </Dialog>
  )
}
