import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Check, Eye, EyeOff, Info, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/feedback'
import { fieldAria } from '@/components/ui/form'
import { errorMessage } from '@/lib/api'
import { useAppInfo } from '@/lib/queries'
import { useLogin } from './auth'

const schema = z.object({
  login: z.string().trim().min(1, 'Nama pengguna atau email wajib diisi.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
  remember: z.boolean(),
})

type Values = z.infer<typeof schema>

const FEATURES = [
  'Setiap kegiatan langsung tersimpan ke basis data',
  'Rekap triwulan siap unduh dalam PDF dan Excel',
  'Akses aman sesuai peran: Pegawai, Pimpinan, Administrator',
]

export function LoginPage() {
  const { data: info } = useAppInfo()
  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '', remember: false },
  })

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: () => navigate((location.state as { from?: string } | null)?.from ?? '/beranda', { replace: true }),
    }),
  )

  const serverError = login.isError ? errorMessage(login.error) : undefined
  const inputBase = 'h-12 w-full rounded-xl border bg-surface pl-11 text-[15px] font-medium focus:border-maroon-700 focus:shadow-[0_0_0_4px_rgb(201_162_75/0.28)] focus:outline-none'

  return (
    <div className="flex min-h-dvh flex-wrap bg-canvas">
      <section className="relative flex flex-[1_1_520px] flex-col justify-between gap-12 overflow-hidden bg-maroon-900 px-6 py-10 text-white sm:px-16 sm:py-14">
        <svg aria-hidden="true" viewBox="0 0 800 900" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" fill="none">
          <path d="M-40 900 C 200 820, 520 560, 840 120 L 840 900 Z" fill="#3D060C" opacity="0.55" />
          <path d="M-40 900 C 200 820, 520 560, 840 120" stroke="#C9A24B" strokeWidth="2.5" opacity="0.85" />
          <path d="M40 900 C 280 836, 580 610, 860 230" stroke="#C9A24B" strokeWidth="1.2" opacity="0.45" />
          <path d="M140 900 C 360 852, 640 660, 880 340" stroke="#C9A24B" strokeWidth="1" opacity="0.25" />
        </svg>

        <div className="relative flex items-center gap-3.5">
          <span className="inline-flex size-[52px] items-center justify-center rounded-[14px] border-[1.5px] border-gold-500 bg-white/8 text-gold-300" aria-hidden="true">
            <ShieldCheck className="size-[26px]" strokeWidth={1.8} />
          </span>
          <div className="flex flex-col">
            <strong className="text-xl tracking-wide">{info?.app_name ?? 'SILAKH'}</strong>
            <span className="text-[13px] text-white/72">{info?.instansi_nama ?? ' '}</span>
          </div>
        </div>

        <div className="relative flex max-w-[520px] flex-col gap-5">
          <span className="text-[13px] font-bold tracking-[0.14em] text-gold-300 uppercase">Laporan Kinerja Harian</span>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight sm:text-[44px]">Catat kinerja setiap hari, rekap triwulan dalam sekali klik.</h1>
          <p className="text-base leading-relaxed text-white/80">Sistem Informasi Laporan Kinerja Harian Pegawai sebagai cadangan dokumentasi LHK triwulanan.</p>
          <ul className="mt-2 flex flex-col gap-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[15px]">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-500/18 text-gold-300" aria-hidden="true">
                  <Check className="size-[15px]" strokeWidth={2.6} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <span className="relative text-[13px] text-white/60">© {new Date().getFullYear()} {info?.instansi_nama ?? ''}</span>
      </section>

      <section className="flex flex-[1_1_440px] items-center justify-center px-4 py-12">
        <form onSubmit={onSubmit} noValidate className="flex w-full max-w-[420px] flex-col gap-5.5">
          <div className="flex flex-col gap-2">
            <h2 className="text-[28px] font-extrabold tracking-tight">Masuk ke akun Anda</h2>
            <p className="text-[15px] text-muted">Gunakan nama pengguna atau email yang diberikan Administrator.</p>
          </div>

          {serverError && (
            <div role="alert" className="rounded-xl border border-[#f3d0d0] bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">{serverError}</div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login" className="text-sm font-semibold">Nama pengguna atau email</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-[15px] left-3.5 size-[18px] text-muted" aria-hidden="true" />
              <input {...register('login')} {...fieldAria('login', errors.login?.message)} autoComplete="username" autoFocus className={`${inputBase} border-line-strong pr-3.5`} />
            </div>
            {errors.login && <p id="login-error" role="alert" className="text-xs font-semibold text-danger">{errors.login.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold">Kata sandi</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute top-[15px] left-3.5 size-[18px] text-muted" aria-hidden="true" />
              <input
                {...register('password')}
                {...fieldAria('password', errors.password?.message)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`${inputBase} border-line-strong pr-13`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                aria-pressed={showPassword}
                className="absolute top-0.5 right-1 inline-flex size-11 cursor-pointer items-center justify-center text-[#57534e] hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p id="password-error" role="alert" className="text-xs font-semibold text-danger">{errors.password.message}</p>}
          </div>

          <label htmlFor="remember" className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <input id="remember" type="checkbox" {...register('remember')} className="size-[18px] accent-maroon-700" />
            Ingat saya di perangkat ini
          </label>

          <Button type="submit" loading={login.isPending} className="h-[50px] rounded-xl text-[15px] font-bold shadow-[0_6px_16px_rgb(139_21_32/0.28)]">
            Masuk
            {!login.isPending && <ArrowRight aria-hidden="true" />}
          </Button>

          <Notice icon={<Info />}>
            Tidak ada pendaftaran mandiri. Akun dibuat oleh Administrator. Lupa kata sandi? Hubungi Administrator untuk mengatur ulang.
          </Notice>
        </form>
      </section>
    </div>
  )
}
