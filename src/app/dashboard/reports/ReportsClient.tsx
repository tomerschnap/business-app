'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart2, TrendingUp, Calendar, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'

type Appointment = { date: string; price: number; status: string; customer_name: string }
type Period = 'daily' | 'weekly' | 'monthly'

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function isoWeek(d: Date) {
  const sw = startOfWeek(d)
  return sw.toISOString().split('T')[0]
}

export default function ReportsClient({ appointments }: { appointments: Appointment[] }) {
  const [period, setPeriod] = useState<Period>('monthly')

  const paid = useMemo(() => appointments.filter(a => a.status !== 'בוטל' && a.price > 0), [appointments])

  const grouped = useMemo(() => {
    const map = new Map<string, { income: number; count: number }>()
    for (const a of paid) {
      let key = ''
      const d = new Date(a.date + 'T00:00:00')
      if (period === 'daily') key = a.date
      else if (period === 'weekly') key = isoWeek(d)
      else key = a.date.slice(0, 7)

      const cur = map.get(key) ?? { income: 0, count: 0 }
      map.set(key, { income: cur.income + (a.price || 0), count: cur.count + 1 })
    }
    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 30)
  }, [paid, period])

  const totalIncome = paid.reduce((s, a) => s + (a.price || 0), 0)
  const totalAppts = appointments.length
  const cancelledCount = appointments.filter(a => a.status === 'בוטל').length

  // current month / week / today income
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)
  const thisWeekStart = isoWeek(new Date())

  const todayIncome = paid.filter(a => a.date === today).reduce((s, a) => s + a.price, 0)
  const weekIncome = paid.filter(a => a.date >= thisWeekStart).reduce((s, a) => s + a.price, 0)
  const monthIncome = paid.filter(a => a.date.startsWith(thisMonth)).reduce((s, a) => s + a.price, 0)

  function formatKey(key: string) {
    if (period === 'daily') return new Date(key + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
    if (period === 'weekly') return `שבוע ${new Date(key + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}`
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  }

  const maxIncome = Math.max(...grouped.map(g => g.income), 1)

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'daily', label: 'יומי' },
    { value: 'weekly', label: 'שבועי' },
    { value: 'monthly', label: 'חודשי' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">דוחות כספיים</h1>
        <p className="text-slate-500 text-sm mt-0.5">סיכום הכנסות מתורים</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">היום</p>
            <p className="text-2xl font-bold text-slate-900">₪{todayIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">השבוע</p>
            <p className="text-2xl font-bold text-slate-900">₪{weekIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">החודש</p>
            <p className="text-2xl font-bold text-blue-600">₪{monthIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">סה״כ</p>
            <p className="text-2xl font-bold text-green-600">₪{totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-slate-100 rounded-xl p-2.5"><Calendar className="h-5 w-5 text-slate-600" /></div>
            <div>
              <p className="text-xs text-slate-500">סה״כ תורים</p>
              <p className="text-xl font-bold text-slate-900">{totalAppts}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-red-100 rounded-xl p-2.5"><TrendingUp className="h-5 w-5 text-red-500" /></div>
            <div>
              <p className="text-xs text-slate-500">בוטלו</p>
              <p className="text-xl font-bold text-slate-900">{cancelledCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-slate-400" /> פירוט הכנסות
            </CardTitle>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={cn('px-3 py-1.5 font-medium transition-colors', period === p.value ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50')}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Banknote className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">אין נתוני הכנסות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map(g => (
                <div key={g.key} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-slate-600 shrink-0 text-right">{formatKey(g.key)}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max((g.income / maxIncome) * 100, 4)}%` }}
                    >
                      <span className="text-xs text-white font-bold whitespace-nowrap">₪{g.income.toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-normal text-xs shrink-0 w-14 text-center justify-center">
                    {g.count} תורים
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
