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
import { Plus, Pencil, Trash2, ShoppingBag, CalendarDays } from 'lucide-react'

type Order = { id: string; customer_name: string; date: string; notes: string; created_at: string }
type Customer = { id: string; name: string }
type CustomerMode = 'select' | 'new'
const emptyForm = { customer_name: '', date: '', notes: '' }

function StatusBadge({ date }: { date: string }) {
  const today = new Date().toISOString().split('T')[0]
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

export default function OrdersClient({ initialOrders, customers }: {
  initialOrders: Order[]; customers: Customer[]
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

  function openAdd() { setEditing(null); setForm(emptyForm); setCustomerMode('select'); setOpen(true) }
  function openEdit(o: Order) {
    setEditing(o)
    setForm({ customer_name: o.customer_name, date: o.date, notes: o.notes })
    setCustomerMode(customers.some(c => c.name === o.customer_name) ? 'select' : 'new')
    setOpen(true)
  }

  async function handleSave() {
    if (!form.customer_name) return toast.error('נא לבחור לקוח')
    if (!form.date) return toast.error('נא לבחור תאריך')
    setLoading(true)
    if (editing) {
      const { data, error } = await supabase.from('orders').update(form).eq('id', editing.id).select().single()
      if (error) toast.error(error.message)
      else {
        setOrders(os => os.map(o => o.id === editing.id ? data : o).sort((a, b) => a.date.localeCompare(b.date)))
        toast.success('ההזמנה עודכנה')
        setOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('orders').insert(form).select().single()
      if (error) toast.error(error.message)
      else {
        setOrders(os => [...os, data].sort((a, b) => a.date.localeCompare(b.date)))
        toast.success('ההזמנה נוספה בהצלחה')
        setOpen(false)
      }
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
              <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
              <TableHead className="font-semibold text-slate-700">תאריך</TableHead>
              <TableHead className="font-semibold text-slate-700">הערות</TableHead>
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
              <TableRow key={o.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-semibold text-slate-800">{o.customer_name}</TableCell>
                <TableCell>{new Date(o.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                <TableCell className="text-slate-500 max-w-xs truncate">{o.notes || '—'}</TableCell>
                <TableCell><StatusBadge date={o.date} /></TableCell>
                <TableCell className="text-left">
                  <div className="flex gap-1 justify-end">
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
          <Card key={o.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{o.customer_name}</p>
                    <StatusBadge date={o.date} />
                  </div>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {new Date(o.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {o.notes && <p className="text-xs text-slate-400 mt-1.5">{o.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
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

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'עריכת הזמנה' : 'הוספת הזמנה'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>לקוח *</Label>
              {customers.length > 0 && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-2">
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('select'); setForm(f => ({ ...f, customer_name: '' })) }}
                    className={`flex-1 py-1.5 text-sm font-medium transition-colors ${customerMode === 'select' ? 'bg-primary text-primary-foreground' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >לקוח קיים</button>
                  <button
                    type="button"
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
            <div className="space-y-2">
              <Label>תאריך *</Label>
              <Input type="date" value={form.date} dir="ltr" className="text-left" onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
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
