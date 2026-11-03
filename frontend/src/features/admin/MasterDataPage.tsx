import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Badge, Card, CardHeader } from '@/components/ui/card'
import { ConfirmDialog, Dialog } from '@/components/ui/dialog'
import { ErrorState, Notice, Spinner } from '@/components/ui/feedback'
import { Field, fieldAria, Input } from '@/components/ui/form'
import { api, errorMessage, fieldErrors } from '@/lib/api'
import { keys, useActionPlans, useRanks, useUnits } from '@/lib/queries'
import type { ActionPlan, Rank, Unit } from '@/lib/types'

type Kind = 'plan' | 'unit' | 'rank'
type Item = ActionPlan | Unit | Rank

/** Endpoint, kunci cache, dan label untuk tiap jenis data induk. */
const KINDS: Record<Kind, { path: string; key: readonly string[]; label: string }> = {
  plan: { path: '/action-plans', key: keys.actionPlans, label: 'Rencana Aksi' },
  unit: { path: '/units', key: keys.units, label: 'Unit Kerja' },
  rank: { path: '/ranks', key: keys.ranks, label: 'Pangkat/Golongan' },
}

type Target = { kind: Kind; item: Item | null } | null

function itemLabel(kind: Kind, item: Item) {
  return kind === 'rank' ? `${item.name} (${(item as Rank).code})` : item.name
}

