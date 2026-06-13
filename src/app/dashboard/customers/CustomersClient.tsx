'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, Eye, Download, AlertCircle, Star, UserCheck, UserMinus } from 'lucide-react'
import { logActivity } from '@/lib/logActivity'
import * as XLSX from 'xlsx'

type Customer = {
  id: string; name: string; email: string; phone: string; notes: string
  birthday?: string; tag?: string; debt?: number; created_at: string
}
type Stats = { visits: number; totalSpent: number }

const TAGS = ['', 'VIP', 'חדש', 'לא פעיל']
const TAG_STYLE: Record<string, string> = {
  'VIP': 'bg-amber-100 text-amber-700 border-amber-200',
  'חדש': 'bg-blue-100 text-blue-700 border-blue-200',
  'לא פעיל': 'bg-slate-100 text-slate-500 border-slate-200',
}
const TAG_ICON: Record<string, React.ReactNode> = {
  'VIP': <Star className="h-3 w-3 fill-current" />,
  'חדש': <UserCheck className="h-3 w-3" />,
  'לא פעיל': <UserMinus className="h-3 w-3" />,
}

const empty = { name: '', email: '', phone: '', notes: '', birthday: '', tag: '', debt: '' }

export default function CustomersClient({
  initialCustomers,
  statsMap,
  businessId,
}: {
  initialCustomers: Customer[]
  statsMap: Record<string, Stats>
  businessId: string | null
}) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<Customer | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = customers
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'he'))

  function openAdd() { setEditing(null); setForm(empty); setOpen(true) }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', notes: c.notes || '', birthday: c.birthday || '', tag: c.tag || '', debt: c.debt ? String(c.debt) : '' })
    setOpen(true)
  }
  function openView(c: Customer) { setViewing(c); setViewOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('שם הוא שדה חובה')
    setLoading(true)
    const payload = {
      name: form.name.trim(), email: form.email, phone: form.phone,
      notes: form.notes, birthday: form.birthday || null,
      tag: form.tag, debt: parseFloat(form.debt) || 0,
    }
    if (editing) {
      const { data, error } = await supabase.from('customers').update(payload).eq('id', editing.id).eq('business_id', businessId).select().single()
      if (error) toast.error(error.message)
      else { setCustomers(cs => cs.map(c => c.id === editing.id ? data : c)); toast.success('הלקוח עודכן'); setOpen(false) }
    } else {
      const { data, error } = await supabase.from('customers').insert({ ...payload, business_id: businessId }).select().single()
      if (error) toast.error(error.message)
      else {
        setCustomers(cs => [data, ...cs]); toast.success('לקוח נוסף בהצלחה'); setOpen(false)
        await logActivity('לקוח חדש', `שם: ${form.name.trim()}`)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('business_id', businessId)
    if (error) toast.error(error.message)
    else { setCustomers(cs => cs.filter(c => c.id !== id)); toast.success('הלקוח נמחק') }
    setDeleteId(null)
  }

  function exportToExcel() {
    const rows = filtered.map(c => ({
      שם: c.name,
      טלפון: c.phone || '',
      אימייל: c.email || '',
      'תאריך לידה': c.birthday || '',
      תגית: c.tag || '',
      'חוב פתוח': c.debt || 0,
      ביקורים: statsMap[c.name]?.visits || 0,
      'סה״כ הוצאה': statsMap[c.name]?.totalSpent || 0,
      'תאריך הצטרפות': new Date(c.created_at).toLocaleDateString('he-IL'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'לקוחות')
    XLSX.writeFile(wb, 'customers.xlsx')
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} לקוחות רשומים</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" /> ייצא Excel
          </Button>
          <Button onClick={openAdd} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> הוסף לקוח
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="חיפוש לקוח" className="pr-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">שם</TableHead>
              <TableHead className="font-semibold text-slate-700">טלפון</TableHead>
              <TableHead className="font-semibold text-slate-700">תגית</TableHead>
              <TableHead className="font-semibold text-slate-700">ביקורים</TableHead>
              <TableHead className="font-semibold text-slate-700">סה״כ הוצאה</TableHead>
              <TableHead className="font-semibold text-slate-700">חוב</TableHead>
              <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-14 text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{search ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}</p>
                  {!search && <p className="text-sm">הוסף את הלקוח הראשון שלך</p>}
                </TableCell>
              </TableRow>
            ) : filtered.map(c => {
              const stats = statsMap[c.name]
              return (
                <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      {c.debt && c.debt > 0 ? <AlertCircle className="h-4 w-4 text-red-400 shrink-0" aria-label={`חוב: ₪${c.debt}`} /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500" dir="ltr">{c.phone || '—'}</TableCell>
                  <TableCell>
                    {c.tag ? (
                      <Badge className={`text-xs font-medium border flex items-center gap-1 w-fit ${TAG_STYLE[c.tag] || ''}`}>
                        {TAG_ICON[c.tag]}{c.tag}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{stats?.visits ?? 0}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{stats?.totalSpent ? `₪${stats.totalSpent}` : '—'}</TableCell>
                  <TableCell>
                    {c.debt && c.debt > 0
                      ? <Badge className="bg-red-100 text-red-600 border border-red-200 font-medium text-xs">₪{c.debt}</Badge>
                      : <span className="text-slate-400 text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openView(c)} title="צפה בכרטיס"><Eye className="h-3.5 w-3.5 text-slate-400" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5 text-slate-500" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{search ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}</p>
          </div>
        ) : filtered.map(c => {
          const stats = statsMap[c.name]
          return (
            <Card key={c.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800 text-base">{c.name}</p>
                      {c.tag && (
                        <Badge className={`text-xs font-medium border flex items-center gap-1 ${TAG_STYLE[c.tag] || ''}`}>
                          {TAG_ICON[c.tag]}{c.tag}
                        </Badge>
                      )}
                      {c.debt && c.debt > 0 ? <Badge className="bg-red-100 text-red-600 border border-red-200 text-xs">חוב ₪{c.debt}</Badge> : null}
                    </div>
                    {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1" dir="ltr"><Phone className="h-3.5 w-3.5 shrink-0" />{c.phone}</p>}
                    {c.email && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>{stats?.visits ?? 0} ביקורים</span>
                      {stats?.totalSpent ? <span>₪{stats.totalSpent} הוצאה</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openView(c)}><Eye className="h-4 w-4 text-slate-400" /></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(c)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* View customer card dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          {viewing && (() => {
            const stats = statsMap[viewing.name]
            return (
              <>
                <DialogHeader><DialogTitle>כרטיס לקוח</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-lg">{viewing.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-slate-900">{viewing.name}</p>
                      {viewing.tag && (
                        <Badge className={`text-xs font-medium border flex items-center gap-1 w-fit mt-1 ${TAG_STYLE[viewing.tag] || ''}`}>
                          {TAG_ICON[viewing.tag]}{viewing.tag}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-slate-900">{stats?.visits ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">ביקורים</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">₪{stats?.totalSpent ?? 0}</p>
                      <p className="text-xs text-slate-500 mt-0.5">סה״כ הוצאה</p>
                    </div>
                  </div>

                  {viewing.debt && viewing.debt > 0 ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">חוב פתוח</p>
                        <p className="text-lg font-bold text-red-600">₪{viewing.debt}</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 text-sm">
                    {viewing.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400 shrink-0" /><span dir="ltr">{viewing.phone}</span></div>}
                    {viewing.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400 shrink-0" />{viewing.email}</div>}
                    {viewing.birthday && <div className="flex items-center gap-2 text-slate-600"><span className="text-slate-400 text-xs">יום הולדת:</span>{new Date(viewing.birthday + 'T00:00:00').toLocaleDateString('he-IL')}</div>}
                    {viewing.notes && <div className="bg-slate-50 rounded-xl p-3 text-slate-600 text-xs">{viewing.notes}</div>}
                  </div>
                  <p className="text-xs text-slate-400">הצטרף: {new Date(viewing.created_at).toLocaleDateString('he-IL')}</p>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setViewOpen(false); openEdit(viewing) }} variant="outline" className="flex-1">ערוך</Button>
                  <DialogClose><Button className="flex-1">סגור</Button></DialogClose>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'עריכת לקוח' : 'הוספת לקוח'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>שם *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם מלא" />
            </div>
            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input type="email" dir="ltr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>תאריך לידה</Label>
              <Input type="date" dir="ltr" value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>תגית</Label>
              <Select value={form.tag} onValueChange={v => setForm(f => ({ ...f, tag: !v || v === '_none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="ללא תגית" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ללא תגית</SelectItem>
                  {TAGS.filter(Boolean).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>חוב פתוח (₪)</Label>
              <Input type="number" min="0" dir="ltr" value={form.debt} onChange={e => setForm(f => ({ ...f, debt: e.target.value }))} placeholder="0" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>הערות</Label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="הערות על הלקוח..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף לקוח'}
            </Button>
            <DialogClose><Button variant="outline" type="button" className="flex-1 sm:flex-none">ביטול</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>מחיקת לקוח</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">האם אתה בטוח? פעולה זו אינה ניתנת לביטול.</p>
          <DialogFooter className="flex-row-reverse gap-2 mt-2">
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)} className="flex-1 sm:flex-none">מחק</Button>
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 sm:flex-none">ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
