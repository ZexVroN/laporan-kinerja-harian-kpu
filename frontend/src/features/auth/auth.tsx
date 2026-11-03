import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api, onUnauthorized } from '@/lib/api'
import type { Role, User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  hasRole: (...roles: Role[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const meKey = ['auth', 'me'] as const

async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get<{ data: User }>('/auth/me')
    return data.data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return null
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({ queryKey: meKey, queryFn: fetchMe, staleTime: 5 * 60_000, retry: 1 })

  // Sesi berakhir atau akun dinonaktifkan saat aplikasi terbuka: jelaskan alasannya,
  // kosongkan cache, lalu router mengarahkan ke /masuk.
  useEffect(
    () =>
      onUnauthorized((message) => {
        if (queryClient.getQueryData(meKey)) toast.error(message, { id: 'sesi-berakhir' })
        switchSession(queryClient, null)
      }),
    [queryClient],
  )

  const user = data ?? null
  const value: AuthContextValue = {
    user,
    loading: isPending,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}

/** Pengguna yang pasti sudah masuk (dipakai di dalam rute terlindungi). */
export function useUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('Pengguna belum masuk')
  return user
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { login: string; password: string; remember: boolean }) => {
      const { data } = await api.post<{ data: User }>('/auth/login', input)
      return data.data
    },
    onSuccess: (user) => switchSession(queryClient, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => switchSession(queryClient, null),
  })
}

/**
 * Ganti pengguna aktif: buang semua data milik sesi sebelumnya, kecuali kueri sesi itu sendiri
 * (dipantau AuthProvider) — jangan memakai queryClient.clear(), yang juga memutus pemantau tersebut.
 */
function switchSession(queryClient: QueryClient, user: User | null) {
  queryClient.setQueryData(meKey, user)
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] })
}
