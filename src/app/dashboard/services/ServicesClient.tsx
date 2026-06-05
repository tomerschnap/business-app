'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react'

type Service = { id: string; name: string; price: number; duration: string; created_at: string }

const DURATIONS = ['15 דקות', '30 דקות', '45 דקות', 'שעה', 'שעה וחצי', 'שעתיים']
const empty = { name: '', price: '', duration: '30 דקות' }

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>(initialServices)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function openAdd() { setEditing(null); setForm(empty); setOpen(true) }
  function openEdit(s: Service) { setEditing(s); setForm({ name: s.name, price: String(s.price || ''), duration: s.duration }); setOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('שם השירות הוא שדה חובה')
    setLoading(true)
    const payload = { name: form.name.trim(), price: parseFloat(form.price) || 0, duration: form.duration }
    if (editing) {
      const { data, error } = await supabase.from('services').update(payload).eq('id', editing.id).select().single()
      if (error) toast.error(error.message)
      else { setServices(ss => ss.map(s => s.id === editing.id ? data : s)); toast.success('השירות עודכן'); setOpen(false) }
    } else {
      const { data, error } = await supabase.from('services').insert(payload).select().single()
      if (error) toast.error(error.message)
      else { setServices(ss => [data, ...ss]); toast.success('שירות נוסף'); setOpen(false) }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setServices(ss => ss.filter(s => s.id !== id)); toast.success('השירות נמחק') }
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">שירותים</h1>
          <p className="text-slate-500 text-sm mt-0.5">{services.length} שירותים מוגדרים</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> הוסף שירות
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">שם השירות</TableHead>
              <TableHead className="font-semibold text-slate-700">משך</TableHead>
              <TableHead className="font-semibold text-slate-700">מחיר</TableHead>
              <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-14 text-slate-400">
                  <Scissors className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">אין שירותים עדיין</p>
                  <p className="text-sm">הוסף את השירות הראשון שלך</p>
                </TableCell>
              </TableRow>
            ) : services.map(s => (
              <TableRow key={s.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-semibold text-slate-800">{s.name}</TableCell>
                <TableCell><Badge variant="secondary" className="font-normal text-xs">{s.duration}</Badge></TableCell>
                <TableCell className="text-slate-600">{s.price ? `₪${s.price}` : '—'}</TableCell>
                <TableCell className="text-left">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5 text-slate-500" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {services.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <Scissors className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">אין שירותים עדיין</p>
          </div>
        ) : services.map(s => (
          <Card key={s.id} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{s.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-normal text-xs">{s.duration}</Badge>
                  {s.price ? <span className="text-sm text-slate-600 font-medium">₪{s.price}</span> : null}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(s)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'עריכת שירות' : 'הוספת שירות'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>שם השירות *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="לדוג׳ תספורת גברים" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>משך</Label>
              <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v ?? '30 דקות' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>מחיר (₪)</Label>
              <Input type="number" min="0" dir="ltr" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" className="text-left" />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף שירות'}
            </Button>
            <DialogClose><Button variant="outline" type="button" className="flex-1 sm:flex-none">ביטול</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>מחיקת שירות</DialogTitle></DialogHeader>
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
