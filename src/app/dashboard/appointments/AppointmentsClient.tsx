'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logActivity } from '@/lib/logActivity'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, CalendarDays, Clock, User, UserPlus, Calendar, AlignLeft, Timer, Loader2, History, Phone, Banknote, Download, Scissors } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

type Appointment = {
  id: string; customer_name: string; date: string; time: string; duration: string
  notes: string; phone: string; status: string; price: number; created_at: string
}
type Customer = { id: string; name: string; phone?: string }
type Service = { id: string; name: string; price: number; duration: string }
type DayHours = { enabled: boolean; open: string; close: string }
type WorkingHours = Record<string, DayHours>

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DURATIONS = ['15 דקות', '30 דקות', '45 דקות', 'שעה']
const STATUSES = ['ממתין', 'אושר', 'בוטל', 'הגיע', 'לא הגיע']
const ITEM_H = 44

const STATUS_STYLE: Record<string, string> = {
  'ממתין':    'bg-amber-100 text-amber-700 border-amber-200',
  'אושר':     'bg-blue-100 text-blue-700 border-blue-200',
  'בוטל':     'bg-red-100 text-red-600 border-red-200',
  'הגיע':     'bg-green-100 text-green-700 border-green-200',
  'לא הגיע':  'bg-slate-100 text-slate-500 border-slate-200',
}

const ALL_TIME_SLOTS: string[] = (() => {
  const s: string[] = []
  for (let h = 7; h <= 22; h++)
    for (const m of [0, 15, 30, 45]) {
      if (h === 22 && m > 0) break
      s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  return s
})()

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number); return h * 60 + m
}
function durationToMinutes(d: string) {
  if (d === 'שעה') return 60
  const m = d.match(/(\d+)/); return m ? parseInt(m[1]) : 30
}
function getSlotsForDate(date: string, wh: WorkingHours | null): string[] {
  if (!wh || !date) return ALL_TIME_SLOTS
  const day = DAY_KEYS[new Date(date + 'T12:00:00').getDay()]
  const cfg = wh[day]
  if (!cfg?.enabled) return []
  return ALL_TIME_SLOTS.filter(t => t >= cfg.open && t < cfg.close)
}

const emptyForm = { customer_name: '', date: '', time: '09:00', duration: '30 דקות', notes: '', phone: '', status: 'ממתין', price: '' }

