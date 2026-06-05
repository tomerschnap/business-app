'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, CalendarDays, CalendarRange, LogOut, Briefcase, ShoppingBag, Store, Users2, ClipboardList, Scissors, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import GlobalSearch from '@/components/GlobalSearch'

const navItems = [
  { href: '/dashboard', label: 'סקירה כללית', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: 'לקוחות', icon: Users },
  { href: '/dashboard/appointments', label: 'תורים', icon: CalendarDays },
  { href: '/dashboard/group', label: 'תורים קבוצתיים', icon: Users2 },
  { href: '/dashboard/orders', label: 'הזמנות', icon: ShoppingBag },
  { href: '/dashboard/services', label: 'שירותים', icon: Scissors },
  { href: '/dashboard/reports', label: 'דוחות', icon: BarChart2 },
  { href: '/dashboard/calendar', label: 'לוח שנה', icon: CalendarRange },
  { href: '/dashboard/activity', label: 'יומן פעולות', icon: ClipboardList },
  { href: '/dashboard/business', label: 'פרופיל עסק', icon: Store },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-l border-slate-200 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="bg-primary rounded-xl p-2">
          <Briefcase className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-800">BizManager</span>
      </div>

      <Separator />

      {/* Global Search */}
      <div className="px-3 pt-3 pb-1">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="px-4 py-4 flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
            {userEmail[0]?.toUpperCase() ?? 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate text-slate-700">{userEmail}</p>
          <p className="text-xs text-slate-400">מחובר</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="יציאה">
          <LogOut className="h-4 w-4 text-slate-400" />
        </Button>
      </div>
    </aside>
  )
}
