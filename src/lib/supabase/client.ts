import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://mktmmbiwxpnswzpyqsxs.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdG1tYml3eHBuc3d6cHlxc3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjgxMzIsImV4cCI6MjA5NTcwNDEzMn0.WW5RaJJkIuuWfF1aHQEOIzMU7xJRAE9c3HxjN0Sr4B4'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
