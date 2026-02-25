import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing answer ID' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.rpc('increment_view_count', { answer_id: id })

  if (error) {
    console.error('[view] increment failed:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
