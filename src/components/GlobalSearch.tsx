'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Users, CalendarDays, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Result = {
  type: 'customer' | 'appointment' | 'order'
  label: string
  sub: string
  href: string
}

export default function GlobalSearch({ mobile }: { mobile?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(() => search(query.trim()), 250)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function search(q: string) {
    setLoading(true)
    const [{ data: customers }, { data: appointments }, { data: orders }] = await Promise.all([
      supabase.from('customers').select('id, name, phone, email').ilike('name', `%${q}%`).limit(5),
      supabase.from('appointments').select('id, customer_name, date, time').ilike('customer_name', `%${q}%`).limit(5),
      supabase.from('orders').select('id, customer_name, title, date').or(`customer_name.ilike.%${q}%,title.ilike.%${q}%`).limit(5),
    ])
    const res: Result[] = [
      ...(customers ?? []).map(c => ({ type: 'customer' as const, label: c.name, sub: c.phone || c.email || '', href: '/dashboard/customers' })),
      ...(appointments ?? []).map(a => ({ type: 'appointment' as const, label: a.customer_name, sub: `${a.date} ${a.time}`, href: '/dashboard/appointments' })),
      ...(orders ?? []).map(o => ({ type: 'order' as const, label: o.title || o.customer_name, sub: o.date || '', href: '/dashboard/orders' })),
    ]
    setResults(res)
    setLoading(false)
  }

  const ICON = { customer: Users, appointment: CalendarDays, order: ShoppingBag }
  const LABEL = { customer: 'לקוח', appointment: 'תור', order: 'הזמנה' }

  function go(href: string) { router.push(href); setOpen(false); setQuery('') }

  if (mobile) {
    return (
      <>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Search className="h-5 w-5 text-slate-500" />
        </Button>
        {open && <SearchModal />}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 text-sm hover:bg-slate-100 transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-right">חיפוש...</span>
        <kbd className="hidden sm:inline text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
      </button>
      {open && <SearchModal />}
    </>
  )

  function SearchModal() {
    return (
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
            <Search className="h-5 w-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="חפש לקוחות, תורים, הזמנות..."
              className="flex-1 bg-transparent outline-none text-slate-800 text-base placeholder:text-slate-400"
            />
            {query && <button onClick={() => setQuery('')}><X className="h-4 w-4 text-slate-400" /></button>}
            <button onClick={() => setOpen(false)} className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-1">Esc</button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && <p className="text-center py-6 text-slate-400 text-sm">מחפש...</p>}
            {!loading && query && results.length === 0 && (
              <p className="text-center py-6 text-slate-400 text-sm">לא נמצאו תוצאות</p>
            )}
            {!loading && !query && (
              <p className="text-center py-6 text-slate-400 text-sm">הקלד לחיפוש...</p>
            )}
            {results.length > 0 && (
              <ul className="py-2">
                {results.map((r, i) => {
                  const Icon = ICON[r.type]
                  return (
                    <li key={i}>
                      <button
                        onClick={() => go(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-right"
                      >
                        <div className={cn('rounded-lg p-1.5 shrink-0',
                          r.type === 'customer' ? 'bg-blue-100 text-blue-600' :
                          r.type === 'appointment' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                          <p className="text-xs text-slate-400 truncate">{LABEL[r.type]}{r.sub ? ` · ${r.sub}` : ''}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }
}
