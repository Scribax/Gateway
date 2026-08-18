import { errorResponse } from '@/lib/new-api'
import { processMercadoPagoWebhook } from '@/lib/mercadopago'

export async function GET() {
  return Response.json({ success: true })
}

export async function POST(request: Request) {
  try {
    const result = await processMercadoPagoWebhook(request)
    return Response.json({ success: true, data: result })
  } catch (error) {
    return errorResponse(error)
  }
}
