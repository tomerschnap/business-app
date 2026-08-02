'use client'

import { useState } from 'react'
import { localTodayStr, parseDateOnly } from '@/lib/dates'
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
import { Plus, Pencil, Trash2, ShoppingBag, CalendarDays, User, X, History, Scissors, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

type Order = {
  id: string
  customer_name: string
  date: string
  title: string
  description: string
  notes: string
  service_name: string
  price: number
  status: string
  created_at: string
}
type Customer = { id: string; name: string }
type Service = { id: string; name: string; price: number; duration: string }
type CustomerMode = 'select' | 'new'

const ORDER_STATUSES = ['הזמנה חדשה', 'בהכנה', 'מוכן'] as const
const ORDER_STATUS_STYLE: Record<string, string> = {
  'הזמנה חדשה': 'bg-blue-100 text-blue-700 border-blue-200',
  'בהכנה':      'bg-amber-100 text-amber-700 border-amber-200',
  'מוכן':       'bg-green-100 text-green-700 border-green-200',
}

const emptyForm = { customer_name: '', date: '', title: '', description: '', notes: '', service_name: '', price: '', status: 'הזמנה חדשה' }

function DateBadge({ date }: { date: string }) {
  const today = localTodayStr()
  if (date < today) return <Badge variant="secondary" className="text-xs font-normal">עבר</Badge>
  if (date === today) return <Badge className="text-xs bg-green-500 hover:bg-green-600 font-normal">היום</Badge>
  return <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">קרוב</Badge>
}

function OrderStatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const current = status || 'הזמנה חדשה'
  const nextIndex = (ORDER_STATUSES.indexOf(current as typeof ORDER_STATUSES[number]) + 1) % ORDER_STATUSES.length
  const next = ORDER_STATUSES[nextIndex]
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(next) }}
      title={`לחץ לשינוי ל: ${next}`}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all hover:opacity-80 active:scale-95 cursor-pointer select-none',
        ORDER_STATUS_STYLE[current] ?? 'bg-slate-100 text-slate-500 border-slate-200'
      )}
    >
      {current}
    </button>
  )
}

