import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { ErrorState, Notice, Spinner } from '@/components/ui/feedback'
import { Field, fieldAria, Input } from '@/components/ui/form'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { keys, useSettings } from '@/lib/queries'
import type { Settings } from '@/lib/types'

const FIELDS: { key: keyof Settings; label: string; required?: boolean; hint?: string }[] = [
  { key: 'app_name', label: 'Nama aplikasi', required: true, hint: 'Tampil di sidebar dan halaman masuk.' },
  { key: 'instansi_nama', label: 'Nama instansi', required: true },
  { key: 'instansi_kop_1', label: 'Kop surat baris 1', required: true, hint: 'Contoh: KOMISI PEMILIHAN UMUM' },
  { key: 'instansi_kop_2', label: 'Kop surat baris 2', hint: 'Contoh: KABUPATEN MERAUKE' },
  { key: 'instansi_alamat', label: 'Alamat pada kop', hint: 'Alamat, telepon, dan email kantor.' },
  { key: 'kota_ttd', label: 'Kota penandatanganan', required: true, hint: 'Dipakai di blok tanda tangan PDF.' },
]

export function SettingsPage() {
  const settings = useSettings()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: async (body: Settings) => (await api.put<{ message: string; data: Settings }>('/settings', body)).data,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.setQueryData(keys.settings, res.data)
      queryClient.invalidateQueries({ queryKey: keys.appInfo })
    },
    onError: (e) => {
      setErrors(fieldErrors(e))
      if (!Object.keys(fieldErrors(e)).length) toast.error(errorMessage(e))
    },
  })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    const f = new FormData(e.currentTarget)
    save.mutate(Object.fromEntries(FIELDS.map(({ key }) => [key, String(f.get(key) ?? '').trim()])) as unknown as Settings)
  }

  return (
    <>
      <PageHeader title="Pengaturan" description="Identitas instansi untuk tampilan aplikasi dan kop dokumen laporan." />
      <Card className="max-w-3xl">
        <CardHeader title="Identitas Instansi" className="pb-1" />
        {settings.isPending ? (
          <Spinner />
        ) : settings.isError ? (
          <ErrorState message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 pt-4 pb-5 sm:px-6">
            {FIELDS.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={`s-${field.key}`} required={field.required} error={errors[field.key]} hint={field.hint}>
                <Input name={field.key} defaultValue={settings.data[field.key]} {...fieldAria(`s-${field.key}`, errors[field.key], !!field.hint)} />
              </Field>
            ))}
            <Notice>Logo pada kop PDF diambil dari berkas <code className="font-mono">public/images/logo-instansi.png</code> di server.</Notice>
            <div className="flex justify-end">
              <Button type="submit" loading={save.isPending}>{!save.isPending && <Save aria-hidden="true" />}Simpan Pengaturan</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  )
}
