'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Users2, CalendarDays, Clock, UserCheck, UserX, History, AlignLeft, Loader2, X, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateOnlyHe, getDayKey, localTodayStr } from '@/lib/dates'

type GroupSession = {
  id: string; title: string; date: string; time: string
  max_participants: number; enrolled: number; notes: string
  price_per_participant: number; created_at: string
}
type Participant = { id: string; session_id: string; name: string; created_at: string }
type DayHours = { enabled: boolean; open: string; close: string }
type WorkingHours = Record<string, DayHours>

const ITEM_H = 44

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

function getSlotsForDate(date: string, wh: WorkingHours | null): string[] {
  if (!wh || !date) return ALL_TIME_SLOTS
  const cfg = wh[getDayKey(date)]
  if (!cfg?.enabled) return []
  return ALL_TIME_SLOTS.filter(t => t >= cfg.open && t < cfg.close)
}

// ── Wheel Picker ─────────────────────────────────────────────────────────────
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

function SpotsBadge({ max, enrolled }: { max: number; enrolled: number }) {
  const free = max - enrolled
  if (free <= 0) return <Badge variant="destructive" className="text-xs font-normal gap-1"><UserX className="h-3 w-3" />מלא</Badge>
  if (free <= 2) return <Badge className="text-xs font-normal gap-1 bg-orange-500 hover:bg-orange-600"><UserCheck className="h-3 w-3" />{free} מקומות</Badge>
  return <Badge variant="outline" className="text-xs font-normal gap-1 text-green-600 border-green-200"><UserCheck className="h-3 w-3" />{free} מקומות פנויים</Badge>
}

