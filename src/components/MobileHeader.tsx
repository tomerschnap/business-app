'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Menu, X, Briefcase, LayoutDashboard, Users, CalendarDays, CalendarRange, LogOut, ShoppingBag, Store, Users2, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'סקירה כללית', icon: LayoutDashboard },
  { href: '/dashboard/customers', label: 'לקוחות', icon: Users },
  { href: '/dashboard/appointments', label: 'תורים', icon: CalendarDays },
  { href: '/dashboard/group', label: 'תורים קבוצתיים', icon: Users2 },
  { href: '/dashboard/orders', label: 'הזמנות', icon: ShoppingBag },
  { href: '/dashboard/calendar', label: 'לוח שנה', icon: CalendarRange },
  { href: '/dashboard/activity', label: 'יומן פעולות', icon: ClipboardList },
  { href: '/dashboard/business', label: 'פרופיל עסק', icon: Store },
]

export default function MobileHeader({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const currentPage = navItems.find(n => n.href === pathname)?.label ?? 'BizManager'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded-lg p-1">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">{currentPage}</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in drawer */}
      <aside
        className={cn(
          'md:hidden fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-xl p-1.5">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg">BizManager</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-sm">{userEmail[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{userEmail}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
