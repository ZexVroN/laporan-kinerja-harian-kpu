import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/feedback'
import { Field, fieldAria, Input, Select } from '@/components/ui/form'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { useEmployeeOptions, useRanks, useUnits } from '@/lib/queries'
import type { Employee } from '@/lib/types'

const schema = z.object({
  full_name: z.string().trim().min(1, 'Nama lengkap wajib diisi.').max(150),
  nip: z
    .string()
    .transform((v) => v.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{18}$/, 'NIP harus terdiri dari 18 digit angka.')),
  rank_id: z.string(),
  position: z.string().trim().min(1, 'Jabatan wajib diisi.').max(150),
  unit_id: z.string().min(1, 'Unit kerja wajib dipilih.'),
  supervisor_id: z.string(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Nama pengguna minimal 3 karakter.')
    .regex(/^[a-z0-9][a-z0-9._-]*$/, 'Gunakan huruf kecil, angka, titik, tanda hubung, atau garis bawah.'),
  email: z.union([z.literal(''), z.email('Format email tidak valid.')]),
  role: z.enum(['pegawai', 'pimpinan', 'admin']),
  password: z.union([z.literal(''), z.string().min(8, 'Minimal 8 karakter.').regex(/[A-Za-z]/, 'Harus mengandung huruf.').regex(/\d/, 'Harus mengandung angka.')]),
})

type Input = z.input<typeof schema>
type Output = z.output<typeof schema>

interface Props {
  open: boolean
  employee: Employee | null
  onClose: () => void
  onCreated: (result: { name: string; username: string; password: string | null }) => void
}

const empty: Input = { full_name: '', nip: '', rank_id: '', position: '', unit_id: '', supervisor_id: '', username: '', email: '', role: 'pegawai', password: '' }

export function EmployeeFormDialog({ open, employee, onClose, onCreated }: Props) {
  const queryClient = useQueryClient()
  const units = useUnits()
  const ranks = useRanks()
  const options = useEmployeeOptions(open)
  const editing = !!employee

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Input, unknown, Output>({ resolver: zodResolver(schema), defaultValues: empty })

  useEffect(() => {
    if (!open) return
    reset(
      employee
        ? {
            full_name: employee.full_name,
            nip: employee.nip,
            rank_id: employee.rank?.id ? String(employee.rank.id) : '',
            position: employee.position,
            unit_id: employee.unit?.id ? String(employee.unit.id) : '',
            supervisor_id: employee.supervisor?.id ? String(employee.supervisor.id) : '',
            username: employee.user?.username ?? '',
            email: employee.user?.email ?? '',
            role: employee.user?.role ?? 'pegawai',
            password: '',
          }
        : empty,
    )
  }, [open, employee, reset])

  const mutation = useMutation({
    mutationFn: async (v: Output) => {
      const payload = {
        full_name: v.full_name,
        nip: v.nip,
        rank_id: v.rank_id ? Number(v.rank_id) : null,
        position: v.position,
        unit_id: Number(v.unit_id),
        supervisor_id: v.supervisor_id ? Number(v.supervisor_id) : null,
        username: v.username,
        email: v.email || null,
        role: v.role,
        ...(editing ? {} : { password: v.password || null }),
      }
      return editing
        ? (await api.put<{ message: string }>(`/employees/${employee!.id}`, payload)).data
        : (await api.post<{ message: string; temporary_password: string | null; data: Employee }>('/employees', payload)).data
    },
    onSuccess: (res, v) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(res.message)
      if (!editing) onCreated({ name: v.full_name, username: v.username, password: (res as { temporary_password?: string | null }).temporary_password ?? null })
      onClose()
    },
    onError: (error) => {
      const fields = fieldErrors(error)
      Object.entries(fields).forEach(([k, msg]) => setError(k as keyof Input, { message: msg }))
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    },
  })

  const submit = handleSubmit((v) => mutation.mutate(v))
  const supervisors = (options.data ?? []).filter((o) => o.id !== employee?.id)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      variant="side"
      title={editing ? 'Ubah Data Pegawai' : 'Tambah Pegawai'}
      description={editing ? employee?.full_name : 'Data pegawai sekaligus akun masuknya.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={submit} loading={mutation.isPending}>{editing ? 'Simpan Perubahan' : 'Simpan Pegawai'}</Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <h3 className="text-xs font-bold tracking-widest text-gold-700 uppercase">Data Pegawai</h3>
        <Field label="Nama Lengkap" htmlFor="e-name" required error={errors.full_name?.message}>
          <Input {...register('full_name')} {...fieldAria('e-name', errors.full_name?.message)} autoComplete="off" />
        </Field>
        <Field label="NIP" htmlFor="e-nip" required error={errors.nip?.message} hint="18 digit; spasi boleh diketik.">
          <Input inputMode="numeric" className="font-mono" {...register('nip')} {...fieldAria('e-nip', errors.nip?.message, true)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Pangkat/Golongan" htmlFor="e-rank" error={errors.rank_id?.message}>
            <Select {...register('rank_id')} {...fieldAria('e-rank', errors.rank_id?.message)}>
              <option value="">— Tidak ada —</option>
              {ranks.data?.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code})</option>)}
            </Select>
          </Field>
          <Field label="Peran" htmlFor="e-role" required error={errors.role?.message}>
            <Select {...register('role')} {...fieldAria('e-role', errors.role?.message)}>
              <option value="pegawai">Pegawai</option>
              <option value="pimpinan">Pimpinan</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>
        </div>
        <Field label="Jabatan" htmlFor="e-position" required error={errors.position?.message}>
          <Input {...register('position')} {...fieldAria('e-position', errors.position?.message)} />
        </Field>
        <Field label="Unit Kerja" htmlFor="e-unit" required error={errors.unit_id?.message}>
          <Select {...register('unit_id')} {...fieldAria('e-unit', errors.unit_id?.message)}>
            <option value="">Pilih unit kerja</option>
            {units.data?.filter((u) => u.is_active || String(u.id) === String(employee?.unit?.id)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Atasan Langsung" htmlFor="e-supervisor" error={errors.supervisor_id?.message} hint="Dipakai pada blok tanda tangan PDF.">
          <Select {...register('supervisor_id')} {...fieldAria('e-supervisor', errors.supervisor_id?.message, true)}>
            <option value="">— Belum ditentukan —</option>
            {supervisors.map((o) => <option key={o.id} value={o.id}>{o.full_name} — {o.position}</option>)}
          </Select>
        </Field>

        <h3 className="mt-2 text-xs font-bold tracking-widest text-gold-700 uppercase">Akun Masuk</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nama pengguna" htmlFor="e-username" required error={errors.username?.message}>
            <Input autoCapitalize="none" autoComplete="off" {...register('username')} {...fieldAria('e-username', errors.username?.message)} />
          </Field>
          <Field label="Email" htmlFor="e-email" optional error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...register('email')} {...fieldAria('e-email', errors.email?.message)} />
          </Field>
        </div>
        {!editing && (
          <Field label="Kata sandi awal" htmlFor="e-password" optional error={errors.password?.message} hint="Kosongkan agar sistem membuat kata sandi sementara yang acak.">
            <Input type="text" autoComplete="new-password" {...register('password')} {...fieldAria('e-password', errors.password?.message, true)} />
          </Field>
        )}
        <Notice>
          {editing
            ? 'Untuk mengganti kata sandi, gunakan tombol Atur Ulang Kata Sandi di daftar pegawai.'
            : 'Pegawai wajib mengganti kata sandi saat pertama kali masuk.'}
        </Notice>
        <button type="submit" hidden />
      </form>
    </Dialog>
  )
}
