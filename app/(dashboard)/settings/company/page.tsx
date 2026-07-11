'use client'

import { useState } from 'react'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Building2, Save } from 'lucide-react'

export default function CompanySettingsPage() {
  const { company, refetch } = useCompany()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: company?.name || '',
    email: company?.email || '',
    phone: company?.phone || '',
    document: company?.document || '',
  })

  const handleSave = async () => {
    if (!company) return
    setIsLoading(true)

    try {
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: company.id, ...formData }),
      })

      if (response.ok) {
        toast({ title: 'Dados atualizados com sucesso' })
        await refetch()
      } else {
        toast({ title: 'Erro ao salvar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <h1 className="text-lg font-semibold text-slate-800">Dados da Empresa</h1>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL do Webhook)</Label>
              <Input value={company?.slug || ''} disabled />
              <p className="text-xs text-slate-500">O slug não pode ser alterado</p>
            </div>
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
