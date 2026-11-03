import { KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Notice } from '@/components/ui/feedback'
import { useLogout, useUser } from './auth'
import { PasswordForm } from './PasswordForm'

/** Wajib dilalui pengguna yang masuk dengan kata sandi sementara dari Administrator. */
export function ChangePasswordPage() {
  const user = useUser()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="flex items-center gap-3.5 border-b-2 border-gold-500 bg-maroon-900 px-6 py-5 text-white">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-gold-500 text-maroon-950" aria-hidden="true">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold">Ganti kata sandi</h1>
            <p className="text-[13px] text-white/75">Halo, {user.name}</p>
          </div>
        </div>
        <div className="flex flex-col gap-5 p-6">
          <Notice>Anda masuk dengan kata sandi sementara. Buat kata sandi baru sebelum melanjutkan.</Notice>
          <PasswordForm onDone={() => navigate('/beranda', { replace: true })} />
          <Button variant="ghost" size="sm" className="self-center" onClick={() => logout.mutate()}>Keluar</Button>
        </div>
      </Card>
    </div>
  )
}
