'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, CalendarDays, Clock, User, UserPlus, Calendar, AlignLeft, Timer, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Appointment = { id: string; customer_name: string; date: string; time: string; duration: string; notes: string; created_at: string }
type Customer = { id: string; name: string }
type DayHours = { enabled: boolean; open: string; close: string }
type WorkingHours = Record<string, DayHours>

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DURATIONS = ['15 דקות', '30 דקות', '45 דקות', 'שעה']
const ITEM_H = 44

// All 15-min slots 7:00-22:00
const ALL_TIME_SLOTS: string[] = (() => {
  const s: string[] = []
  for (let h = 7; h <= 22; h++)
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break
      s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  return s
})()

function getSlotsForDate(date: string, wh: WorkingHours | null): string[] {
  if (!wh || !date) return ALL_TIME_SLOTS
  const dow = new Date(date + 'T00:00:00').getDay() // 0=Sun
  const day = DAY_KEYS[dow]
  const config = wh[day]
  if (!config?.enabled) return [] // closed that day
  return ALL_TIME_SLOTS.filter(t => t >= config.open && t <= config.close)
}

const emptyForm = { customer_name: '', date: '', time: '09:00', duration: '30 דקות', notes: '' }

// ── Wheel Picker ──────────────────────────────────────────────────────────────
function WheelPicker({ slots, value, onChange }: { slots: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const VISIBLE = 5
  const PAD = Math.floor(VISIBLE / 2) * ITEM_H

  const scrollToIndex = useCallback((idx: number, smooth = false) => {
    ref.current?.scrollTo({ top: Math.max(0, idx) * ITEM_H, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    const idx = slots.indexOf(value)
    scrollToIndex(idx >= 0 ? idx : 0, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]) // re-scroll when slots list changes

  function handleScroll() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!ref.current) return
      const idx = Math.round(ref.current.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(slots.length - 1, idx))
      scrollToIndex(clamped, true)
      if (slots[clamped]) onChange(slots[clamped])
    }, 80)
  }

  if (slots.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
        העסק סגור ביום זה
      </div>
    )
  }

  return (
    <div className="relative w-full select-none" style={{ height: VISIBLE * ITEM_H }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: PAD, background: 'linear-gradient(to bottom, white 30%, transparent)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: PAD, background: 'linear-gradient(to top, white 30%, transparent)' }} />
      <div className="pointer-events-none absolute inset-x-0 z-0 rounded-xl border border-primary/20"
        style={{ top: PAD, height: ITEM_H, background: 'hsl(var(--primary) / 0.06)' }} />
      <div ref={ref} onScroll={handleScroll}
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <div style={{ height: PAD }} />
        {slots.map(slot => (
          <div key={slot}
            style={{ scrollSnapAlign: 'center', height: ITEM_H }}
            className={cn(
              'flex items-center justify-center text-base transition-all duration-150 cursor-pointer',
              slot === value ? 'font-bold text-primary text-lg' : 'text-slate-500'
            )}
            onClick={() => { scrollToIndex(slots.indexOf(slot), true); onChange(slot) }}
          >
            {slot}
          </div>
        ))}
        <div style={{ height: PAD }} />
      </div>
    </div>
  )
}

function StatusBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppointmentsClient({ initialAppointments, customers, workingHours }: {
  initialAppointments: Appointment[]
  customers: Customer[]
  workingHours: WorkingHours | null
}) {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<Appointment[]>(
    [...initialAppointments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  )
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select')
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Compute available slots: within working hours AND not already booked (excluding the appt being edited)
  const takenTimes = new Set(
    appointments
      .filter(a => a.date === form.date && a.id !== editing?.id)
      .map(a => a.time)
  )
  const availableSlots = getSlotsForDate(form.date, workingHours).filter(t => !takenTimes.has(t))

  // When date changes, snap time to first available slot if current is no longer available
  useEffect(() => {
    if (form.date && availableSlots.length > 0 && !availableSlots.includes(form.time)) {
      setForm(f => ({ ...f, time: availableSlots[0] }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  function set<K extends keyof typeof emptyForm>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openAdd() {
    setEditing(null); setForm(emptyForm)
    setCustomerMode(customers.length > 0 ? 'select' : 'new')
    setOpen(true)
  }

  function openEdit(a: Appointment) {
    setEditing(a)
    setForm({ customer_name: a.customer_name, date: a.date, time: a.time || '09:00', duration: a.duration || '30 דקות', notes: a.notes || '' })
    setCustomerMode(customers.some(c => c.name === a.customer_name) ? 'select' : 'new')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.customer_name.trim()) return toast.error('נא להזין שם לקוח')
    if (!form.date) return toast.error('נא לבחור תאריך')
    if (!form.time) return toast.error('נא לבחור שעה')
    if (availableSlots.length === 0 && workingHours) return toast.error('העסק סגור ביום זה')
    if (takenTimes.has(form.time)) return toast.error(`השעה ${form.time} כבר תפוסה — בחר שעה אחרת`)
    setLoading(true)
    const payload = {
      customer_name: form.customer_name.trim(),
      date: form.date,
      time: form.time,
      duration: form.duration,
      notes: form.notes,
    }
    if (editing) {
      const { data, error } = await supabase.from('appointments').update(payload).eq('id', editing.id).select().single()
      if (error) toast.error(error.message)
      else {
        setAppointments(as => as.map(a => a.id === editing.id ? data : a).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
        toast.success('התור עודכן'); setOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('appointments').insert(payload).select().single()
      if (error) toast.error(error.message)
      else {
        setAppointments(as => [...as, data].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
        toast.success('התור נקבע בהצלחה'); setOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setAppointments(as => as.filter(a => a.id !== id)); toast.success('התור נמחק') }
    setDeleteId(null)
  }

  const grouped: { date: string; label: string; items: Appointment[] }[] = []
  for (const a of appointments) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === a.date) {
      last.items.push(a)
    } else {
      const label = new Date(a.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
      grouped.push({ date: a.date, label, items: [a] })
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תורים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{appointments.length} תורים בסה״כ</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> קבע תור</Button>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium text-base">אין תורים עדיין</p>
          <p className="text-sm mt-1">לחץ על &quot;קבע תור&quot; כדי להתחיל</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ date, label, items }) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-slate-700 whitespace-nowrap">{label}</h2>
                <div className="flex-1 h-px bg-slate-200" />
                <StatusBadge date={date} />
              </div>
              <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
                      <TableHead className="font-semibold text-slate-700">שעה</TableHead>
                      <TableHead className="font-semibold text-slate-700">משך</TableHead>
                      <TableHead className="font-semibold text-slate-700">הערות</TableHead>
                      <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(a => (
                      <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-semibold text-slate-800">{a.customer_name}</TableCell>
                        <TableCell dir="ltr" className="text-right font-medium">{a.time}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal text-xs">{a.duration || '30 דקות'}</Badge></TableCell>
                        <TableCell className="text-slate-500 max-w-xs truncate">{a.notes || '—'}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex gap-1 justify-end">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5 text-slate-500" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {items.map(a => (
                  <Card key={a.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{a.customer_name}</p>
                          <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1" dir="ltr">
                            <Clock className="h-3.5 w-3.5 shrink-0" />{a.time} · {a.duration || '30 דקות'}
                          </p>
                          {a.notes && <p className="text-xs text-slate-400 mt-1.5">{a.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(a)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-xl p-2.5">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {editing ? 'עריכת תור' : 'קביעת תור חדש'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Customer */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <User className="h-4 w-4 text-slate-400" /> לקוח
              </Label>
              {customers.length > 0 && (
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm w-fit">
                  <button onClick={() => { setCustomerMode('select'); set('customer_name', '') }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors',
                      customerMode === 'select' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>
                    <User className="h-3.5 w-3.5" /> לקוח קיים
                  </button>
                  <button onClick={() => { setCustomerMode('new'); set('customer_name', '') }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors',
                      customerMode === 'new' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>
                    <UserPlus className="h-3.5 w-3.5" /> חדש
                  </button>
                </div>
              )}
              {customerMode === 'select' && customers.length > 0 ? (
                <Select value={form.customer_name} onValueChange={v => set('customer_name', v ?? '')}>
                  <SelectTrigger className="h-11 text-base"><SelectValue placeholder="בחר לקוח מהרשימה" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                  placeholder="הקלד שם לקוח..." className="h-11 text-base" autoFocus={customerMode === 'new'} />
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <Calendar className="h-4 w-4 text-slate-400" /> תאריך
              </Label>
              <Input type="date" value={form.date} dir="ltr" className="h-11 text-base text-left"
                onChange={e => set('date', e.target.value)} />
            </div>

            {/* Time wheel */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <Clock className="h-4 w-4 text-slate-400" /> שעה
                {form.date && workingHours && availableSlots.length > 0 && (
                  <span className="text-xs font-normal text-slate-400 mr-1">
                    ({getSlotsForDate(form.date, workingHours)[0]} – {getSlotsForDate(form.date, workingHours).at(-1)})
                  </span>
                )}
              </Label>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <WheelPicker
                  key={form.date} // remount when date changes so scroll resets
                  slots={availableSlots.length > 0 ? availableSlots : (form.date ? [] : ALL_TIME_SLOTS)}
                  value={form.time}
                  onChange={v => set('time', v)}
                />
              </div>
              {form.date && availableSlots.length === 0 && (
                <p className="text-xs text-red-500 flex items-center gap-1">העסק סגור ביום זה — לא ניתן לקבוע תור</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <Timer className="h-4 w-4 text-slate-400" /> משך הפגישה
              </Label>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => set('duration', d)}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                      form.duration === d
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5'
                    )}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <AlignLeft className="h-4 w-4 text-slate-400" /> הערות
              </Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="הערות אופציונליות..." className="h-11 text-base" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
            <Button onClick={handleSave} disabled={loading} className="flex-1 h-11 text-base font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שומר...</> : editing ? 'שמור שינויים' : 'קבע תור'}
            </Button>
            <DialogClose>
              <Button variant="outline" type="button" className="h-11 px-5">ביטול</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>מחיקת תור</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">האם אתה בטוח? פעולה זו אינה ניתנת לביטול.</p>
          <div className="flex gap-3 flex-row-reverse mt-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
