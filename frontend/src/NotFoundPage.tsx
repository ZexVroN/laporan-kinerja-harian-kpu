import { FileText } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/feedback'

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<FileText />}
        title="Halaman tidak ditemukan"
        description="Alamat yang Anda buka tidak tersedia atau Anda tidak memiliki akses ke halaman tersebut."
        action={<Button asChild><Link to="/beranda">Kembali ke Beranda</Link></Button>}
      />
    </Card>
  )
}
