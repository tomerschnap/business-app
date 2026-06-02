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
import { Plus, Pencil, Trash2, ShoppingBag, CalendarDays, User, X } from 'lucide-react'

type Order = {
  id: string
  customer_name: string
  date: string
  title: string
  description: string
  notes: string
  created_at: string
}
type Customer = { id: string; name: string }
type CustomerMode = 'select' | 'new'

const emptyForm = { customer_name: '', date: '', title: '', description: '', notes: '' }

function StatusBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

export default function OrdersClient({ initialOrders, customers }: {
  initialOrders: Order[]
  customers: Customer[]
}) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(
    [...initialOrders].sort((a, b) => a.date.localeCompare(b.date))
  )
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [customerMode, setCustomerMode] = useState<CustomerMode>('select')
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setCustomerMode('select')
    setOpen(true)
  }

  function openEdit(o: Order) {
    setEditing(o)
    setForm({
      customer_name: o.customer_name,
      date: o.date,
      title: o.title || '',
      description: o.description || '',
      notes: o.notes || '',
    })
    setCustomerMode(customers.some(c => c.name === o.customer_name) ? 'select' : 'new')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.customer_name) return toast.error('נא לבחור לקוח')
    if (!form.date) return toast.error('נא לבחור תאריך')
    setLoading(true)
    const payload = {
      customer_name: form.customer_name,
      date: form.date,
      title: form.title,
      description: form.description,
      notes: form.notes,
    }
    if (editing) {
      const { data, error } = await supabase.from('orders').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setOrders(os => os.map(o => o.id === editing.id ? data : o).sort((a, b) => a.date.localeCompare(b.date)))
      toast.success('ההזמנה עודכנה')
      setOpen(false)
    } else {
      const { data, error } = await supabase.from('orders').insert(payload).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setOrders(os => [...os, data].sort((a, b) => a.date.localeCompare(b.date)))
      toast.success('ההזמנה נוספה בהצלחה')
      setOpen(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setOrders(os => os.filter(o => o.id !== id)); toast.success('ההזמנה נמחקה') }
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הזמנות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{orders.length} הזמנות בסה״כ</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> הוסף הזמנה
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">כותרת</TableHead>
              <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
              <TableHead className="font-semibold text-slate-700">תאריך</TableHead>
              <TableHead className="font-semibold text-slate-700">סטטוס</TableHead>
              <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-14 text-slate-400">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">אין הזמנות עדיין</p>
                  <p className="text-sm">הוסף את ההזמנה הראשונה</p>
                </TableCell>
              </TableRow>
            ) : orders.map(o => (
              <TableRow key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailOrder(o)}>
                <TableCell className="font-semibold text-slate-800">{o.title || '—'}</TableCell>
                <TableCell className="text-slate-600">{o.customer_name}</TableCell>
                <TableCell>{new Date(o.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                <TableCell><StatusBadge date={o.date} /></TableCell>
                <TableCell className="text-left">
                  <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}>
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(o.id)}>
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
        {orders.length === 0 ? (
          <div className="text-center py-14 text-slate-400">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">אין הזמנות עדיין</p>
          </div>
        ) : orders.map(o => (
          <Card key={o.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailOrder(o)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Top: title */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{o.title || '(ללא כותרת)'}</p>
                    <StatusBadge date={o.date} />
                  </div>
                  {/* Middle: date */}
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {new Date(o.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {/* Bottom: customer name */}
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />{o.customer_name}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(o)}>
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setDeleteId(o.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail popup */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetailOrder(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="bg-amber-100 rounded-xl p-2">
                  <ShoppingBag className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-900 leading-tight">{detailOrder.title || '(ללא כותרת)'}</p>
                  <StatusBadge date={detailOrder.date} />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDetailOrder(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Details */}
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                {new Date(detailOrder.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                {detailOrder.customer_name}
              </p>
              {detailOrder.description && (
                <div className="pt-1">
                  <p className="text-xs font-semibold text-slate-500 mb-1">תיאור</p>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{detailOrder.description}</p>
                </div>
              )}
              {detailOrder.notes && (
                <div className="pt-1">
                  <p className="text-xs font-semibold text-slate-500 mb-1">הערות</p>
                  <p className="text-slate-700">{detailOrder.notes}</p>
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={() => { setDetailOrder(null); openEdit(detailOrder) }}>
                <Pencil className="h-4 w-4 ml-1" /> עריכה
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDetailOrder(null)}>סגור</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'עריכת הזמנה' : 'הוספת הזמנה'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer */}
            <div className="space-y-2">
              <Label>לקוח *</Label>
              {customers.length > 0 && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-2">
                  <button type="button"
                    onClick={() => { setCustomerMode('select'); setForm(f => ({ ...f, customer_name: '' })) }}
                    className={`flex-1 py-1.5 text-sm font-medium transition-colors ${customerMode === 'select' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >לקוח קיים</button>
                  <button type="button"
                    onClick={() => { setCustomerMode('new'); setForm(f => ({ ...f, customer_name: '' })) }}
                    className={`flex-1 py-1.5 text-sm font-medium transition-colors ${customerMode === 'new' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >חדש</button>
                </div>
              )}
              {customerMode === 'select' && customers.length > 0 ? (
                <Select value={form.customer_name} onValueChange={v => setForm(f => ({ ...f, customer_name: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="שם הלקוח" />
              )}
            </div>
            {/* Title */}
            <div className="space-y-2">
              <Label>כותרת</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="כותרת ההזמנה..." />
            </div>
            {/* Date */}
            <div className="space-y-2">
              <Label>תאריך *</Label>
              <Input type="date" value={form.date} dir="ltr" className="text-left" onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            {/* Description */}
            <div className="space-y-2">
              <Label>תיאור</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="תיאור מפורט של ההזמנה..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            {/* Notes */}
            <div className="space-y-2">
              <Label>הערות</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות אופציונליות..." />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף הזמנה'}
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
          <DialogHeader><DialogTitle>מחיקת הזמנה</DialogTitle></DialogHeader>
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
