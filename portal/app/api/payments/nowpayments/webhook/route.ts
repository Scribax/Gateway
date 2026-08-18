import { errorResponse } from '@/lib/new-api'
import { processNowPaymentsWebhook } from '@/lib/nowpayments'

export async function GET() {
  return Response.json({ success: true })
}

export async function POST(request: Request) {
  try {
    const result = await processNowPaymentsWebhook(request)
    return Response.json({ success: true, data: result })
  } catch (error) {
    return errorResponse(error)
  }
}
