'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex justify-center mb-2">
            <div className="bg-primary rounded-2xl p-3 shadow-md">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">ברוך הבא</CardTitle>
          <CardDescription>התחבר לניהול העסק שלך</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required className="text-left h-11" dir="ltr" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required className="text-left h-11" dir="ltr" autoComplete="current-password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />מתחבר...</> : 'כניסה'}
            </Button>
            <p className="text-sm text-muted-foreground">
              אין לך חשבון?{' '}
              <Link href="/signup" className="text-primary font-semibold hover:underline">הרשמה</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
