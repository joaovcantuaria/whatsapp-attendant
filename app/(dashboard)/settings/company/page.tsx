'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Building2, Save, Plus, Loader2 } from 'lucide-react'
import { SettingsBack } from '@/components/shared/settings-back'

export default function CompanySettingsPage() {
  const { company, isLoading: companyLoading, refetch } = useCompany()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
  })

  // Sincronizar formData quando company carrega
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        document: company.document || '',
      })
    }
  }, [company])

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: 'Nome e email são obrigatórios', variant: 'destructive' })
      return
    }
    setIsLoading(true)

    try {
      if (company) {
        // Atualizar empresa existente
        const response = await fetch('/api/companies', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: company.id, ...formData }),
        })

        if (response.ok) {
          toast({ title: 'Dados atualizados com sucesso' })
          await refetch()
        } else {
          const data = await response.json()
          toast({ title: data.error || 'Erro ao salvar', variant: 'destructive' })
        }
      } else {
        // Criar nova empresa
        const response = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            document: formData.document || null,
          }),
        })

        if (response.ok) {
          toast({ title: 'Empresa criada com sucesso!' })
          await refetch()
        } else {
          const data = await response.json()
          toast({ title: data.error || 'Erro ao criar empresa', variant: 'destructive' })
        }
      }
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  if (companyLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        <SettingsBack />
        <h1 className="text-lg font-semibold text-slate-800">
          {company ? 'Dados da Empresa' : 'Cadastrar Empresa'}
        </h1>

        {!company && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Você ainda não tem uma empresa cadastrada. Preencha os dados abaixo para criar.
            </p>
          </div>
        )}

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
                placeholder="Nome da sua empresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="contato@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="5511999999999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              />
            </div>
            {company && (
              <div className="space-y-2">
                <Label>Slug (URL do Webhook)</Label>
                <Input value={company.slug || ''} disabled />
                <p className="text-xs text-slate-500">O slug não pode ser alterado</p>
              </div>
            )}
            <Button onClick={handleSave} disabled={isLoading} size="sm">
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : company ? (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isLoading ? 'Salvando...' : company ? 'Salvar' : 'Criar Empresa'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
