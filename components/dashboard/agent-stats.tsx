'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AgentStatsProps {
  data: { agent: string; count: number }[]
}

export function AgentStats({ data }: AgentStatsProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="agent" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} name="Conversas" />
      </BarChart>
    </ResponsiveContainer>
  )
}
