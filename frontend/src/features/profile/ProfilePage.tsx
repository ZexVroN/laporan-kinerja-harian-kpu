import { PageHeader } from '@/components/layout/AppShell'
import { Badge, Card, CardHeader } from '@/components/ui/card'
import { Notice } from '@/components/ui/feedback'
import { useUser } from '@/features/auth/auth'
import { PasswordForm } from '@/features/auth/PasswordForm'
import { formatDateTime, initials } from '@/lib/format'

export function ProfilePage() {
  const user = useUser()
  const e = user.employee

  const rows: [string, string][] = [
    ['Nama pengguna', user.username],
    ['Email', user.email ?? '—'],
    ['Peran', user.role_label],
    ['Terakhir masuk', user.last_login_at ? formatDateTime(user.last_login_at) : '—'],
  ]
  const employeeRows: [string, string][] = e
    ? [
        ['Nama Lengkap', e.full_name],
        ['NIP', e.nip_formatted],
        ['Pangkat/Golongan', e.rank?.label ?? '—'],
        ['Jabatan', e.position],
        ['Unit Kerja', e.unit?.name ?? '—'],
        ['Atasan Langsung', e.supervisor ? `${e.supervisor.full_name} (${e.supervisor.position})` : '—'],
      ]
    : []

  const list = (items: [string, string][]) => (
    <dl className="grid grid-cols-1 gap-x-8 px-5 pb-5 sm:grid-cols-2 sm:px-6">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-[#f3f1ee] py-3">
          <dt className="text-xs font-semibold tracking-wider text-muted uppercase">{k}</dt>
          <dd className={`m-0 text-sm font-semibold ${k === 'NIP' ? 'font-mono' : ''}`}>{v}</dd>
        </div>
      ))}
    </dl>
  )

  return (
    <>
      <PageHeader title="Profil Saya" description="Data akun dan kepegawaian Anda." />

      <Card className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-maroon-900 text-xl font-extrabold text-gold-300">{initials(user.name)}</span>
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold">{user.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge tone={user.role === 'admin' ? 'gold' : user.role === 'pimpinan' ? 'maroon' : 'neutral'}>{user.role_label}</Badge>
            <Badge tone="success" dot>Aktif</Badge>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-5">
          {e && (
            <Card>
              <CardHeader title="Data Kepegawaian" className="pb-1" />
              {list(employeeRows)}
              <Notice className="mx-5 mb-5 sm:mx-6">Data ini dipakai otomatis di setiap laporan. Jika ada perubahan pangkat, jabatan, atau unit, hubungi Administrator.</Notice>
            </Card>
          )}
          <Card>
            <CardHeader title="Akun" className="pb-1" />
            {list(rows)}
          </Card>
        </div>

        <Card id="kata-sandi" className="min-w-0 flex-[2_1_320px] scroll-mt-24">
          <CardHeader title="Ganti Kata Sandi" description="Setelah diganti, sesi di perangkat lain akan diakhiri." />
          <div className="px-5 pt-4 pb-5 sm:px-6"><PasswordForm /></div>
        </Card>
      </div>
    </>
  )
}