export default function OrdersClient({ initialOrders, customers: initialCustomers, services, businessId }: {
  initialOrders: Order[]
  customers: Customer[]
  services: Service[]
  businessId: string | null
}) {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(
    [...initialOrders].sort((a, b) => a.date.localeCompare(b.date))
  )
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Order | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [customerMode, setCustomerMode] = useState<CustomerMode>('select')
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const today = localTodayStr()
  const upcoming = orders.filter(o => o.date >= today)
  const past = orders.filter(o => o.date < today).sort((a, b) => b.date.localeCompare(a.date))
  const displayed = showHistory ? past : upcoming

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setCustomerMode('select')
    setOpen(true)
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id).eq('business_id', businessId).select().single()
    if (error) { toast.error(error.message); return }
    setOrders(os => os.map(o => o.id === id ? data : o))
  }

  function openEdit(o: Order) {
    setEditing(o)
    setForm({
      customer_name: o.customer_name,
      date: o.date,
      title: o.title || '',
      description: o.description || '',
      notes: o.notes || '',
      service_name: o.service_name || '',
      price: o.price ? String(o.price) : '',
      status: o.status || 'הזמנה חדשה',
    })
    setCustomerMode(customers.some(c => c.name === o.customer_name) ? 'select' : 'new')
    setOpen(true)
  }

  function handleServiceChange(serviceId: string | null) {
    if (!serviceId) return
    const svc = services.find(s => s.id === serviceId)
    if (svc) setForm(f => ({ ...f, service_name: svc.name, price: String(svc.price || '') }))
  }

  async function autoSaveCustomer(name: string) {
    const trimmed = name.trim()
    if (!trimmed || customers.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return
    const { data } = await supabase.from('customers').insert({ name: trimmed, business_id: businessId }).select('id, name').single()
    if (data) setCustomers(cs => [...cs, data].sort((a, b) => a.name.localeCompare(b.name, 'he')))
  }

  async function handleSave() {
    if (!form.customer_name) return toast.error('נא לבחור לקוח')
    if (!form.date) return toast.error('נא לבחור תאריך')
    if (!form.service_name) return toast.error('נא לבחור שירות')
    setLoading(true)

    if (customerMode === 'new') await autoSaveCustomer(form.customer_name)

    const payload = {
      customer_name: form.customer_name,
      date: form.date,
      title: form.title || form.service_name,
      description: form.description,
      notes: form.notes,
      service_name: form.service_name,
      price: parseFloat(form.price) || 0,
      status: form.status || 'הזמנה חדשה',
    }
    if (editing) {
      const { data, error } = await supabase.from('orders').update(payload).eq('id', editing.id).eq('business_id', businessId).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setOrders(os => os.map(o => o.id === editing.id ? data : o).sort((a, b) => a.date.localeCompare(b.date)))
      toast.success('ההזמנה עודכנה')
      setOpen(false)
    } else {
      const { data, error } = await supabase.from('orders').insert({ ...payload, business_id: businessId }).select().single()
      if (error) { toast.error(error.message); setLoading(false); return }
      setOrders(os => [...os, data].sort((a, b) => a.date.localeCompare(b.date)))
      toast.success('ההזמנה נוספה בהצלחה')
      setOpen(false)
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('orders').delete().eq('id', id).eq('business_id', businessId)
    if (error) toast.error(error.message)
    else { setOrders(os => os.filter(o => o.id !== id)); toast.success('ההזמנה נמחקה') }
    setDeleteId(null)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">הזמנות</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {showHistory ? `${past.length} הזמנות בהיסטוריה` : `${upcoming.length} הזמנות קרובות`}
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
            <Plus className="h-4 w-4" /> הוסף הזמנה
          </Button>
        </div>
      </div>

      {/* Group orders by date */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ShoppingBag className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium text-base">{showHistory ? 'אין הזמנות בהיסטוריה' : 'אין הזמנות קרובות'}</p>
          {!showHistory && <p className="text-sm mt-1">לחץ על &quot;הוסף הזמנה&quot; כדי להתחיל</p>}
        </div>
      ) : (
        <div className="space-y-8">
          {(() => {
            // Build date groups
            const groups: { date: string; label: string; items: Order[] }[] = []
            for (const o of displayed) {
              const last = groups[groups.length - 1]
              if (last && last.date === o.date) { last.items.push(o) }
              else {
                groups.push({
                  date: o.date,
                  label: parseDateOnly(o.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
                  items: [o],
                })
              }
            }
            return groups.map(({ date, label, items }) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-bold text-slate-700 whitespace-nowrap">{label}</h2>
                  <div className="flex-1 h-px bg-slate-200" />
                  <DateBadge date={date} />
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-xl bg-white overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
                        <TableHead className="font-semibold text-slate-700">שירות</TableHead>
                        <TableHead className="font-semibold text-slate-700">מחיר</TableHead>
                        <TableHead className="font-semibold text-slate-700">סטטוס</TableHead>
                        <TableHead className="text-left font-semibold text-slate-700">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(o => (
                        <TableRow key={o.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailOrder(o)}>
                          <TableCell className="font-semibold text-slate-800">{o.customer_name}</TableCell>
                          <TableCell>
                            {o.service_name
                              ? <Badge variant="secondary" className="font-normal text-xs gap-1"><Scissors className="h-3 w-3" />{o.service_name}</Badge>
                              : <span className="text-slate-400">—</span>}
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">{o.price ? `₪${o.price}` : '—'}</TableCell>
                          <TableCell><OrderStatusBadge status={o.status} onChange={s => handleStatusChange(o.id, s)} /></TableCell>
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
                <div className="md:hidden space-y-2">
                  {items.map(o => (
                    <Card key={o.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailOrder(o)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-slate-900">{o.title || o.service_name || '(ללא כותרת)'}</p>
                              <OrderStatusBadge status={o.status} onChange={s => handleStatusChange(o.id, s)} />
                            </div>
                            {o.service_name && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                                <Scissors className="h-3 w-3 shrink-0" />{o.service_name}
                                {o.price ? <span className="font-medium text-slate-700 mr-1">· ₪{o.price}</span> : null}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
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
              </div>
            ))
          })()}
        </div>
      )}

      {/* Detail popup */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetailOrder(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 rounded-xl p-2.5">
                  <ShoppingBag className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-900 leading-tight">{detailOrder.title || detailOrder.service_name || '(ללא כותרת)'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DateBadge date={detailOrder.date} />
                    <OrderStatusBadge status={detailOrder.status} onChange={s => { handleStatusChange(detailOrder.id, s); setDetailOrder(o => o ? { ...o, status: s } : o) }} />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDetailOrder(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2.5 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                {detailOrder.customer_name}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                {parseDateOnly(detailOrder.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {detailOrder.service_name && (
                <p className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-slate-400 shrink-0" />
                  {detailOrder.service_name}
                </p>
              )}
              {detailOrder.price > 0 && (
                <p className="flex items-center gap-2 font-semibold text-slate-800">
                  <Banknote className="h-4 w-4 text-slate-400 shrink-0" />
                  ₪{detailOrder.price}
                </p>
              )}
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {editing ? 'עריכת הזמנה' : 'הזמנה חדשה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">לקוח *</Label>
              {customers.length > 0 && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 mb-2 w-fit text-sm">
                  <button type="button"
                    onClick={() => { setCustomerMode('select'); setForm(f => ({ ...f, customer_name: '' })) }}
                    className={`px-3 py-1.5 font-medium transition-colors ${customerMode === 'select' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >לקוח קיים</button>
                  <button type="button"
                    onClick={() => { setCustomerMode('new'); setForm(f => ({ ...f, customer_name: '' })) }}
                    className={`px-3 py-1.5 font-medium transition-colors ${customerMode === 'new' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >חדש</button>
                </div>
              )}
              {customerMode === 'select' && customers.length > 0 ? (
                <Select value={form.customer_name} onValueChange={v => setForm(f => ({ ...f, customer_name: v ?? '' }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="שם הלקוח" className="h-11" />
              )}
            </div>

            {/* Service — required */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-slate-400" /> שירות *
              </Label>
              {services.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  אין שירותים מוגדרים — הוסף שירותים בעמוד <strong>שירותים</strong> תחילה
                </p>
              ) : (
                <Select
                  value={services.find(s => s.name === form.service_name)?.id ?? ''}
                  onValueChange={handleServiceChange}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="בחר שירות" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.price ? ` · ₪${s.price}` : ''}{s.duration ? ` · ${s.duration}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Price — auto-filled, editable */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-slate-400" /> מחיר (₪)
              </Label>
              <Input type="number" min="0" dir="ltr" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="מתמלא אוטומטית מהשירות" className="h-11 text-left" />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" /> תאריך *
              </Label>
              <Input type="date" value={form.date} dir="ltr" className="h-11 text-left"
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Title (optional override) */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">כותרת <span className="font-normal text-slate-400">(אופציונלי)</span></Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="ברירת מחדל: שם השירות" className="h-11" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">תיאור</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="תיאור מפורט..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">הערות</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="הערות אופציונליות..." className="h-11" />
            </div>
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1 sm:flex-none h-11 font-semibold">
              {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'הוסף הזמנה'}
            </Button>
            <DialogClose>
              <Button variant="outline" type="button" className="flex-1 sm:flex-none h-11">ביטול</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>מחיקת הזמנה</DialogTitle></DialogHeader>
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
