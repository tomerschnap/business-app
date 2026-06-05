'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CalendarDays, User, ShoppingBag, Users2, Tag, Trash2, RefreshCw, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

type LogEntry = { id: string; action: string; details: string; created_at: string }

function getIcon(action: string) {
  if (action.includes('לקוח')) return { Icon: User, color: 'bg-blue-100 text-blue-600' }
  if (action.includes('הזמנה')) return { Icon: ShoppingBag, color: 'bg-amber-100 text-amber-600' }
  if (action.includes('פגישה')) return { Icon: Users2, color: 'bg-purple-100 text-purple-600' }
  if (action.includes('נמחק') || action.includes('מחיקה')) return { Icon: Trash2, color: 'bg-red-100 text-red-500' }
  if (action.includes('סטטוס') || action.includes('עדכון')) return { Icon: Tag, color: 'bg-slate-100 text-slate-600' }
  if (action.includes('תור')) return { Icon: CalendarDays, color: 'bg-green-100 text-green-600' }
  return { Icon: ClipboardList, color: 'bg-slate-100 text-slate-500' }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'עכשיו'
  if (mins < 60) return `לפני ${mins} דקות`
  if (hours < 24) return `לפני ${hours} שעות`
  if (days < 7) return `לפני ${days} ימים`
  return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(logs: LogEntry[]) {
  const groups: { label: string; items: LogEntry[] }[] = []
  for (const log of logs) {
    const dateStr = new Date(log.created_at).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    let label: string
    if (dateStr === today) label = 'היום'
    else if (dateStr === yesterday) label = 'אתמול'
    else label = new Date(log.created_at).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })

    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(log)
    else groups.push({ label, items: [log] })
  }
  return groups
}

export default function ActivityClient({ logs }: { logs: LogEntry[] }) {
  const router = useRouter()
  const groups = groupByDate(logs)

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">יומן פעולות</h1>
          <p className="text-slate-500 text-sm mt-0.5">{logs.length} פעולות מתועדות</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => router.refresh()}>
          <RefreshCw className="h-3.5 w-3.5" /> רענן
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
          <p className="font-medium">אין פעולות מתועדות עדיין</p>
          <p className="text-sm mt-1">פעולות יתועדו אוטומטית כאשר יתבצעו שינויים</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{label}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-2">
                {items.map(log => {
                  const { Icon, color } = getIcon(log.action)
                  return (
                    <div key={log.id} className="flex items-start gap-3 bg-white rounded-xl p-3.5 shadow-sm">
                      <div className={cn('rounded-xl p-2 shrink-0 mt-0.5', color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{log.action}</p>
                        {log.details && <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{timeAgo(log.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
