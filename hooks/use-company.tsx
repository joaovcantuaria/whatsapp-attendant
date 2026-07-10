'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'
import { Company, CompanyMember, Plan } from '@/types'

interface CompanyContextValue {
  company: Company | null
  membership: CompanyMember | null
  plan: Plan | null
  isLoading: boolean
  refetch: () => Promise<void>
  trialDaysLeft: number | null
  isTrialExpired: boolean
  isPlanActive: boolean
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  membership: null,
  plan: null,
  isLoading: true,
  refetch: async () => {},
  trialDaysLeft: null,
  isTrialExpired: false,
  isPlanActive: false,
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [membership, setMembership] = useState<CompanyMember | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchCompany = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsLoading(false)
        return
      }

      // Buscar membership
      const { data: memberData } = await supabase
        .from('company_members')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (!memberData) {
        setIsLoading(false)
        return
      }

      setMembership(memberData)

      // Buscar empresa
      const { data: companyData } = await supabase
        .from('companies')
        .select('*, plan:plans(*)')
        .eq('id', memberData.company_id)
        .single()

      if (companyData) {
        setCompany(companyData)
        setPlan(companyData.plan || null)
      }
    } catch (error) {
      console.error('Error fetching company:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [])

  const trialDaysLeft = company?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const isTrialExpired = company?.plan_status === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 0

  const isPlanActive = company?.plan_status === 'active' ||
    (company?.plan_status === 'trial' && !isTrialExpired)

  return (
    <CompanyContext.Provider value={{
      company,
      membership,
      plan,
      isLoading,
      refetch: fetchCompany,
      trialDaysLeft,
      isTrialExpired,
      isPlanActive,
    }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  return useContext(CompanyContext)
}
