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
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail } from 'lucide-react'

type Customer = { id: string; name: string; email: string; phone: string; created_at: string }
const empty = { name: '', email: '', phone: '' }

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
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
  function openEdit(c: Customer) { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone }); setOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('שם הוא שדה חובה')
    setLoading(true)
    if (editing) {
      const { data, error } = await supabase.from('customers').update(form).eq('id', editing.id).select().single()
      if (error) toast.error(error.message)
      else { setCustomers(cs => cs.map(c => c.id === editing.id ? data : c)); toast.success('הלקוח עודכן'); setOpen(false) }
    } else {
      const { data, error } = await supabase.from('customers').insert(form).select().single()
      if (error) toast.error(error.message)
      else { setCustomers(cs => [data, ...cs]); toast.success('לקוח נוסף בהצלחה'); setOpen(false) }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setCustomers(cs => cs.filter(c => c.id !== id)); toast.success('הלקוח נמחק') }
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">לקוחות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{customers.length} לקוחות רשומים</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> הוסף לקוח
        </Button>
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
              <TableHead className="font-semibold text-slate-700">אימייל</TableHead>
              <TableHead className="font-semibold text-slate-700">טלפון</TableHead>
              <TableHead className="font-semibold text-slate-700">תאריך הצטרפות</TableHead>
              <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-14 text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">{search ? 'לא נמצאו לקוחות' : 'אין לקוחות עדיין'}</p>
                  {!search && <p className="text-sm">הוסף את הלקוח הראשון שלך</p>}
                </TableCell>
              </TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-semibold text-slate-800">{c.name}</TableCell>
                <TableCell className="text-slate-500">{c.email || '—'}</TableCell>
                <TableCell className="text-slate-500" dir="ltr">{c.phone || '—'}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {new Date(c.created_at).toLocaleDateString('he-IL')}
                  </Badge>
                </TableCell>
                <TableCell className="text-left">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
        ) : filtered.map(c => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-base">{c.name}</p>
                  {c.email && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><Mail className="h-3.5 w-3.5 shrink-0" />{c.email}</p>}
                  {c.phone && <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5" dir="ltr"><Phone className="h-3.5 w-3.5 shrink-0" />{c.phone}</p>}
                  <p className="text-xs text-slate-400 mt-2">{new Date(c.created_at).toLocaleDateString('he-IL')}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setDeleteId(c.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'עריכת לקוח' : 'הוספת לקוח'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>שם *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="שם מלא" />
            </div>
            <div className="space-y-2">
              <Label>אימייל</Label>
              <Input type="email" dir="ltr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input dir="ltr" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="050-0000000" className="text-left" />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף לקוח'}
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
          <DialogHeader><DialogTitle>מחיקת לקוח</DialogTitle></DialogHeader>
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