function DateBadge({ date }: { date: string }) {
  const today = localTodayStr()
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

const emptyForm = { title: '', date: '', time: '09:00', max_participants: 10, enrolled: 0, notes: '', price_per_participant: '' }

export default function GroupClient({ initialSessions, workingHours, businessId }: {
  initialSessions: GroupSession[]
  workingHours: WorkingHours | null
  businessId: string | null
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

  // Participants modal
  const [participantsSession, setParticipantsSession] = useState<GroupSession | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')
  const [addingParticipant, setAddingParticipant] = useState(false)

  const todayStr = localTodayStr()
  const upcoming = sessions.filter(s => s.date >= todayStr)
  const past = sessions.filter(s => s.date < todayStr).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  const displayed = showHistory ? past : upcoming

  // Working hours slots for selected date
  const workingSlots = getSlotsForDate(form.date, workingHours)
  const dayClosed = form.date ? workingSlots.length === 0 && workingHours !== null : false

  // Occupied times on the same date (other sessions, excluding current edit)
  const occupiedTimes = new Set(
    sessions.filter(s => s.date === form.date && s.id !== editing?.id).map(s => s.time)
  )

  // Available slots = working hours slots, minus past (if today), minus occupied
  const nowMinutes = form.date === todayStr ? new Date().getHours() * 60 + new Date().getMinutes() : -1
  const availableSlots = workingSlots.filter(slot => {
    if (occupiedTimes.has(slot)) return false
    if (nowMinutes >= 0 && timeToMinutes(slot) <= nowMinutes) return false
    return true
  })

  useEffect(() => {
    if (form.date && availableSlots.length > 0 && !availableSlots.includes(form.time))
      setForm(f => ({ ...f, time: availableSlots[0] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date])

  function set<K extends keyof typeof emptyForm>(k: K, v: typeof emptyForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true) }
  function openEdit(s: GroupSession) {
    setEditing(s)
    setForm({
      title: s.title, date: s.date, time: s.time,
      max_participants: s.max_participants, enrolled: s.enrolled, notes: s.notes || '',
      price_per_participant: s.price_per_participant ? String(s.price_per_participant) : '',
    })
    setOpen(true)
  }

  async function openParticipants(s: GroupSession) {
    setParticipantsSession(s)
    setParticipantsLoading(true)
    const { data, error } = await supabase
      .from('group_session_participants')
      .select('*')
      .eq('session_id', s.id)
      .eq('business_id', businessId)
      .order('created_at')
    if (error) toast.error(error.message)
    else setParticipants(data ?? [])
    setParticipantsLoading(false)
  }

  async function addParticipant() {
    if (!newParticipantName.trim() || !participantsSession) return
    setAddingParticipant(true)
    const { data, error } = await supabase
      .from('group_session_participants')
      .insert({ session_id: participantsSession.id, name: newParticipantName.trim(), business_id: businessId })
      .select().single()
    if (error) { toast.error(error.message); setAddingParticipant(false); return }
    setParticipants(ps => [...ps, data])
    // Sync enrolled count
    const newEnrolled = participants.length + 1
    await supabase.from('group_sessions').update({ enrolled: newEnrolled }).eq('id', participantsSession.id).eq('business_id', businessId)
    setSessions(ss => ss.map(s => s.id === participantsSession.id ? { ...s, enrolled: newEnrolled } : s))
    setParticipantsSession(ps => ps ? { ...ps, enrolled: newEnrolled } : ps)
    setNewParticipantName('')
    setAddingParticipant(false)
  }

  async function removeParticipant(id: string) {
    const { error } = await supabase.from('group_session_participants').delete().eq('id', id).eq('business_id', businessId)
    if (error) { toast.error(error.message); return }
    const remaining = participants.filter(p => p.id !== id)
    setParticipants(remaining)
    if (participantsSession) {
      await supabase.from('group_sessions').update({ enrolled: remaining.length }).eq('id', participantsSession.id).eq('business_id', businessId)
      setSessions(ss => ss.map(s => s.id === participantsSession.id ? { ...s, enrolled: remaining.length } : s))
      setParticipantsSession(ps => ps ? { ...ps, enrolled: remaining.length } : ps)
    }
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error('נא להזין כותרת לפגישה')
    if (!form.date) return toast.error('נא לבחור תאריך')
    if (!form.time) return toast.error('נא לבחור שעה')
    if (dayClosed) return toast.error('העסק סגור ביום זה')
    if (form.max_participants < 1) return toast.error('מספר משתתפים חייב להיות לפחות 1')
    if (form.enrolled > form.max_participants) return toast.error('מספר נרשמים לא יכול לעלות על המקסימום')
    if (occupiedTimes.has(form.time)) return toast.error('יש כבר פגישה קבוצתית בשעה זו — בחר שעה אחרת')
    if (nowMinutes >= 0 && timeToMinutes(form.time) <= nowMinutes) return toast.error('לא ניתן לקבוע פגישה בשעה שעברה')

    setLoading(true)
    const payload = {
      title: form.title.trim(), date: form.date, time: form.time,
      max_participants: form.max_participants, enrolled: form.enrolled, notes: form.notes,
      price_per_participant: parseFloat(String(form.price_per_participant)) || 0,
    }
    if (editing) {
      const { data, error } = await supabase.from('group_sessions').update(payload).eq('id', editing.id).eq('business_id', businessId).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setSessions(ss => ss.map(s => s.id === editing.id ? data : s).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('הפגישה עודכנה')
    } else {
      const { data, error } = await supabase.from('group_sessions').insert({ ...payload, business_id: businessId }).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setSessions(ss => [...ss, data].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)))
      toast.success('הפגישה הקבוצתית נוצרה')
    }
    setOpen(false)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error: partErr } = await supabase.from('group_session_participants').delete().eq('session_id', id)
    if (partErr) { toast.error(partErr.message); setDeleteId(null); return }
    const { error } = await supabase.from('group_sessions').delete().eq('id', id).eq('business_id', businessId)
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
            {past.length > 0 && <span className="bg-slate-200 text-slate-600 text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">{past.length}</span>}
          </Button>
          <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> פגישה חדשה</Button>
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
              <Card key={s.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
                onClick={() => openParticipants(s)}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base leading-snug truncate">{s.title}</p>
                      <DateBadge date={s.date} />
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {formatDateOnlyHe(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium" dir="ltr">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {s.time}
                    </span>
                    {s.price_per_participant > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 mr-auto">
                        ₪{s.price_per_participant} / משתתף
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{s.enrolled} / {s.max_participants} נרשמו</span>
                      <SpotsBadge max={s.max_participants} enrolled={s.enrolled} />
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500',
                        free <= 0 ? 'bg-red-500' : free <= 2 ? 'bg-orange-400' : 'bg-emerald-500'
                      )} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>

                  {s.notes && <p className="text-xs text-slate-400 line-clamp-2 border-t border-slate-100 pt-2">{s.notes}</p>}

                  <p className="text-xs text-slate-400 text-center">לחץ לניהול משתתפים</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Participants modal ─────────────────────────────────────────────── */}
      <Dialog open={!!participantsSession} onOpenChange={v => { if (!v) setParticipantsSession(null) }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          {participantsSession && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-xl p-2.5"><Users2 className="h-5 w-5 text-primary" /></div>
                  <div>
                    <DialogTitle className="text-base font-bold leading-tight">{participantsSession.title}</DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDateOnlyHe(participantsSession.date)} · {participantsSession.time}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Stats */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-slate-900">{participantsSession.enrolled}</p>
                    <p className="text-xs text-slate-500">נרשמו</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-slate-900">{participantsSession.max_participants - participantsSession.enrolled}</p>
                    <p className="text-xs text-slate-500">מקומות פנויים</p>
                  </div>
                  {participantsSession.price_per_participant > 0 && (
                    <>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="text-center flex-1">
                        <p className="text-xl font-bold text-green-600">₪{(participantsSession.price_per_participant * participantsSession.enrolled).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">הכנסה</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Add participant */}
                <div className="flex gap-2">
                  <Input
                    value={newParticipantName}
                    onChange={e => setNewParticipantName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addParticipant()}
                    placeholder="שם המשתתף..."
                    className="h-10 flex-1"
                    autoFocus
                  />
                  <Button onClick={addParticipant} disabled={addingParticipant || !newParticipantName.trim()} className="h-10 gap-1.5 shrink-0">
                    {addingParticipant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    הוסף
                  </Button>
                </div>

                {/* Participant list */}
                {participantsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">אין משתתפים רשומים</p>
                    <p className="text-xs">הוסף משתתפים בעזרת השדה למעלה</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {participants.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group/p">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-800">{p.name}</span>
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="opacity-0 group-hover/p:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                          title="הסר משתתף"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
                <Button variant="outline" onClick={() => { setParticipantsSession(null); openEdit(participantsSession) }} className="gap-1.5">
                  <Pencil className="h-4 w-4" /> ערוך פגישה
                </Button>
                <DialogClose>
                  <Button className="flex-1">סגור</Button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit dialog ──────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-xl p-2.5"><Users2 className="h-5 w-5 text-primary" /></div>
              <DialogTitle className="text-lg font-bold">
                {editing ? 'עריכת פגישה קבוצתית' : 'פגישה קבוצתית חדשה'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <AlignLeft className="h-4 w-4 text-slate-400" /> כותרת *
              </Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="לדוגמה: יוגה בוקר, פילאטיס" className="h-11 text-base" autoFocus />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <CalendarDays className="h-4 w-4 text-slate-400" /> תאריך *
              </Label>
              <Input type="date" dir="ltr" className="h-11 text-base text-left"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <Clock className="h-4 w-4 text-slate-400" /> שעה
                {form.date && availableSlots.length > 0 && (
                  <span className="text-xs font-normal text-slate-400">({availableSlots[0]} – {availableSlots[availableSlots.length - 1]})</span>
                )}
              </Label>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                <WheelPicker
                  key={form.date}
                  slots={availableSlots.length > 0 ? availableSlots : (form.date ? [] : ALL_TIME_SLOTS)}
                  value={form.time}
                  onChange={v => set('time', v)}
                />
              </div>
              {form.date && dayClosed && <p className="text-xs text-red-500">העסק סגור ביום זה</p>}
              {form.date && !dayClosed && availableSlots.length === 0 && (
                <p className="text-xs text-amber-600">כל השעות ביום זה תפוסות על ידי פגישות קבוצתיות אחרות</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                  <Users2 className="h-4 w-4 text-slate-400" /> מקס׳ משתתפים
                </Label>
                <Input type="number" min={1} dir="ltr" className="h-11 text-base text-left"
                  value={form.max_participants}
                  onChange={e => set('max_participants', Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                  <UserCheck className="h-4 w-4 text-slate-400" /> נרשמו
                </Label>
                <Input type="number" min={0} dir="ltr" className="h-11 text-base text-left"
                  value={form.enrolled}
                  onChange={e => set('enrolled', Math.max(0, parseInt(e.target.value) || 0))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <Banknote className="h-4 w-4 text-slate-400" /> מחיר לכל משתתף (₪)
              </Label>
              <Input type="number" min={0} dir="ltr" className="h-11 text-base text-left"
                value={form.price_per_participant}
                onChange={e => set('price_per_participant', e.target.value)}
                placeholder="0" />
            </div>

            {form.max_participants > 0 && (
              <div className="space-y-1.5 bg-slate-50 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{form.enrolled} / {form.max_participants} נרשמו</span>
                  <SpotsBadge max={form.max_participants} enrolled={form.enrolled} />
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all',
                    (form.max_participants - form.enrolled) <= 0 ? 'bg-red-500' :
                    (form.max_participants - form.enrolled) <= 2 ? 'bg-orange-400' : 'bg-emerald-500'
                  )} style={{ width: `${Math.min(100, form.max_participants > 0 ? (form.enrolled / form.max_participants) * 100 : 0)}%` }} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <AlignLeft className="h-4 w-4 text-slate-400" /> הערות
              </Label>
              <Input value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="הערות אופציונליות..." className="h-11 text-base" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
            <Button onClick={handleSave} disabled={loading} className="flex-1 h-11 text-base font-semibold shadow-sm">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />שומר...</> : editing ? 'שמור שינויים' : 'צור פגישה'}
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
          <DialogHeader><DialogTitle>מחיקת פגישה קבוצתית</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">האם אתה בטוח? הפגישה ורשימת המשתתפים יימחקו לצמיתות.</p>
          <DialogFooter className="flex-row-reverse gap-2 mt-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 sm:flex-none">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 sm:flex-none">ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
