'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp, Receipt, CreditCard } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/types/billing'

type FilterStatus = 'all' | InvoiceStatus

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  rejected: 'Rejeitado',
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
}

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Aprovadas', value: 'approved' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Rejeitadas', value: 'rejected' },
]

export function PaymentHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const limit = 10

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filter !== 'all') params.set('status', filter)

      const res = await fetch(`/api/billing/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices)
        setTotal(data.total)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleFilterChange = (newFilter: FilterStatus) => {
    setFilter(newFilter)
    setPage(1)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatAmount = (amount: number) => {
    return `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const totalPages = Math.ceil(total / limit)

  // Task 7.5: Empty state
  if (!loading && invoices.length === 0 && page === 1) {
    return (
      <div className="rounded-2xl border bg-white p-8">
        {/* Task 7.3: Status filter tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-lg w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === tab.value
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-white p-6 space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Pagamentos</h3>

      {/* Task 7.3: Status filter tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === tab.value
                ? 'bg-white shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Task 7.2: Invoices table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Data</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Período</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Cartão</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map(invoice => (
                  <>
                    <tr
                      key={invoice.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
                    >
                      <td className="py-3">{formatDate(invoice.created_at)}</td>
                      <td className="py-3 font-medium">{formatAmount(invoice.amount)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
                          {STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td className="py-3 hidden sm:table-cell text-muted-foreground">
                        {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                      </td>
                      <td className="py-3 hidden md:table-cell text-muted-foreground">
                        {invoice.card_last_four ? (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5" />
                            •••• {invoice.card_last_four}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3">
                        {expandedId === invoice.id
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </td>
                    </tr>
                    {/* Task 7.4: Expandable invoice detail */}
                    {expandedId === invoice.id && (
                      <tr key={`${invoice.id}-detail`}>
                        <td colSpan={6} className="py-3 px-4 bg-muted/30">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">ID Pagamento MP:</span>
                              <p className="font-mono text-xs mt-0.5">{invoice.mp_payment_id || '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pago em:</span>
                              <p className="mt-0.5">{invoice.paid_at ? formatDate(invoice.paid_at) : '—'}</p>
                            </div>
                            {invoice.failure_reason && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Motivo da falha:</span>
                                <p className="mt-0.5 text-red-600">{invoice.failure_reason}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({total} faturas)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
