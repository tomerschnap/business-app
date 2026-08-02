'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart2, TrendingUp, Calendar, Banknote, Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { localTodayStr, parseDateOnly, weekStartStr } from '@/lib/dates'

type Appointment = { date: string; price: number; status: string; customer_name: string }
type GroupSession = { date: string; price_per_participant: number; enrolled: number }
type Period = 'daily' | 'weekly' | 'monthly'

export default function ReportsClient({ appointments, groupSessions }: {
  appointments: Appointment[]
  groupSessions: GroupSession[]
}) {
  const [period, setPeriod] = useState<Period>('monthly')

  // Individual appointments income (non-cancelled, with price)
  const paidAppts = useMemo(() => appointments.filter(a => a.status !== 'בוטל' && a.price > 0), [appointments])

  // Group sessions income: price_per_participant × enrolled
  const groupIncomeSessions = useMemo(() =>
    groupSessions.map(g => ({ date: g.date, income: (g.price_per_participant || 0) * (g.enrolled || 0) }))
      .filter(g => g.income > 0),
    [groupSessions]
  )

  // Combined breakdown by period
  const grouped = useMemo(() => {
    const map = new Map<string, { apptIncome: number; groupIncome: number; apptCount: number; groupCount: number }>()

    function key(date: string) {
      if (period === 'daily') return date
      if (period === 'weekly') return weekStartStr(parseDateOnly(date))
      return date.slice(0, 7)
    }

    for (const a of paidAppts) {
      const k = key(a.date)
      const cur = map.get(k) ?? { apptIncome: 0, groupIncome: 0, apptCount: 0, groupCount: 0 }
      map.set(k, { ...cur, apptIncome: cur.apptIncome + a.price, apptCount: cur.apptCount + 1 })
    }
    for (const g of groupIncomeSessions) {
      const k = key(g.date)
      const cur = map.get(k) ?? { apptIncome: 0, groupIncome: 0, apptCount: 0, groupCount: 0 }
      map.set(k, { ...cur, groupIncome: cur.groupIncome + g.income, groupCount: cur.groupCount + 1 })
    }

    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, total: v.apptIncome + v.groupIncome, ...v }))
      .sort((a, b) => b.key.localeCompare(a.key))
      .slice(0, 30)
  }, [paidAppts, groupIncomeSessions, period])

  const today = localTodayStr()
  const thisMonth = today.slice(0, 7)
  const thisWeekStart = weekStartStr(new Date())

  function sumIncome(filter: (date: string) => boolean) {
    const a = paidAppts.filter(x => filter(x.date)).reduce((s, x) => s + x.price, 0)
    const g = groupIncomeSessions.filter(x => filter(x.date)).reduce((s, x) => s + x.income, 0)
    return a + g
  }

  const todayIncome   = sumIncome(d => d === today)
  const weekIncome    = sumIncome(d => d >= thisWeekStart)
  const monthIncome   = sumIncome(d => d.startsWith(thisMonth))
  const totalApptIncome  = paidAppts.reduce((s, a) => s + a.price, 0)
  const totalGroupIncome = groupIncomeSessions.reduce((s, g) => s + g.income, 0)
  const totalIncome = totalApptIncome + totalGroupIncome

  const totalAppts = appointments.length
  const cancelledCount = appointments.filter(a => a.status === 'בוטל').length
  const totalGroupSessions = groupSessions.length

  function formatKey(key: string) {
    if (period === 'daily') return parseDateOnly(key).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
    if (period === 'weekly') return `שבוע ${parseDateOnly(key).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}`
    const [y, m] = key.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
  }

  const maxIncome = Math.max(...grouped.map(g => g.total), 1)

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'daily', label: 'יומי' },
    { value: 'weekly', label: 'שבועי' },
    { value: 'monthly', label: 'חודשי' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">דוחות כספיים</h1>
        <p className="text-slate-500 text-sm mt-0.5">סיכום הכנסות מתורים ופגישות קבוצתיות</p>
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

      {/* Income breakdown by source */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-slate-100 rounded-xl p-2.5"><Calendar className="h-5 w-5 text-slate-600" /></div>
            <div>
              <p className="text-xs text-slate-500">תורים</p>
              <p className="text-xl font-bold text-slate-900">{totalAppts}</p>
              <p className="text-xs text-slate-400">₪{totalApptIncome.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 rounded-xl p-2.5"><Users2 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-slate-500">פגישות קבוצתיות</p>
              <p className="text-xl font-bold text-slate-900">{totalGroupSessions}</p>
              <p className="text-xs text-slate-400">₪{totalGroupIncome.toLocaleString()}</p>
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
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-green-100 rounded-xl p-2.5"><Banknote className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-slate-500">סה״כ הכנסות</p>
              <p className="text-xl font-bold text-green-600">₪{totalIncome.toLocaleString()}</p>
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
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                    {/* Appointments portion */}
                    {g.apptIncome > 0 && (
                      <div className="absolute top-0 right-0 h-full bg-primary/80 rounded-r-full transition-all duration-500"
                        style={{ width: `${Math.max((g.apptIncome / maxIncome) * 100, 2)}%` }} />
                    )}
                    {/* Group sessions portion stacked */}
                    {g.groupIncome > 0 && (
                      <div className="absolute top-0 right-0 h-full bg-primary/40 rounded-r-full transition-all duration-500"
                        style={{ width: `${Math.max((g.total / maxIncome) * 100, 4)}%` }} />
                    )}
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs text-white font-bold whitespace-nowrap drop-shadow">₪{g.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[60px]">
                    {g.apptCount > 0 && (
                      <Badge variant="secondary" className="font-normal text-xs py-0">{g.apptCount} תורים</Badge>
                    )}
                    {g.groupCount > 0 && (
                      <Badge className="font-normal text-xs py-0 bg-primary/20 text-primary hover:bg-primary/20">{g.groupCount} קבוצתי</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
