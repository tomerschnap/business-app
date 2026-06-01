import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Mail } from 'lucide-react'

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 text-center">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex justify-center mb-2">
            <div className="bg-primary rounded-2xl p-3 shadow-md">
              <Briefcase className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="flex justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">בדוק את האימייל שלך</CardTitle>
          <CardDescription className="text-base">
            שלחנו לך קישור לאישור החשבון.<br />
            לחץ על הקישור כדי להפעיל את החשבון ולהיכנס.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6">
          <p className="text-sm text-slate-500">לא קיבלת אימייל? בדוק את תיקיית הספאם.</p>
          <Link href="/login">
            <Button variant="outline" className="w-full">חזור להתחברות</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
