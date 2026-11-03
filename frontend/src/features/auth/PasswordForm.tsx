import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, fieldAria, Input } from '@/components/ui/form'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import type { User } from '@/lib/types'
import { meKey } from './auth'

const schema = z
  .object({
    current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
    password: z
      .string()
      .min(8, 'Kata sandi baru minimal 8 karakter.')
      .regex(/[A-Za-z]/, 'Kata sandi baru harus mengandung huruf.')
      .regex(/\d/, 'Kata sandi baru harus mengandung angka.'),
    password_confirmation: z.string(),
  })
  .refine((v) => v.password === v.password_confirmation, { path: ['password_confirmation'], message: 'Konfirmasi kata sandi tidak cocok.' })
  .refine((v) => v.password !== v.current_password, { path: ['password'], message: 'Kata sandi baru harus berbeda dari yang lama.' })

type Values = z.infer<typeof schema>

export function PasswordForm({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const mutation = useMutation({
    mutationFn: (values: Values) => api.put('/auth/password', values),
    onSuccess: () => {
      toast.success('Kata sandi berhasil diganti.')
      reset()
      // Perbarui langsung agar penjaga rute tidak mengembalikan ke halaman ganti kata sandi.
      queryClient.setQueryData<User | null>(meKey, (u) => (u ? { ...u, must_change_password: false } : u))
      onDone?.()
    },
    onError: (error) => {
      const fields = fieldErrors(error)
      Object.entries(fields).forEach(([k, v]) => setError(k as keyof Values, { message: v }))
      if (!Object.keys(fields).length) toast.error(errorMessage(error))
    },
  })

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate className="flex flex-col gap-4">
      <Field label="Kata sandi saat ini" htmlFor="current_password" required error={errors.current_password?.message}>
        <Input type="password" autoComplete="current-password" {...register('current_password')} {...fieldAria('current_password', errors.current_password?.message)} />
      </Field>
      <Field label="Kata sandi baru" htmlFor="password" required error={errors.password?.message} hint="Minimal 8 karakter, berisi huruf dan angka.">
        <Input type="password" autoComplete="new-password" {...register('password')} {...fieldAria('password', errors.password?.message, true)} />
      </Field>
      <Field label="Ulangi kata sandi baru" htmlFor="password_confirmation" required error={errors.password_confirmation?.message}>
        <Input type="password" autoComplete="new-password" {...register('password_confirmation')} {...fieldAria('password_confirmation', errors.password_confirmation?.message)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={mutation.isPending}>Simpan Kata Sandi</Button>
      </div>
    </form>
  )
}
