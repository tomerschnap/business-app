import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CalendarCheck } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  const [{ count: customerCount }, { count: todayCount }] =
    await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
        .eq('date', today),
    ])

  const stats = [
    {
      title: 'סה״כ לקוחות',
      value: customerCount ?? 0,
      icon: Users,
      description: 'לקוחות רשומים',
      color: 'text-blue-600', bg: 'bg-blue-50',
    },
    {
      title: 'תורים היום',
      value: todayCount ?? 0,
      icon: CalendarCheck,
      description: new Date().toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' }),
      color: 'text-green-600', bg: 'bg-green-50',
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">סקירה כללית</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        {stats.map(({ title, value, icon: Icon, description, color, bg }) => (
          <Card key={title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
              <div className={`${bg} p-2 rounded-xl`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-1 leading-tight">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
