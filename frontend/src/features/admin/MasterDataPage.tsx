import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { ErrorState, Spinner } from '@/components/ui/feedback'
import { Field, fieldAria, Input } from '@/components/ui/form'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { keys, useRanks, useUnits } from '@/lib/queries'
import type { Rank, Unit } from '@/lib/types'

type Editing = { type: 'unit'; item: Unit | null } | { type: 'rank'; item: Rank | null } | null
type Deleting = { type: 'unit'; item: Unit } | { type: 'rank'; item: Rank } | null

export function MasterDataPage() {
  const units = useUnits()
  const ranks = useRanks()
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Deleting>(null)
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: async (d: NonNullable<Deleting>) => (await api.delete<{ message: string }>(`/${d.type === 'unit' ? 'units' : 'ranks'}/${d.item.id}`)).data,
    onSuccess: (res, d) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: d.type === 'unit' ? keys.units : keys.ranks })
      setDeleting(null)
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      setDeleting(null)
    },
  })

  return (
    <>
      <PageHeader title="Unit Kerja & Pangkat" description="Data induk yang dipakai pada profil pegawai dan laporan. Data yang sudah dipakai tidak dapat dihapus." />

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[3_1_480px] overflow-hidden">
          <CardHeader bordered title="Unit Kerja" description={units.data ? `${units.data.length} unit` : undefined} action={<Button size="sm" className="h-10" onClick={() => setEditing({ type: 'unit', item: null })}><Plus aria-hidden="true" />Tambah</Button>} />
          {units.isPending ? <Spinner /> : units.isError ? <ErrorState message={errorMessage(units.error)} onRetry={() => units.refetch()} /> : (
            <ul>
              {units.data.map((u) => (
                <li key={u.id} className="flex items-center gap-3 border-t border-[#f1eeea] px-5 py-3 first:border-0 sm:px-6">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-sm font-semibold">{u.name}</strong>
                    <span className="text-xs text-muted">{u.code ? `Kode ${u.code} · ` : ''}{u.employees_count ?? 0} pegawai</span>
                  </div>
                  {!u.is_active && <Badge>Nonaktif</Badge>}
                  <Button variant="icon" size="icon" aria-label={`Ubah ${u.name}`} onClick={() => setEditing({ type: 'unit', item: u })}><Pencil aria-hidden="true" /></Button>
                  {(u.employees_count ?? 0) === 0 && <Button variant="icon-danger" size="icon" aria-label={`Hapus ${u.name}`} onClick={() => setDeleting({ type: 'unit', item: u })}><Trash2 aria-hidden="true" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 flex-[2_1_340px] overflow-hidden">
          <CardHeader bordered title="Pangkat/Golongan" description={ranks.data ? `${ranks.data.length} pangkat` : undefined} action={<Button size="sm" className="h-10" onClick={() => setEditing({ type: 'rank', item: null })}><Plus aria-hidden="true" />Tambah</Button>} />
          {ranks.isPending ? <Spinner /> : ranks.isError ? <ErrorState message={errorMessage(ranks.error)} onRetry={() => ranks.refetch()} /> : (
            <ul className="max-h-[620px] overflow-y-auto">
              {ranks.data.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-t border-[#f1eeea] px-5 py-2.5 first:border-0 sm:px-6">
                  <span className="w-12 font-mono text-[13px] font-semibold text-maroon-700">{r.code}</span>
                  <span className="flex-1 text-sm">{r.name}</span>
                  <Button variant="icon" size="icon" aria-label={`Ubah ${r.code}`} onClick={() => setEditing({ type: 'rank', item: r })}><Pencil aria-hidden="true" /></Button>
                  <Button variant="icon-danger" size="icon" aria-label={`Hapus ${r.code}`} onClick={() => setDeleting({ type: 'rank', item: r })}><Trash2 aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <MasterForm editing={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting?.type === 'unit' ? 'Hapus unit kerja?' : 'Hapus pangkat/golongan?'}
        description={deleting ? <><strong className="text-ink">{deleting.type === 'unit' ? deleting.item.name : `${deleting.item.name} (${deleting.item.code})`}</strong> akan dihapus. Data yang masih dipakai akan ditolak sistem.</> : ''}
        confirmLabel="Ya, Hapus"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

function MasterForm({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isUnit = editing?.type === 'unit'

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const base = isUnit ? '/units' : '/ranks'
      const id = editing?.item?.id
      return (id ? await api.put<{ message: string }>(`${base}/${id}`, body) : await api.post<{ message: string }>(base, body)).data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: isUnit ? keys.units : keys.ranks })
      onClose()
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
    save.mutate(
      isUnit
        ? { name: String(f.get('name') ?? '').trim(), code: String(f.get('code') ?? '').trim() || null, is_active: f.get('is_active') === 'on' }
        : { code: String(f.get('code') ?? '').trim(), name: String(f.get('name') ?? '').trim(), sort_order: Number(f.get('sort_order') || 0) },
    )
  }

  const unit = isUnit ? (editing?.item as Unit | null) : null
  const rank = !isUnit ? (editing?.item as Rank | null) : null

  return (
    <Dialog
      open={!!editing}
      onOpenChange={(o) => { if (!o) { setErrors({}); onClose() } }}
      title={`${editing?.item ? 'Ubah' : 'Tambah'} ${isUnit ? 'Unit Kerja' : 'Pangkat/Golongan'}`}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="master-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form id="master-form" key={`${editing?.type}-${editing?.item?.id ?? 'new'}`} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {isUnit ? (
          <>
            <Field label="Nama unit" htmlFor="m-name" required error={errors.name}>
              <Input name="name" defaultValue={unit?.name} {...fieldAria('m-name', errors.name)} required maxLength={150} />
            </Field>
            <Field label="Kode" htmlFor="m-code" optional error={errors.code}>
              <Input name="code" defaultValue={unit?.code ?? ''} {...fieldAria('m-code', errors.code)} maxLength={30} />
            </Field>
            <label className="inline-flex min-h-11 items-center gap-2.5 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={unit?.is_active ?? true} className="size-[18px] accent-maroon-700" />
              Aktif (dapat dipilih untuk pegawai baru)
            </label>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Golongan" htmlFor="m-code" required error={errors.code}>
                <Input name="code" defaultValue={rank?.code} placeholder="III/b" {...fieldAria('m-code', errors.code)} required maxLength={10} />
              </Field>
              <Field label="Urutan" htmlFor="m-order" error={errors.sort_order}>
                <Input name="sort_order" type="number" min={0} max={999} defaultValue={rank?.sort_order ?? 0} {...fieldAria('m-order', errors.sort_order)} />
              </Field>
            </div>
            <Field label="Nama pangkat" htmlFor="m-name" required error={errors.name}>
              <Input name="name" defaultValue={rank?.name} placeholder="Penata Muda Tk. I" {...fieldAria('m-name', errors.name)} required maxLength={80} />
            </Field>
          </>
        )}
      </form>
    </Dialog>
  )
}