export function MasterDataPage() {
  const plans = useActionPlans()
  const units = useUnits()
  const ranks = useRanks()
  const [editing, setEditing] = useState<Target>(null)
  const [deleting, setDeleting] = useState<{ kind: Kind; item: Item } | null>(null)
  const queryClient = useQueryClient()

  const remove = useMutation({
    mutationFn: async (d: { kind: Kind; item: Item }) => (await api.delete<{ message: string }>(`${KINDS[d.kind].path}/${d.item.id}`)).data,
    onSuccess: (res, d) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: KINDS[d.kind].key })
      setDeleting(null)
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      setDeleting(null)
    },
  })

  const addButton = (kind: Kind) => (
    <Button size="sm" className="h-10" onClick={() => setEditing({ kind, item: null })}><Plus aria-hidden="true" />Tambah</Button>
  )
  const editButton = (kind: Kind, item: Item) => (
    <Button variant="icon" size="icon" aria-label={`Ubah ${itemLabel(kind, item)}`} onClick={() => setEditing({ kind, item })}><Pencil aria-hidden="true" /></Button>
  )
  const deleteButton = (kind: Kind, item: Item) => (
    <Button variant="icon-danger" size="icon" aria-label={`Hapus ${itemLabel(kind, item)}`} onClick={() => setDeleting({ kind, item })}><Trash2 aria-hidden="true" /></Button>
  )

  return (
    <>
      <PageHeader title="Data Induk" description="Rencana Aksi, unit kerja, dan pangkat yang dipakai pada formulir laporan dan profil pegawai. Data yang sudah dipakai tidak dapat dihapus, hanya dinonaktifkan." />

      <Card className="overflow-hidden">
        <CardHeader bordered title="Rencana Aksi" description="Pilihan pada formulir Isi Laporan. Pegawai tetap bisa memilih “Lainnya” dan mengisi sendiri." action={addButton('plan')} />
        {plans.isPending ? <Spinner /> : plans.isError ? <ErrorState message={errorMessage(plans.error)} onRetry={() => plans.refetch()} /> : (
          <ol>
            {plans.data.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-t border-[#f1eeea] px-5 py-3 first:border-0 sm:px-6">
                <span className="w-6 text-right text-[13px] text-muted tabular-nums">{i + 1}.</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <strong className="text-sm font-semibold">{p.name}</strong>
                  <span className="text-xs text-muted">Dipakai di {p.reports_count ?? 0} laporan</span>
                </div>
                {!p.is_active && <Badge>Nonaktif</Badge>}
                {editButton('plan', p)}
                {(p.reports_count ?? 0) === 0 && deleteButton('plan', p)}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[3_1_480px] overflow-hidden">
          <CardHeader bordered title="Unit Kerja" description={units.data ? `${units.data.length} unit` : undefined} action={addButton('unit')} />
          {units.isPending ? <Spinner /> : units.isError ? <ErrorState message={errorMessage(units.error)} onRetry={() => units.refetch()} /> : (
            <ul>
              {units.data.map((u) => (
                <li key={u.id} className="flex items-center gap-3 border-t border-[#f1eeea] px-5 py-3 first:border-0 sm:px-6">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-sm font-semibold">{u.name}</strong>
                    <span className="text-xs text-muted">{u.code ? `Kode ${u.code} · ` : ''}{u.employees_count ?? 0} pegawai</span>
                  </div>
                  {!u.is_active && <Badge>Nonaktif</Badge>}
                  {editButton('unit', u)}
                  {(u.employees_count ?? 0) === 0 && deleteButton('unit', u)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 flex-[2_1_340px] overflow-hidden">
          <CardHeader bordered title="Pangkat/Golongan" description={ranks.data ? `${ranks.data.length} pangkat` : undefined} action={addButton('rank')} />
          {ranks.isPending ? <Spinner /> : ranks.isError ? <ErrorState message={errorMessage(ranks.error)} onRetry={() => ranks.refetch()} /> : (
            <ul className="max-h-[620px] overflow-y-auto">
              {ranks.data.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-t border-[#f1eeea] px-5 py-2.5 first:border-0 sm:px-6">
                  <span className="w-12 font-mono text-[13px] font-semibold text-maroon-700">{r.code}</span>
                  <span className="flex-1 text-sm">{r.name}</span>
                  {editButton('rank', r)}
                  {deleteButton('rank', r)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <MasterForm target={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? `Hapus ${KINDS[deleting.kind].label.toLowerCase()}?` : ''}
        description={deleting ? <><strong className="text-ink">{itemLabel(deleting.kind, deleting.item)}</strong> akan dihapus. Data yang masih dipakai akan ditolak sistem.</> : ''}
        confirmLabel="Ya, Hapus"
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

function MasterForm({ target, onClose }: { target: Target; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const kind = target?.kind ?? 'plan'

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const id = target?.item?.id
      const path = KINDS[kind].path
      return (id ? await api.put<{ message: string }>(`${path}/${id}`, body) : await api.post<{ message: string }>(path, body)).data
    },
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: KINDS[kind].key })
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
    const text = (name: string) => String(f.get(name) ?? '').trim()
    save.mutate(
      kind === 'rank'
        ? { code: text('code'), name: text('name'), sort_order: Number(f.get('sort_order') || 0) }
        : kind === 'unit'
          ? { name: text('name'), code: text('code') || null, is_active: f.get('is_active') === 'on' }
          : { name: text('name'), is_active: f.get('is_active') === 'on', ...(f.get('sort_order') ? { sort_order: Number(f.get('sort_order')) } : {}) },
    )
  }

  const item = target?.item ?? null
  const unit = kind === 'unit' ? (item as Unit | null) : null
  const rank = kind === 'rank' ? (item as Rank | null) : null
  const plan = kind === 'plan' ? (item as ActionPlan | null) : null

  return (
    <Dialog
      open={!!target}
      onOpenChange={(o) => { if (!o) { setErrors({}); onClose() } }}
      title={`${item ? 'Ubah' : 'Tambah'} ${KINDS[kind].label}`}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" form="master-form" loading={save.isPending}>Simpan</Button></>}
    >
      <form id="master-form" key={`${kind}-${item?.id ?? 'new'}`} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {kind === 'plan' && (
          <>
            <Field label="Nama Rencana Aksi" htmlFor="m-name" required error={errors.name}>
              <Input name="name" defaultValue={plan?.name} placeholder="Contoh: Penyusunan surat dinas" {...fieldAria('m-name', errors.name)} required maxLength={200} />
            </Field>
            {plan && (
              <Field label="Urutan" htmlFor="m-order" error={errors.sort_order} hint="Angka kecil tampil lebih atas di formulir.">
                <Input name="sort_order" type="number" min={0} max={999} defaultValue={plan.sort_order} {...fieldAria('m-order', errors.sort_order, true)} />
              </Field>
            )}
            <label className="inline-flex min-h-11 items-center gap-2.5 text-sm">
              <input type="checkbox" name="is_active" defaultChecked={plan?.is_active ?? true} className="size-[18px] accent-maroon-700" />
              Aktif (tampil sebagai pilihan di formulir laporan)
            </label>
            {plan && (plan.reports_count ?? 0) > 0 && (
              <Notice>Mengganti nama tidak mengubah laporan lama; laporan yang sudah ada tetap memakai nama saat dibuat.</Notice>
            )}
          </>
        )}
        {kind === 'unit' && (
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
        )}
        {kind === 'rank' && (
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
