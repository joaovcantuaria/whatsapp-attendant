'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, CheckCircle, Clock, AlertTriangle, Calendar, ListTodo } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  contact?: { id: string; name: string } | null
  deal?: { id: string; title: string } | null
  agent?: { id: string; name: string } | null
  created_at: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium' })
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const fetchTasks = useCallback(async () => {
    const params = filter !== 'all' ? `?status=${filter}` : ''
    const res = await fetch(`/api/crm/tasks${params}`)
    if (res.ok) setTasks(await res.json())
    setIsLoading(false)
  }, [filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleCreate = async () => {
    if (!newTask.title) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return }
    setIsCreating(true)
    const res = await fetch('/api/crm/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
    if (res.ok) { toast({ title: 'Tarefa criada!' }); setShowNewTask(false); setNewTask({ title: '', description: '', due_date: '', priority: 'medium' }); fetchTasks() }
    setIsCreating(false)
  }

  const handleComplete = async (id: string) => {
    await fetch('/api/crm/tasks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'completed' }),
    })
    toast({ title: 'Tarefa concluída!' })
    fetchTasks()
  }

  const priorityColor = (p: string) => {
    if (p === 'high') return 'destructive'
    if (p === 'medium') return 'warning'
    return 'secondary'
  }

  const priorityLabel = (p: string) => {
    if (p === 'high') return 'Alta'
    if (p === 'medium') return 'Média'
    return 'Baixa'
  }

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false
    return new Date(task.due_date) < new Date(new Date().toISOString().split('T')[0])
  }

  const todayTasks = tasks.filter(t => t.status !== 'completed' && t.due_date && t.due_date <= new Date().toISOString().split('T')[0])
  const overdueTasks = tasks.filter(t => isOverdue(t))

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTodo className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus follow-ups e compromissos</p>
          </div>
        </div>
        <Button onClick={() => setShowNewTask(true)}><Plus className="h-4 w-4 mr-1" /> Nova Tarefa</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <div><p className="text-lg font-bold">{todayTasks.length}</p><p className="text-[10px] text-muted-foreground">Para hoje</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div><p className="text-lg font-bold">{overdueTasks.length}</p><p className="text-[10px] text-muted-foreground">Atrasadas</p></div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div><p className="text-lg font-bold">{tasks.filter(t => t.status === 'completed').length}</p><p className="text-[10px] text-muted-foreground">Concluídas</p></div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Nenhuma tarefa encontrada</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <Card key={task.id} className={`${isOverdue(task) ? 'border-red-500/50 bg-red-500/5' : ''}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <Button
                  variant="ghost" size="icon" className="shrink-0"
                  onClick={() => task.status !== 'completed' && handleComplete(task.id)}
                  disabled={task.status === 'completed'}
                >
                  <CheckCircle className={`h-5 w-5 ${task.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'}`} />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {task.contact && <span className="text-xs text-muted-foreground">👤 {task.contact.name}</span>}
                    {task.due_date && <span className="text-xs text-muted-foreground">📅 {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={priorityColor(task.priority) as any} className="text-[10px]">{priorityLabel(task.priority)}</Badge>
                  {isOverdue(task) && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título</Label><Input placeholder="Ex: Ligar para cliente" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea placeholder="Detalhes..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Prioridade</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={isCreating}>{isCreating ? 'Criando...' : 'Criar Tarefa'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
