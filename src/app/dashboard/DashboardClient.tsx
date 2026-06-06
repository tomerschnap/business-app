'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, CalendarCheck, ShoppingBag, Banknote, Plus, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Appointment = {
  id: string; customer_name: string; date: string; time: string
  duration: string; status: string; price: number; phone: string; notes: string
}
type Order = {
  id: string; customer_name: string; date: string; title: string
  service_name: string; price: number; status: string
}

const APPT_STATUS_STYLE: Record<string, string> = {
  'ממתין':   'bg-amber-100 text-amber-700',
  'אושר':    'bg-blue-100 text-blue-700',
  'בוטל':    'bg-red-100 text-red-600',
  'הגיע':    'bg-green-100 text-green-700',
  'לא הגיע': 'bg-slate-100 text-slate-500',
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  'הזמנה חדשה': 'bg-blue-100 text-blue-700',
  'בהכנה':      'bg-amber-100 text-amber-700',
  'מוכן':       'bg-green-100 text-green-700',
}

export default function DashboardClient({
  customerCount, todayApptCount, todayRevenue,
  todayAppts, todayOrders, dateLabel, todayLabel,
}: {
  customerCount: number
  todayApptCount: number
  todayRevenue: number
  todayAppts: Appointment[]
  todayOrders: Order[]
  dateLabel: string
  todayLabel: string
}) {
  const router = useRouter()
  const [apptModal, setApptModal] = useState(false)
  const [ordersModal, setOrdersModal] = useState(false)

  function fmtPrice(n: number) {
    return '₪' + n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
  }

  const stats = [
    {
      title: 'סה״כ לקוחות',
      value: customerCount,
      icon: Users,
      description: 'לקוחות רשומים',
      color: 'text-blue-600', bg: 'bg-blue-50',
      onClick: () => router.push('/dashboard/customers'),
    },
    {
      title: 'תורים להיום',
      value: todayApptCount,
      icon: CalendarCheck,
      description: todayLabel,
      color: 'text-green-600', bg: 'bg-green-50',
      onClick: () => setApptModal(true),
    },
    {
      title: 'הזמנות להיום',
      value: todayOrders.length,
      icon: ShoppingBag,
      description: todayLabel,
      color: 'text-amber-600', bg: 'bg-amber-50',
      onClick: () => setOrdersModal(true),
    },
    {
      title: 'הכנסות היום',
      value: fmtPrice(todayRevenue),
      icon: Banknote,
      description: 'תורים שלא בוטלו',
      color: 'text-emerald-600', bg: 'bg-emerald-50',
      onClick: () => router.push('/dashboard/reports'),
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">סקירה כללית</h1>
        <p className="text-slate-500 text-sm mt-1">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon, description, color, bg, onClick }) => (
          <Card
            key={title}
            onClick={onClick}
            className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
              <div className={cn('p-2 rounded-xl', bg)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1 leading-tight">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Today's appointments modal ──────────────────────────────────── */}
      <Dialog open={apptModal} onOpenChange={setApptModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <CalendarCheck className="h-5 w-5 text-green-600" />
                תורים להיום · {todayLabel}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {todayAppts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">אין תורים להיום</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todayAppts.map(a => (
                  <li key={a.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-slate-800 w-12 shrink-0 text-left" dir="ltr">{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.customer_name}</p>
                      {a.duration && <p className="text-xs text-slate-400">{a.duration}{a.price ? ` · ₪${a.price}` : ''}</p>}
                    </div>
                    <Badge className={cn('text-xs font-medium border-0 shrink-0', APPT_STATUS_STYLE[a.status] ?? 'bg-slate-100 text-slate-500')}>
                      {a.status || 'ממתין'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
            <Button onClick={() => { setApptModal(false); router.push('/dashboard/appointments') }} className="gap-2">
              <Plus className="h-4 w-4" /> קבע תור חדש
            </Button>
            <Button variant="outline" onClick={() => { setApptModal(false); router.push('/dashboard/appointments') }} className="gap-1.5">
              כל התורים <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Today's orders modal ────────────────────────────────────────── */}
      <Dialog open={ordersModal} onOpenChange={setOrdersModal}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              הזמנות להיום · {todayLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            {todayOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">אין הזמנות להיום</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todayOrders.map(o => (
                  <li key={o.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{o.title || o.service_name || '(ללא כותרת)'}</p>
                      <p className="text-xs text-slate-400 truncate">{o.customer_name}{o.price ? ` · ₪${o.price}` : ''}</p>
                    </div>
                    <Badge className={cn('text-xs font-medium border-0 shrink-0', ORDER_STATUS_STYLE[o.status] ?? 'bg-slate-100 text-slate-500')}>
                      {o.status || 'הזמנה חדשה'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex gap-3 flex-row-reverse">
            <Button onClick={() => { setOrdersModal(false); router.push('/dashboard/orders') }} className="gap-2">
              <Plus className="h-4 w-4" /> הוסף הזמנה
            </Button>
            <Button variant="outline" onClick={() => { setOrdersModal(false); router.push('/dashboard/orders') }} className="gap-1.5">
              כל ההזמנות <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
