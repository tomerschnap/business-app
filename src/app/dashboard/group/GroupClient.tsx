'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Users2, CalendarDays, Clock, UserCheck, UserX, History } from 'lucide-react'
import { cn } from '@/lib/utils'

type GroupSession = {
  id: string
  title: string
  date: string
  time: string
  max_participants: number
  enrolled: number
  notes: string
  created_at: string
}

type Customer = { id: string; name: string } // reserved for future enrollment feature

const emptyForm = {
  title: '',
  date: '',
  time: '09:00',
  max_participants: 10,
  enrolled: 0,
  notes: '',
}

function Spotsbadge({ max, enrolled }: { max: number; enrolled: number }) {
  const free = max - enrolled
  if (free <= 0) return <Badge variant="destructive" className="text-xs font-normal gap-1"><UserX className="h-3 w-3" />מלא</Badge>
  if (free <= 2) return <Badge className="text-xs font-normal gap-1 bg-orange-500 hover:bg-orange-600"><UserCheck className="h-3 w-3" />{free} מקומות</Badge>
  return <Badge variant="outline" className="text-xs font-normal gap-1 text-green-600 border-green-200"><UserCheck className="h-3 w-3" />{free} מקומות פנויים</Badge>
}

function StatusBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

export default function GroupClient({ initialSessions }: {
  initialSessions: GroupSession[]
  customers?: Customer[]
}) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<GroupSession[]>(
    [...initialSessions].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  )
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GroupSession | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const upcoming = sessions.filter(s => s.date >= today)
  const past = sessions.filter(s => s.date < today).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const displayed = showHistory ? past : upcoming

  function set<K extends keyof typeof emptyForm>(k: K, v: typeof emptyForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(s: GroupSession) {
    setEditing(s)
    setForm({
      title: s.title,
      date: s.date,
      time: s.time,
      max_participants: s.max_participants,
      enrolled: s.enrolled,
      notes: s.notes || '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error('נא להזין כותרת לפגישה')
    if (!form.date) return toast.error('נא לבחור תאריך')
    if (!form.time) return toast.error('נא לבחור שעה')
    if (form.max_participants < 1) return toast.error('מספר משתתפים חייב להיות לפחות 1')
    if (form.enrolled > form.max_participants) return toast.error('מספר נרשמים לא יכול לעלות על המקסימום')

    setLoading(true)
    const payload = {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      max_participants: form.max_participants,
      enrolled: form.enrolled,
      notes: form.notes,
    }

    if (editing) {
      const { data, error } = await supabase.from('group_sessions').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setSessions(ss => ss.map(s => s.id === editing.id ? data : s).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('הפגישה עודכנה')
    } else {
      const { data, error } = await supabase.from('group_sessions').insert(payload).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setSessions(ss => [...ss, data].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('הפגישה הקבוצתית נוצרה')
    }
    setOpen(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('group_sessions').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setSessions(ss => ss.filter(s => s.id !== id)); toast.success('הפגישה נמחקה') }
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תורים קבוצתיים</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {showHistory ? `${past.length} פגישות בהיסטוריה` : `${upcoming.length} פגישות קרובות`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(h => !h)} className="gap-2">
            <History className="h-4 w-4" />
            היסטוריה
            {past.length > 0 && (
              <span className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">{past.length}</span>
            )}
          </Button>
          <Button onClick={openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> פגישה חדשה
          </Button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users2 className="h-12 w-12 mb-4 opacity-20" />
          {showHistory
            ? <p className="font-medium text-base">אין פגישות בהיסטוריה</p>
            : <><p className="font-medium text-base">אין פגישות קבוצתיות קרובות</p><p className="text-sm mt-1">צור את הפגישה הקבוצתית הראשונה</p></>
          }
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map(s => {
            const free = s.max_participants - s.enrolled
            const pct = s.max_participants > 0 ? (s.enrolled / s.max_participants) * 100 : 0
            return (
              <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base leading-tight">{s.title}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Date & time */}
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long' })}
                    </span>
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {s.time}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{s.enrolled} / {s.max_participants} נרשמו</span>
                      <Spotsbadge max={s.max_participants} enrolled={s.enrolled} />
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', free <= 0 ? 'bg-red-500' : free <= 2 ? 'bg-orange-400' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status & notes */}
                  <div className="flex items-center justify-between">
                    <StatusBadge date={s.date} />
                    {s.notes && <p className="text-xs text-slate-400 truncate max-w-[60%]">{s.notes}</p>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" />
              {editing ? 'עריכת פגישה קבוצתית' : 'פגישה קבוצתית חדשה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>כותרת *</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="לדוגמה: יוגה בוקר" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>תאריך *</Label>
                <Input type="date" dir="ltr" className="text-left" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>שעה *</Label>
                <Input type="time" dir="ltr" className="text-left" value={form.time} onChange={e => set('time', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>מקסימום משתתפים *</Label>
                <Input type="number" min={1} dir="ltr" className="text-left"
                  value={form.max_participants}
                  onChange={e => set('max_participants', Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="space-y-2">
                <Label>נרשמו</Label>
                <Input type="number" min={0} dir="ltr" className="text-left"
                  value={form.enrolled}
                  onChange={e => set('enrolled', Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>הערות</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערות אופציונליות..." />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'צור פגישה'}
            </Button>
            <DialogClose>
              <Button variant="outline" type="button" className="flex-1 sm:flex-none">ביטול</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>מחיקת פגישה קבוצתית</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">האם אתה בטוח? פעולה זו אינה ניתנת לביטול.</p>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 sm:flex-none">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 sm:flex-none">ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
