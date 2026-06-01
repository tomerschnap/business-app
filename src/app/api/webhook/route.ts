import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhook
 *
 * Receives events from n8n (or any other service).
 * Optionally protect with a shared secret via the
 * WEBHOOK_SECRET environment variable.
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: verify a shared secret header
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const incoming = request.headers.get('x-webhook-secret')
      if (incoming !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()

    console.log('[Webhook] Received event:', JSON.stringify(body, null, 2))

    // -------------------------------------------
    // Handle different event types from n8n here.
    // Example:
    //
    // if (body.event === 'new_appointment') { ... }
    // if (body.event === 'customer_created') { ... }
    // -------------------------------------------

    return NextResponse.json({ received: true, timestamp: new Date().toISOString() }, { status: 200 })
  } catch (err) {
    console.error('[Webhook] Error:', err)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// Optional: allow GET to verify the endpoint is alive
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint is active' })
}
