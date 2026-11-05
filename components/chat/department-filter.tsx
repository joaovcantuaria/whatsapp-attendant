'use client'

import { useDepartments } from '@/hooks/use-departments'
import { useConversationStore } from '@/store/conversation-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Só aparece quando a empresa tem departamentos
export function DepartmentFilter() {
  const { departments } = useDepartments()
  const { departmentFilter, setDepartmentFilter } = useConversationStore()

  if (departments.length === 0) return null

  return (
    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
      <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-slate-50">
        <SelectValue placeholder="Todos os departamentos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">Todos os departamentos</SelectItem>
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id} className="text-xs">
            <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: d.color }} />
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
