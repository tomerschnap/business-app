'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Store, Save, Loader2, Building2, Phone, MapPin, FileText, Image as ImageIcon, Globe, Clock, CalendarOff, Plus, Trash2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

type DayHours = { enabled: boolean; open: string; close: string }
type WorkingHours = Record<string, DayHours>

type BlockedDate = { id: string; date: string; reason: string }

type Profile = {
  id?: string
  user_id: string
  name: string
  phone: string
  email: string
  address: string
  description: string
  logo_url: string
  website: string
  working_hours?: WorkingHours
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY_LABELS: Record<string, string> = {
  sun: 'ראשון', mon: 'שני', tue: 'שלישי',
  wed: 'רביעי', thu: 'חמישי', fri: 'שישי', sat: 'שבת',
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  sun: { enabled: true,  open: '09:00', close: '18:00' },
  mon: { enabled: true,  open: '09:00', close: '18:00' },
  tue: { enabled: true,  open: '09:00', close: '18:00' },
  wed: { enabled: true,  open: '09:00', close: '18:00' },
  thu: { enabled: true,  open: '09:00', close: '18:00' },
  fri: { enabled: true,  open: '09:00', close: '14:00' },
  sat: { enabled: false, open: '09:00', close: '18:00' },
}

// Half-hour slots for working hours pickers
const HOUR_OPTIONS: string[] = (() => {
  const opts: string[] = []
  for (let h = 0; h < 24; h++)
    for (const m of [0, 30])
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  return opts
})()

const emptyProfile = (userId: string): Profile => ({
  user_id: userId, name: '', phone: '', email: '', address: '',
  description: '', logo_url: '', website: '',
  working_hours: DEFAULT_WORKING_HOURS,
})

export default function BusinessClient({ initialProfile, userId, initialBlockedDates }: {
  initialProfile: Profile | null
  userId: string
  initialBlockedDates: BlockedDate[]
}) {
  const supabase = createClient()
  const [form, setForm] = useState<Profile>({
    ...(initialProfile ?? emptyProfile(userId)),
    working_hours: initialProfile?.working_hours
      ? { ...DEFAULT_WORKING_HOURS, ...initialProfile.working_hours }
      : DEFAULT_WORKING_HOURS,
  })
  const [loading, setLoading] = useState(false)
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates)
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [addingDate, setAddingDate] = useState(false)

  function setField(field: keyof Profile, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setDay(day: string, patch: Partial<DayHours>) {
    setForm(f => ({
      ...f,
      working_hours: {
        ...f.working_hours,
        [day]: { ...(f.working_hours?.[day] ?? DEFAULT_WORKING_HOURS[day]), ...patch },
      },
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('שם העסק הוא שדה חובה')
    setLoading(true)
    try {
      const payload = {
        user_id: userId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        description: form.description,
        logo_url: form.logo_url,
        website: form.website,
        working_hours: form.working_hours ?? {},
        updated_at: new Date().toISOString(),
      }
      if (form.id) {
        const { error } = await supabase.from('business_profiles').update(payload).eq('id', form.id)
        if (error) { toast.error(error.message); return }
      } else {
        const { data: inserted, error } = await supabase.from('business_profiles').insert(payload).select().single()
        if (error) { toast.error(error.message); return }
        if (inserted) setForm(f => ({ ...f, id: inserted.id }))
      }
      toast.success('הפרופיל נשמר בהצלחה')
    } finally {
      setLoading(false)
    }
  }

  async function addBlockedDate() {
    if (!newDate) return toast.error('נא לבחור תאריך')
    if (blockedDates.some(b => b.date === newDate)) return toast.error('תאריך זה כבר חסום')
    setAddingDate(true)
    const { data, error } = await supabase.from('blocked_dates').insert({ date: newDate, reason: newReason }).select().single()
    if (error) toast.error(error.message)
    else { setBlockedDates(bs => [...bs, data].sort((a, b) => a.date.localeCompare(b.date))); setNewDate(''); setNewReason(''); toast.success('התאריך נחסם') }
    setAddingDate(false)
  }

  async function removeBlockedDate(id: string) {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setBlockedDates(bs => bs.filter(b => b.id !== id)); toast.success('החסימה הוסרה') }
  }

  const wh = form.working_hours ?? DEFAULT_WORKING_HOURS

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-2xl p-3">
          <Store className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">פרופיל העסק</h1>
          <p className="text-slate-500 text-sm">עדכן את פרטי העסק שלך</p>
        </div>
      </div>

      {/* Logo preview */}
      {form.logo_url && (
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.logo_url} alt="לוגו העסק"
            className="h-16 w-16 object-contain rounded-xl border border-slate-200 bg-slate-50"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <p className="text-sm text-slate-500">תצוגה מקדימה של הלוגו</p>
        </div>
      )}

      {/* Business details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">פרטי העסק</CardTitle>
          <CardDescription>המידע שיוצג ללקוחות ובמסמכים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" /> שם העסק *</Label>
            <Input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="לדוגמה: מספרת כהן" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> טלפון</Label>
              <Input dir="ltr" className="text-left" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="050-0000000" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> אימייל</Label>
              <Input type="email" dir="ltr" className="text-left" value={form.email ?? ''} onChange={e => setField('email', e.target.value)} placeholder="business@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-slate-400" /> אתר אינטרנט</Label>
              <Input dir="ltr" className="text-left" value={form.website} onChange={e => setField('website', e.target.value)} placeholder="https://example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" /> כתובת</Label>
            <Input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="רחוב הרצל 1, תל אביב" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" /> תיאור העסק</Label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)}
              placeholder="ספר על העסק שלך, השירותים שאתה מציע..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5 text-slate-400" /> קישור ללוגו</Label>
            <Input dir="ltr" className="text-left" value={form.logo_url} onChange={e => setField('logo_url', e.target.value)} placeholder="https://example.com/logo.png" />
            <p className="text-xs text-slate-400">הדבק קישור לתמונת הלוגו שלך</p>
          </div>
        </CardContent>
      </Card>

      {/* Working hours */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" /> שעות פעילות
          </CardTitle>
          <CardDescription>קבע את שעות הפעילות לכל יום. ניתן לקבוע תורים רק בשעות הפעילות.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAY_KEYS.map(day => {
            const d = wh[day] ?? DEFAULT_WORKING_HOURS[day]
            return (
              <div key={day} className={cn(
                'flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors',
                d.enabled ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'
              )}>
                {/* Toggle */}
                <button
                  onClick={() => setDay(day, { enabled: !d.enabled })}
                  className={cn(
                    'relative w-10 h-5.5 rounded-full transition-colors shrink-0 flex items-center',
                    d.enabled ? 'bg-primary' : 'bg-slate-300'
                  )}
                  style={{ width: 40, height: 22 }}
                  aria-label={`toggle ${day}`}
                >
                  <span className={cn(
                    'absolute w-4 h-4 bg-white rounded-full shadow transition-transform',
                    d.enabled ? 'translate-x-5' : 'translate-x-1'
                  )} />
                </button>

                {/* Day label */}
                <span className="w-14 text-sm font-medium text-slate-700 shrink-0">יום {DAY_LABELS[day]}</span>

                {d.enabled ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Select value={d.open} onValueChange={v => setDay(day, { open: v ?? d.open })}>
                      <SelectTrigger className="h-8 w-24 text-sm" dir="ltr"><SelectValue /></SelectTrigger>
                      <SelectContent>{HOUR_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-slate-400 text-sm">עד</span>
                    <Select value={d.close} onValueChange={v => setDay(day, { close: v ?? d.close })}>
                      <SelectTrigger className="h-8 w-24 text-sm" dir="ltr"><SelectValue /></SelectTrigger>
                      <SelectContent>{HOUR_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 flex-1">סגור</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Blocked dates */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-slate-400" /> תאריכים חסומים
          </CardTitle>
          <CardDescription>חסום תאריכים שבהם לא ניתן לקבוע תורים (חופשות, חגים, וכד׳)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-slate-500 mb-1 block">תאריך</Label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" dir="ltr" />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs text-slate-500 mb-1 block">סיבה (אופציונלי)</Label>
              <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="חופשה, חג..."
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <Button onClick={addBlockedDate} disabled={addingDate} className="gap-1.5 h-9 shrink-0">
              <Plus className="h-4 w-4" /> חסום תאריך
            </Button>
          </div>

          {blockedDates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">אין תאריכים חסומים</p>
          ) : (
            <div className="space-y-2">
              {blockedDates.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(b.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {b.reason && <p className="text-xs text-slate-500">{b.reason}</p>}
                  </div>
                  <button onClick={() => removeBlockedDate(b.id)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="gap-2 h-11 px-6 text-base font-semibold shadow-sm">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />שומר...</> : <><Save className="h-4 w-4" />שמור פרופיל</>}
      </Button>
    </div>
  )
}
