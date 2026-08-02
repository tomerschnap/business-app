'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, ShoppingBag, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseDateOnly } from '@/lib/dates'

type Appointment = { id: string; customer_name: string; date: string; time: string; duration: string; notes: string }
type Order = { id: string; customer_name: string; date: string; notes: string }
type View = 'month' | 'week' | 'day'

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const HE_DAYS_SHORT = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳']
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7)
const COLORS = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-pink-500','bg-emerald-500','bg-teal-500','bg-orange-500','bg-rose-500']

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function customerColor(name: string) { return COLORS[name.charCodeAt(0) % COLORS.length] }

export default function CalendarClient({ initialAppointments, initialOrders }: {
  initialAppointments: Appointment[]
  initialOrders: Order[]
  customers: { id: string; name: string }[]
}) {
  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = toDateStr(today)

  const [appointments] = useState<Appointment[]>(initialAppointments)
  const [orders] = useState<Order[]>(initialOrders)
  const [view, setView] = useState<View>('month')
  const [current, setCurrent] = useState(new Date(today))
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  function navigate(dir: 1 | -1) {
    const d = new Date(current)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrent(d)
  }

  function getWeekStart(d: Date) {
    const s = new Date(d); s.setDate(s.getDate() - s.getDay()); s.setHours(0,0,0,0); return s
  }

  function apptOn(dateStr: string) {
    return appointments.filter(a => a.date === dateStr).sort((a, b) => a.time.localeCompare(b.time))
  }
  function ordersOn(dateStr: string) {
    return orders.filter(o => o.date === dateStr)
  }

  function periodLabel() {
    if (view === 'month') return `${HE_MONTHS[current.getMonth()]} ${current.getFullYear()}`
    if (view === 'day') return current.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })
    const ws = getWeekStart(current)
    const we = new Date(ws); we.setDate(we.getDate() + 6)
    return `${ws.getDate()} – ${we.getDate()} ${HE_MONTHS[we.getMonth()]} ${we.getFullYear()}`
  }

  // ── Month View ────────────────────────────────────────────────────────────
  function MonthView() {
    const year = current.getFullYear(), month = current.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const cells: (Date | null)[] = Array(startPad).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
    while (cells.length % 7 !== 0) cells.push(null)

    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {HE_DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2.5">{d}</div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="border-b border-l border-slate-100 bg-slate-50/60" />
              const ds = toDateStr(date)
              const isToday = ds === todayStr
              const dimmed = date.getMonth() !== month
              const appts = apptOn(ds)
              const ords = ordersOn(ds)
              const total = appts.length + ords.length
              return (
                <div key={i} className={cn('border-b border-l border-slate-100 p-1 cursor-pointer hover:bg-slate-50 transition-colors', dimmed && 'opacity-40')}
                  onClick={() => { setCurrent(new Date(date)); setView('day') }}>
                  <span className={cn('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                    isToday ? 'bg-primary text-white' : 'text-slate-600'
                  )}>{date.getDate()}</span>
                  <div className="space-y-0.5">
                    {ords.slice(0, 1).map(o => (
                      <div key={o.id}
                        onClick={e => { e.stopPropagation(); setDetailOrder(o) }}
                        className="text-white text-xs rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80 bg-amber-500 flex items-center gap-1"
                      >
                        <ShoppingBag className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{o.customer_name}</span>
                      </div>
                    ))}
                    {appts.slice(0, ords.length > 0 ? 1 : 2).map(a => (
                      <div key={a.id}
                        onClick={e => { e.stopPropagation(); setDetailAppt(a) }}
                        className={cn('text-white text-xs rounded px-1.5 py-0.5 truncate cursor-pointer hover:opacity-80', customerColor(a.customer_name))}
                      >
                        <span className="hidden sm:inline">{a.time.slice(0,5)} </span>{a.customer_name}
                      </div>
                    ))}
                    {total > 2 && <p className="text-xs text-slate-400 px-1">+{total - 2} נוספים</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Week View ─────────────────────────────────────────────────────────────
  function WeekView() {
    const ws = getWeekStart(current)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d })
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* All-day orders row */}
        <div className="grid grid-cols-8 border-b border-slate-200 bg-amber-50/50 shrink-0">
          <div className="text-xs text-slate-400 text-center py-1 border-l border-slate-100 flex items-center justify-center">הזמנות</div>
          {days.map((d, i) => {
            const ords = ordersOn(toDateStr(d))
            return (
              <div key={i} className="border-l border-slate-100 p-0.5 min-h-[28px]">
                {ords.map(o => (
                  <div key={o.id}
                    onClick={() => setDetailOrder(o)}
                    className="text-white text-xs rounded px-1 py-0.5 mb-0.5 cursor-pointer hover:opacity-80 truncate bg-amber-500 flex items-center gap-1"
                  >
                    <ShoppingBag className="h-2.5 w-2.5 shrink-0" />{o.customer_name}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="border-l border-slate-100 py-2" />
          {days.map((d, i) => {
            const isToday = toDateStr(d) === todayStr
            return (
              <div key={i} className="text-center py-2 border-l border-slate-100">
                <p className="text-xs text-slate-500">{HE_DAYS_SHORT[d.getDay()]}</p>
                <p className={cn('text-sm font-bold w-7 h-7 flex items-center justify-center mx-auto rounded-full mt-0.5',
                  isToday ? 'bg-primary text-white' : 'text-slate-700'
                )}>{d.getDate()}</p>
              </div>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto">
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-slate-100 min-h-[56px]">
              <div className="text-xs text-slate-400 pr-2 pt-1.5 border-l border-slate-100 text-right" dir="ltr">{pad(hour)}:00</div>
              {days.map((d, di) => {
                const ds = toDateStr(d)
                const appts = apptOn(ds).filter(a => parseInt(a.time) === hour)
                return (
                  <div key={di} className="border-l border-slate-100 p-0.5">
                    {appts.map(a => (
                      <div key={a.id}
                        onClick={() => setDetailAppt(a)}
                        className={cn('text-white text-xs rounded px-1.5 py-1 mb-0.5 cursor-pointer hover:opacity-80 truncate', customerColor(a.customer_name))}
                      >
                        <span className="font-semibold">{a.time.slice(0,5)}</span> {a.customer_name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Day View ──────────────────────────────────────────────────────────────
  function DayView() {
    const ds = toDateStr(current)
    const ords = ordersOn(ds)
    return (
      <div className="flex-1 overflow-y-auto">
        {ords.length > 0 && (
          <div className="border-b border-amber-100 bg-amber-50 p-2 space-y-1">
            <p className="text-xs font-semibold text-amber-700 px-1">הזמנות יום</p>
            {ords.map(o => (
              <div key={o.id}
                onClick={() => setDetailOrder(o)}
                className="text-white text-sm rounded-xl px-3 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2 bg-amber-500"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="font-medium">{o.customer_name}</span>
                {o.notes && <span className="opacity-80 text-xs truncate hidden sm:block">· {o.notes}</span>}
              </div>
            ))}
          </div>
        )}
        {HOURS.map(hour => {
          const appts = apptOn(ds).filter(a => parseInt(a.time) === hour)
          return (
            <div key={hour} className="flex border-b border-slate-100 min-h-[60px]">
              <div className="w-16 shrink-0 text-xs text-slate-400 pt-2 text-center border-l border-slate-100" dir="ltr">
                {pad(hour)}:00
              </div>
              <div className="flex-1 p-1.5 space-y-1">
                {appts.map(a => (
                  <div key={a.id}
                    onClick={() => setDetailAppt(a)}
                    className={cn('text-white text-sm rounded-xl px-3 py-2 cursor-pointer hover:opacity-80 flex items-center gap-2', customerColor(a.customer_name))}
                  >
                    <span className="font-bold shrink-0 text-xs" dir="ltr">{a.time.slice(0,5)}</span>
                    <span className="font-medium">{a.customer_name}</span>
                    <span className="opacity-70 text-xs shrink-0">{a.duration || '30 דקות'}</span>
                    {a.notes && <span className="opacity-80 text-xs truncate hidden sm:block">· {a.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date(today))}>היום</Button>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base md:text-lg font-bold text-slate-800">{periodLabel()}</h2>
        </div>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
          {(['month','week','day'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 font-medium transition-colors',
                view === v ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'
              )}>
              {v === 'month' ? 'חודש' : v === 'week' ? 'שבוע' : 'יום'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-0">
        {view === 'month' && MonthView()}
        {view === 'week' && WeekView()}
        {view === 'day' && DayView()}
      </div>

      {/* Appointment detail popup */}
      {detailAppt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetailAppt(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full shrink-0', customerColor(detailAppt.customer_name))} />
                <span className="font-bold text-lg">{detailAppt.customer_name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDetailAppt(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-slate-600 space-y-1.5 pr-5">
              <p>📅 {parseDateOnly(detailAppt.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p dir="ltr" className="text-right">🕐 {detailAppt.time} · {detailAppt.duration || '30 דקות'}</p>
              {detailAppt.notes && <p>📝 {detailAppt.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Order detail popup */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setDetailOrder(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0 bg-amber-500" />
                <span className="font-bold text-lg">{detailOrder.customer_name}</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">הזמנה</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDetailOrder(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-slate-600 space-y-1.5 pr-5">
              <p>📅 {parseDateOnly(detailOrder.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {detailOrder.notes && <p>📝 {detailOrder.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