// ── Wheel Picker ──────────────────────────────────────────────────────────────
function WheelPicker({ slots, value, onChange }: { slots: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const VISIBLE = 5, PAD = Math.floor(VISIBLE / 2) * ITEM_H

  const scrollTo = useCallback((idx: number, smooth = false) => {
    ref.current?.scrollTo({ top: Math.max(0, idx) * ITEM_H, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  useEffect(() => {
    const idx = slots.indexOf(value)
    scrollTo(idx >= 0 ? idx : 0, false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots])

  function handleScroll() {
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => {
      if (!ref.current) return
      const idx = Math.max(0, Math.min(slots.length - 1, Math.round(ref.current.scrollTop / ITEM_H)))
      scrollTo(idx, true)
      if (slots[idx]) onChange(slots[idx])
    }, 80)
  }

  if (slots.length === 0)
    return <div className="flex items-center justify-center py-10 text-slate-400 text-sm">אין שעות פנויות ביום זה</div>

  return (
    <div className="relative w-full select-none" style={{ height: VISIBLE * ITEM_H }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10" style={{ height: PAD, background: 'linear-gradient(to bottom, white 30%, transparent)' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10" style={{ height: PAD, background: 'linear-gradient(to top, white 30%, transparent)' }} />
      <div className="pointer-events-none absolute inset-x-0 z-0 rounded-xl border border-primary/20" style={{ top: PAD, height: ITEM_H, background: 'hsl(var(--primary) / 0.06)' }} />
      <div ref={ref} onScroll={handleScroll} className="absolute inset-0 overflow-y-scroll" style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <div style={{ height: PAD }} />
        {slots.map(slot => (
          <div key={slot} style={{ scrollSnapAlign: 'center', height: ITEM_H }}
            className={cn('flex items-center justify-center text-base transition-all duration-150 cursor-pointer', slot === value ? 'font-bold text-primary text-lg' : 'text-slate-500')}
            onClick={() => { scrollTo(slots.indexOf(slot), true); onChange(slot) }}>
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

// Inline status select — styled as a colored badge
function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const style = STATUS_STYLE[value] ?? STATUS_STYLE['ממתין']
  return (
    <Select value={value} onValueChange={v => onChange(v ?? value)}>
      <SelectTrigger className={cn('h-6 text-xs px-2 rounded-full border w-[90px] gap-1 focus:ring-0 shadow-none font-medium', style)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map(s => (
          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppointmentsClient({ initialAppointments, customers: initialCustomers, workingHours, services, blockedDates, businessId }: {
  initialAppointments: Appointment[]
  customers: Customer[]
  workingHours: WorkingHours | null
  services: Service[]
  blockedDates: string[]
  businessId: string | null
}) {
  const supabase = createClient()
  const [appointments, setAppointments] = useState<Appointment[]>(
    [...initialAppointments].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  )
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // ── Available slots ──────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]

  const blockedByOverlap = new Set<string>()
  appointments
    .filter(a => a.date === form.date && a.id !== editing?.id && a.status !== 'בוטל')
    .forEach(a => {
      const start = timeToMinutes(a.time)
      const end = start + durationToMinutes(a.duration || '30 דקות')
      ALL_TIME_SLOTS.forEach(slot => {
        if (timeToMinutes(slot) >= start && timeToMinutes(slot) < end) blockedByOverlap.add(slot)
      })
    })

  const nowMinutes = form.date === todayStr ? new Date().getHours() * 60 + new Date().getMinutes() : -1

  const availableSlots = getSlotsForDate(form.date, workingHours).filter(slot => {
    if (blockedByOverlap.has(slot)) return false
    if (nowMinutes >= 0 && timeToMinutes(slot) <= nowMinutes) return false
    return true
  })

  const dayClosed = form.date ? getSlotsForDate(form.date, workingHours).length === 0 && workingHours !== null : false
  const dayBlocked = form.date ? blockedDates.includes(form.date) : false

  useEffect(() => {
    if (form.date && availableSlots.length > 0 && !availableSlots.includes(form.time))
      setForm(f => ({ ...f, time: availableSlots[0] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  function set<K extends keyof typeof emptyForm>(k: K, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function openAdd() {
    setEditing(null); setForm(emptyForm)
    setCustomerMode(customers.length > 0 ? 'select' : 'new')
    setOpen(true)
  }

  function openEdit(a: Appointment) {
    setEditing(a)
    setForm({
      customer_name: a.customer_name, date: a.date, time: a.time || '09:00',
      duration: a.duration || '30 דקות', notes: a.notes || '', phone: a.phone || '',
      status: a.status || 'ממתין', price: a.price ? String(a.price) : '',
    })
    setCustomerMode(customers.some(c => c.name === a.customer_name) ? 'select' : 'new')
    setOpen(true)
  }

  async function autoSaveCustomer(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (customers.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return
    const { data } = await supabase.from('customers').insert({ name: trimmed, business_id: businessId }).select('id, name').single()
    if (data) {
      setCustomers(cs => [...cs, data].sort((a, b) => a.name.localeCompare(b.name, 'he')))
      await logActivity('לקוח חדש', `שם: ${trimmed} (נוסף אוטומטית)`)
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const appt = appointments.find(a => a.id === id)
    const { data, error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id).eq('business_id', businessId).select().single()
    if (error) { toast.error(error.message); return }
    setAppointments(as => as.map(a => a.id === id ? data : a).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
    await logActivity('עדכון סטטוס', `${appt?.customer_name || ''} — ${appt?.date || ''} ${appt?.time || ''}: ${newStatus}`)
  }

  async function handleSave() {
    if (!form.customer_name.trim()) return toast.error('נא להזין שם לקוח')
    if (!form.date) return toast.error('נא לבחור תאריך')
    if (!form.time) return toast.error('נא לבחור שעה')
    if (dayBlocked) return toast.error('תאריך זה חסום — לא ניתן לקבוע תור')
    if (dayClosed) return toast.error('העסק סגור ביום זה')
    if (!availableSlots.includes(form.time) && availableSlots.length > 0)
      return toast.error('השעה הנבחרת אינה פנויה — בחר שעה אחרת')
    setLoading(true)
    if (customerMode === 'new') await autoSaveCustomer(form.customer_name)
    const payload = {
      customer_name: form.customer_name.trim(), date: form.date, time: form.time,
      duration: form.duration, notes: form.notes, phone: form.phone,
      status: form.status, price: parseFloat(form.price) || 0,
    }
    if (editing) {
      const { data, error } = await supabase.from('appointments').update(payload).eq('id', editing.id).eq('business_id', businessId).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setAppointments(as => as.map(a => a.id === editing.id ? data : a).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('התור עודכן')
      await logActivity('עדכון תור', `${payload.customer_name} — ${payload.date} ${payload.time}`)
    } else {
      const { data, error } = await supabase.from('appointments').insert({ ...payload, business_id: businessId }).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setAppointments(as => [...as, data].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('התור נקבע בהצלחה')
      await logActivity('תור חדש', `${payload.customer_name} — ${payload.date} ${payload.time}`)
    }
    setOpen(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const appt = appointments.find(a => a.id === id)
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('business_id', businessId)
    if (error) { toast.error(error.message); return }
    setAppointments(as => as.filter(a => a.id !== id))
    toast.success('התור נמחק')
    await logActivity('תור נמחק', `${appt?.customer_name || ''} — ${appt?.date || ''} ${appt?.time || ''}`)
    setDeleteId(null)
  }

  function exportToExcel() {
    const rows = appointments.map(a => ({
      לקוח: a.customer_name,
      תאריך: a.date,
      שעה: a.time,
      משך: a.duration,
      מחיר: a.price,
      סטטוס: a.status,
      טלפון: a.phone,
      הערות: a.notes,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'תורים')
    XLSX.writeFile(wb, 'appointments.xlsx')
  }

  // ── Split upcoming / past ────────────────────────────────────────────────────
  const today2 = new Date().toISOString().split('T')[0]
  const upcoming = appointments.filter(a => a.date >= today2)
  const past = appointments.filter(a => a.date < today2).reverse()
  const displayed = showHistory ? past : upcoming

  function makeGroups(list: Appointment[]) {
    const groups: { date: string; label: string; items: Appointment[] }[] = []
    for (const a of list) {
      const last = groups[groups.length - 1]
      if (last && last.date === a.date) { last.items.push(a) } else {
        groups.push({ date: a.date, label: new Date(a.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }), items: [a] })
      }
    }
    return groups
  }
  const grouped = makeGroups(displayed)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">תורים</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {showHistory ? `${past.length} תורים בהיסטוריה` : `${upcoming.length} תורים קרובים`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" /> ייצא Excel
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(h => !h)} className="gap-2">
            <History className="h-4 w-4" />
            היסטוריה
            {past.length > 0 && <span className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">{past.length}</span>}
          </Button>
          <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> קבע תור</Button>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <CalendarDays className="h-12 w-12 mb-4 opacity-20" />
          {showHistory
            ? <p className="font-medium text-base">אין תורים בהיסטוריה</p>
            : <><p className="font-medium text-base">אין תורים קרובים</p><p className="text-sm mt-1">לחץ על &quot;קבע תור&quot; כדי להתחיל</p></>
          }
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

              {/* Desktop table */}
              <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
                      <TableHead className="font-semibold text-slate-700">שעה</TableHead>
                      <TableHead className="font-semibold text-slate-700">משך</TableHead>
                      <TableHead className="font-semibold text-slate-700">מחיר</TableHead>
                      <TableHead className="font-semibold text-slate-700">סטטוס</TableHead>
                      <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(a => (
                      <TableRow key={a.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <p className="font-semibold text-slate-800">{a.customer_name}</p>
                          {a.phone && <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{a.phone}</p>}
                        </TableCell>
                        <TableCell dir="ltr" className="text-right font-medium">{a.time}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-normal text-xs">{a.duration || '30 דקות'}</Badge></TableCell>
                        <TableCell className="text-slate-600 text-sm">{a.price ? `₪${a.price}` : '—'}</TableCell>
                        <TableCell>
                          <StatusSelect value={a.status || 'ממתין'} onChange={v => handleStatusChange(a.id, v)} />
                        </TableCell>
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

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {items.map(a => (
                  <Card key={a.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-slate-800">{a.customer_name}</p>
                            <StatusSelect value={a.status || 'ממתין'} onChange={v => handleStatusChange(a.id, v)} />
                          </div>
                          {a.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mb-1" dir="ltr"><Phone className="h-3 w-3 shrink-0" />{a.phone}</p>}
                          <p className="text-sm text-slate-600 flex items-center gap-1.5" dir="ltr">
                            <Clock className="h-3.5 w-3.5 shrink-0" />{a.time} · {a.duration || '30 דקות'}
                            {a.price ? <span className="mr-2 font-medium text-slate-700">₪{a.price}</span> : null}
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
              <div className="bg-primary/10 rounded-xl p-2.5"><Calendar className="h-5 w-5 text-primary" /></div>
              <DialogTitle className="text-lg font-bold">{editing ? 'עריכת תור' : 'קביעת תור חדש'}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Customer */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><User className="h-4 w-4 text-slate-400" /> לקוח</Label>
              {customers.length > 0 && (
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm w-fit">
                  <button onClick={() => { setCustomerMode('select'); set('customer_name', ''); setCustomerSearch(''); setCustomerDropdownOpen(false) }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors', customerMode === 'select' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>
                    <User className="h-3.5 w-3.5" /> לקוח קיים
                  </button>
                  <button onClick={() => { setCustomerMode('new'); set('customer_name', ''); setCustomerSearch(''); setCustomerDropdownOpen(false) }}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors', customerMode === 'new' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>
                    <UserPlus className="h-3.5 w-3.5" /> חדש
                  </button>
                </div>
              )}
              {customerMode === 'select' && customers.length > 0 ? (
                <div className="relative">
                  <Input
                    value={customerSearch || form.customer_name}
                    onChange={e => { setCustomerSearch(e.target.value); set('customer_name', ''); setCustomerDropdownOpen(true) }}
                    onFocus={() => setCustomerDropdownOpen(true)}
                    placeholder="חפש לקוח לפי שם..."
                    className="h-12 text-lg font-medium"
                  />
                  {customerDropdownOpen && filteredCustomers.length > 0 && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => {
                              set('customer_name', c.name)
                              if (c.phone) set('phone', c.phone)
                              setCustomerSearch('')
                              setCustomerDropdownOpen(false)
                            }}
                            className="w-full text-right px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between"
                          >
                            <span className="text-sm font-medium text-slate-800">{c.name}</span>
                            {c.phone && <span className="text-xs text-slate-400 dir-ltr">{c.phone}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerDropdownOpen && customerSearch && filteredCustomers.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-sm text-slate-400">לא נמצאו לקוחות</div>
                  )}
                </div>
              ) : (
                <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="הקלד שם לקוח..." className="h-12 text-lg font-medium" autoFocus={customerMode === 'new'} />
              )}
              {form.customer_name && (
                <p className="text-base font-semibold text-primary">{form.customer_name}</p>
              )}
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><Scissors className="h-4 w-4 text-slate-400" /> שירות</Label>
              {services.length > 0 && (
                <Select
                  value="__placeholder__"
                  onValueChange={v => {
                    if (v === '__custom__' || v === '__placeholder__') {
                      set('notes', '')
                      return
                    }
                    const svc = services.find(s => s.id === v)
                    if (svc) {
                      set('notes', svc.name)
                      set('duration', svc.duration)
                      set('price', String(svc.price || ''))
                    }
                  }}
                >
                  <SelectTrigger className="h-11 text-base">
                    <span className={form.notes && services.some(s => s.name === form.notes) ? 'text-slate-800' : 'text-slate-400'}>
                      {form.notes && services.some(s => s.name === form.notes) ? form.notes : 'בחר שירות מהרשימה'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" className="hidden">בחר שירות</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">שירות אחר (הקלדה ידנית)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={services.length > 0 ? "או הקלד שירות ידנית..." : "שם השירות"} className="h-11 text-base" />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><Banknote className="h-4 w-4 text-slate-400" /> מחיר (₪)</Label>
              <Input type="number" min="0" step="1" dir="ltr" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" className="h-11 text-base text-left" />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><Phone className="h-4 w-4 text-slate-400" /> טלפון</Label>
              <Input dir="ltr" type="tel" inputMode="numeric" value={form.phone} onChange={e => set('phone', e.target.value.replace(/[^0-9-]/g, ''))} placeholder="050-0000000" className="h-11 text-base text-left" />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><Calendar className="h-4 w-4 text-slate-400" /> תאריך</Label>
              <Input type="date" value={form.date} dir="ltr" className="h-11 text-base text-left" onChange={e => set('date', e.target.value)} />
            </div>

            {/* Time wheel */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                <Clock className="h-4 w-4 text-slate-400" /> שעה
                {form.date && availableSlots.length > 0 && (
                  <span className="text-xs font-normal text-slate-400 mr-1">({availableSlots[0]} – {availableSlots[availableSlots.length - 1]})</span>
                )}
              </Label>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <WheelPicker key={form.date} slots={availableSlots.length > 0 ? availableSlots : (form.date ? [] : ALL_TIME_SLOTS)} value={form.time} onChange={v => set('time', v)} />
              </div>
              {form.date && dayBlocked && <p className="text-xs text-red-500">תאריך זה חסום — לא ניתן לקבוע תור</p>}
              {form.date && !dayBlocked && dayClosed && <p className="text-xs text-red-500">העסק סגור ביום זה — לא ניתן לקבוע תור</p>}
              {form.date && !dayClosed && availableSlots.length === 0 && <p className="text-xs text-amber-600">כל השעות ביום זה תפוסות</p>}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><Timer className="h-4 w-4 text-slate-400" /> משך הפגישה</Label>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => set('duration', d)}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all', form.duration === d ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-primary/5')}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm">סטטוס</Label>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => set('status', s)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all', form.status === s ? STATUS_STYLE[s] + ' ring-2 ring-offset-1 ring-primary/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-700 font-semibold text-sm"><AlignLeft className="h-4 w-4 text-slate-400" /> הערות</Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="הערות אופציונליות..." className="h-11 text-base" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
            <Button onClick={handleSave} disabled={loading} className="flex-1 h-11 text-base font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שומר...</> : editing ? 'שמור שינויים' : 'קבע תור'}
            </Button>
            <DialogClose><Button variant="outline" type="button" className="h-11 px-5">ביטול</Button></DialogClose>
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
